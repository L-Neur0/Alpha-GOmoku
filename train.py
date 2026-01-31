from game import GomokuGame
from model import GomokuNet
from mcts import MCTS
import numpy as np
import torch
import os
import random
from collections import deque
import matplotlib.pyplot as plt
import json
import time
from torch.utils.tensorboard import SummaryWriter

class Trainer:
    def __init__(self, game, nnet, args):
        self.game = game
        self.nnet = nnet
        self.args = args
        self.mcts = MCTS(game, nnet, args)
        
        # TensorBoard Setup
        self.writer = SummaryWriter('runs/gomoku_experiment')
        
        # Logging Setup
        self.log_file = os.path.join(args.checkpoint, 'training_log.json')
        self.log_data = {'history': []}
        
        # Load existing log if available
        if os.path.exists(self.log_file):
            try:
                with open(self.log_file, 'r') as f:
                    self.log_data = json.load(f)
                print(f"Loaded training log with {len(self.log_data['history'])} entries.")
            except Exception as e:
                print(f"Error loading log file: {e}. Starting fresh log.")
        
        # Restore metrics history for plotting
        if self.log_data['history']:
            self.pi_loss_history = [x['pi_loss'] for x in self.log_data['history']]
            self.v_loss_history = [x['v_loss'] for x in self.log_data['history']]
        else:
            self.pi_loss_history = []
            self.v_loss_history = []

    def execute_episode(self):
        train_examples = []
        board = self.game.get_init_board()
        self.cur_player = 1
        episode_step = 0

        # --- RANDOM START (Data Augmentation) ---
        # To prevent the AI from overfitting to one opening and to help it handle
        # disadvantages (like playing second against a center start), we randomize 
        # the board state slightly at the beginning of 50% of games.
        if random.random() < 0.5:
            num_random_moves = random.randint(1, 2)
            for _ in range(num_random_moves):
                valid = self.game.get_valid_moves(board)
                # Get indices of valid moves
                valid_indices = np.where(valid == 1)[0]
                if len(valid_indices) > 0:
                    a = np.random.choice(valid_indices)
                    board, self.cur_player = self.game.get_next_state(board, self.cur_player, a)
                    episode_step += 1
        # ---------------------------------------

        while True:
            episode_step += 1
            canonical_board = self.game.get_canonical_form(board, self.cur_player)
            temp = int(episode_step < self.args.tempThreshold)

            pi = self.mcts.getActionProb(canonical_board, temp=temp)
            sym = self.game.get_canonical_form(board, self.cur_player) 
            
            # Symmetries (optional but good for Board games)
            # For brevity, skipping advanced symmetries, just storing raw
            train_examples.append([sym, self.cur_player, pi, None])

            action = np.random.choice(len(pi), p=pi)
            board, self.cur_player = self.game.get_next_state(board, self.cur_player, action)

            r = self.game.get_game_ended(board, self.cur_player)

            if r != 0:
                return [(x[0], x[2], r * ((-1) ** (x[1] != self.cur_player))) for x in train_examples]

    def train(self):
        # Determine start iteration from logs
        start_iter = 0
        if self.log_data['history']:
            start_iter = self.log_data['history'][-1]['iteration']
            print(f"Resuming from Iteration {start_iter + 1}")

        for i in range(start_iter, start_iter + self.args.numIters):
            self.current_iter = i + 1
            print(f'Starting Iteration {self.current_iter} ...')
            iteration_train_examples = deque([], maxlen=self.args.maxlenOfQueue)

            for eps in range(self.args.numEps):
                print(f"Self-play Episode {eps+1}/{self.args.numEps}")
                self.mcts = MCTS(self.game, self.nnet, self.args) # Reset search tree
                iteration_train_examples += self.execute_episode()

            # Shuffle examples
            train_data = list(iteration_train_examples)
            random.shuffle(train_data)

            self.train_neural_net(train_data)
            self.nnet.save_checkpoint(folder='checkpoint', filename=f'checkpoint_{i}.pth.tar')
            self.nnet.save_checkpoint(folder='checkpoint', filename='best.pth.tar')
            
    def save_plots(self):
        # Create a plot with 2 subplots
        plt.figure(figsize=(12, 5))
        
        # Policy Loss
        plt.subplot(1, 2, 1)
        plt.plot(self.pi_loss_history, label='Policy Loss', color='blue')
        plt.title('Policy Loss over Epochs')
        plt.xlabel('Epochs')
        plt.ylabel('Loss')
        plt.legend()
        plt.grid(True)
        
        # Value Loss
        plt.subplot(1, 2, 2)
        plt.plot(self.v_loss_history, label='Value Loss', color='red')
        plt.title('Value Loss over Epochs')
        plt.xlabel('Epochs')
        plt.ylabel('Loss')
        plt.legend()
        plt.grid(True)
        
        plt.tight_layout()
        
        # Save to checkpoint folder
        if not os.path.exists(self.args.checkpoint):
            os.mkdir(self.args.checkpoint)
        plt.savefig(os.path.join(self.args.checkpoint, 'training_metrics.png'))
        plt.close()

    def train_neural_net(self, examples):
        optimizer = torch.optim.Adam(self.nnet.parameters(), lr=self.args.lr)

        for epoch in range(self.args.epochs):
            print(f'Training Epoch {epoch+1}')
            self.nnet.train()
            
            batch_count = int(len(examples) / self.args.batch_size)
            
            epoch_pi_loss = 0
            epoch_v_loss = 0
            
            for _ in range(batch_count):
                sample_ids = np.random.randint(len(examples), size=self.args.batch_size)
                boards, pis, vs = list(zip(*[examples[i] for i in sample_ids]))
                
                boards = torch.FloatTensor(np.array(boards).astype(np.float64))
                target_pis = torch.FloatTensor(np.array(pis))
                target_vs = torch.FloatTensor(np.array(vs).astype(np.float64))

                # Move to device (CUDA / MPS / CPU)
                boards = boards.contiguous().to(self.args.device)
                target_pis = target_pis.contiguous().to(self.args.device)
                target_vs = target_vs.contiguous().to(self.args.device)

                # compute output
                out_pi, out_v = self.nnet(boards)
                l_pi = -torch.sum(target_pis * out_pi) / target_pis.size()[0]
                l_v = torch.sum((target_vs - out_v.view(-1)) ** 2) / target_vs.size()[0]
                total_loss = l_pi + l_v
                
                # Accumulate for average
                epoch_pi_loss += l_pi.item()
                epoch_v_loss += l_v.item()

                optimizer.zero_grad()
                total_loss.backward()
                optimizer.step()
            
            # Avoid division by zero if batch_count is 0 (unlikely but safe)
            if batch_count > 0:
                avg_pi = epoch_pi_loss / batch_count
                avg_v = epoch_v_loss / batch_count
                self.pi_loss_history.append(avg_pi)
                self.v_loss_history.append(avg_v)
                print(f"Loss: {avg_pi + avg_v:.4f} (Pol: {avg_pi:.4f}, Val: {avg_v:.4f})")
                
                # TensorBoard logging
                # Global step calculation: (Iter-1) * Epochs_per_Iter + Current_Epoch
                # Iter starts at 1, epoch starts at 0
                global_step = (getattr(self, 'current_iter', 1) - 1) * self.args.epochs + epoch
                self.writer.add_scalar('Loss/Total', avg_pi + avg_v, global_step)
                self.writer.add_scalar('Loss/Policy', avg_pi, global_step)
                self.writer.add_scalar('Loss/Value', avg_v, global_step)

                # Log to JSON
                log_entry = {
                    'iteration': getattr(self, 'current_iter', 0),
                    'epoch': epoch + 1,
                    'pi_loss': float(avg_pi),
                    'v_loss': float(avg_v),
                    'timestamp': time.time()
                }
                self.log_data['history'].append(log_entry)
                
                # Write to file (persistently)
                try:
                    with open(self.log_file, 'w') as f:
                        json.dump(self.log_data, f, indent=4)
                except Exception as e:
                    print(f"Warning: Could not save log file: {e}")
            
            self.save_plots()

