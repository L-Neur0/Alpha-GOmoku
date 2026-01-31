import math
import numpy as np
import torch

class MCTS:
    def __init__(self, game, nnet, args):
        self.game = game
        self.nnet = nnet
        self.args = args
        
        self.Qsa = {}  # stores Q values for s,a (as defined in the paper)
        self.Nsa = {}  # stores #times edge s,a was visited
        self.Ys = {}   # stores policy (probabilities) returned by neural net
        self.Es = {}   # stores game.getGameEnded ended for board s
        self.Vs = {}   # stores valid moves for board s

    def getActionProb(self, canonicalBoard, temp=1):
        for i in range(self.args.numMCTSSims):
            # Debug logging to see if it hangs
            if i % 200 == 0:
                 pass 
                 # print(f"MCTS Sim {i}/{self.args.numMCTSSims}") 
                 # Commented out to avoid spam, but useful for debugging if needed.
                 # User reports hanging, so let's enable it briefly or just check for hangs.
            
            self.search(canonicalBoard)

        s = self.game.string_representation(canonicalBoard)
        counts = [self.Nsa[(s, a)] if (s, a) in self.Nsa else 0 for a in range(self.game.get_action_size())]

        if temp == 0:
            bestAs = np.array(np.argwhere(counts == np.max(counts))).flatten()
            bestA = np.random.choice(bestAs)
            probs = [0] * len(counts)
            probs[bestA] = 1
            return probs

        counts = [x ** (1. / temp) for x in counts]
        counts_sum = float(sum(counts))
        if counts_sum == 0:
            # Safety fallback: if no simulations were successful, pick a random valid move
            valid_moves = self.game.get_valid_moves(canonicalBoard)
            probs = valid_moves / np.sum(valid_moves)
            return probs
            
        probs = [x / counts_sum for x in counts]
        return probs

    def search(self, canonicalBoard):
        s = self.game.string_representation(canonicalBoard)

        if s not in self.Es:
            self.Es[s] = self.game.get_game_ended(canonicalBoard, 1)
        if self.Es[s] != 0:
            # Terminal node
            return -self.Es[s]

        if s not in self.Ys:
            # Leaf node
            self.Vs[s] = self.game.get_valid_moves(canonicalBoard)
            
            # --- TACTICAL CHECK: Look for immediate wins ---
            # If we can win immediately, force the policy to take that move 
            # and return a winning value without consulting the NN.
            winning_move = -1
            for a in range(self.game.get_action_size()):
                if self.Vs[s][a]:
                    next_s, _ = self.game.get_next_state(canonicalBoard, 1, a)
                    if self.game.check_win(next_s, 1):
                        winning_move = a
                        break
            
            if winning_move != -1:
                # Found a win!
                # 1. Force Prior Probability (Ys) to 100% for this move
                self.Ys[s] = np.zeros(self.game.get_action_size())
                self.Ys[s][winning_move] = 1.0
                
                # 2. Return -1 (Value for parent is negative because we won)
                # We skip the NN entirely.
                return -1

            # Predict with Neural Net
            board_tensor = torch.FloatTensor(canonicalBoard.astype(np.float64))
            
            # Use device from args
            device = getattr(self.args, 'device', 'cpu')
            if device != 'cpu':
                board_tensor = board_tensor.contiguous().to(device)
            
            # Put in batch form
            self.nnet.eval()
            with torch.no_grad():
                pi, v = self.nnet(board_tensor)

            self.Ys[s] = torch.exp(pi).data.cpu().numpy()[0]
            
            # Mask invalid moves
            self.Ys[s] = self.Ys[s] * self.Vs[s]
            sum_Ys_s = np.sum(self.Ys[s])
            if sum_Ys_s > 0:
                self.Ys[s] /= sum_Ys_s
            else:
                # All valid moves were masked, uniform distribution
                self.Ys[s] = self.Ys[s] + self.Vs[s]
                self.Ys[s] /= np.sum(self.Ys[s])

            return -v.data.cpu().numpy()[0]

        # Upper Confidence Bound (UCB)
        vals = []
        best_uct = -float('inf')
        best_act = -1
        
        # CPU constant
        cpuct = self.args.cpuct

        for a in range(self.game.get_action_size()):
            if self.Vs[s][a]:
                if (s, a) in self.Qsa:
                    u = self.Qsa[(s, a)] + cpuct * self.Ys[s][a] * math.sqrt(sum(self.Nsa.values())) / (1 + self.Nsa[(s, a)])
                else:
                    u = cpuct * self.Ys[s][a] * math.sqrt(sum(self.Nsa.values()) + 1e-8)

                if u > best_uct:
                    best_uct = u
                    best_act = a

        a = best_act
        next_s, next_player = self.game.get_next_state(canonicalBoard, 1, a)
        next_s = self.game.get_canonical_form(next_s, next_player)

        v = self.search(next_s)

        if (s, a) in self.Qsa:
            self.Qsa[(s, a)] = (self.Nsa[(s, a)] * self.Qsa[(s, a)] + v) / (self.Nsa[(s, a)] + 1)
            self.Nsa[(s, a)] += 1
        else:
            self.Qsa[(s, a)] = v
            self.Nsa[(s, a)] = 1
        return -v