class Args:
    def __init__(self):
        self.numIters = 100        # Train for longer (was 3)
        self.numEps = 50           # More games per batch (was 10)
        self.tempThreshold = 15
        self.updateThreshold = 0.6
        self.maxlenOfQueue = 200000
        self.numMCTSSims = 100     # Smarter self-play (was 25)
        self.arenaCompare = 40
        self.cpuct = 1
        
        self.checkpoint = './checkpoint/'
        self.lr = 0.001
        self.dropout = 0.3
        self.epochs = 5
        self.batch_size = 64
        self.num_channels = 64
        
        # Device Selection
        if torch.cuda.is_available():
            self.device = 'cuda'
        elif torch.backends.mps.is_available():
            self.device = 'mps'
        else:
            self.device = 'cpu'
            
if __name__ == "__main__":
    args = Args()
    print(f"Training on device: {args.device}")

    # IMPORTANT: Start with a small board to verify it works!
    # A 15x15 board takes a LONG time to train.
    # Change n=6 or n=8 to test the pipeline first.
    game = GomokuGame(n=8) 
    
    nnet = GomokuNet(game)
    nnet.to(args.device) # Move to GPU/MPS/CPU
    
    # Try loading checkpoint if exists
    try:
        nnet.load_checkpoint('checkpoint', 'best.pth.tar')
        print("Loaded existing checkpoint.")
    except:
        print("Starting from scratch.")

    c = Trainer(game, nnet, args)
    c.train()
