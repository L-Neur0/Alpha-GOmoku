import numpy as np

class GomokuGame:
    def __init__(self, n=15):
        self.n = n

    def get_init_board(self):
        return np.zeros((self.n, self.n), dtype=int)

    def get_board_size(self):
        return (self.n, self.n)

    def get_action_size(self):
        return self.n * self.n

    def get_next_state(self, board, player, action):
        # action is an integer 0..(n*n-1)
        r, c = action // self.n, action % self.n
        new_board = np.copy(board)
        new_board[r][c] = player
        return new_board, -player

    def get_valid_moves(self, board):
        # Returns a binary vector of size n*n
        valid = np.zeros(self.n * self.n)
        for r in range(self.n):
            for c in range(self.n):
                if board[r][c] == 0:
                    valid[r * self.n + c] = 1
        return valid

    def get_game_ended(self, board, player):
        # returns 1 if player won, -1 if player lost, 0 if not ended, 1e-4 for draw
        
        # Check if the *previous* move won (which would be by -player)
        # But for efficiency, we usually check checks for the specific player relative to canonical form
        # Let's do a full check for the given player or opponent
        
        # Check win for 'player'
        if self.check_win(board, player):
            return 1
        # Check win for opponent
        if self.check_win(board, -player):
            return -1
            
        if np.sum(board == 0) == 0:
            return 1e-4 # Draw
            
        return 0

    def check_win(self, board, player):
        n = self.n
        # Directions: horizontal, vertical, diagonal, anti-diagonal
        directions = [(0, 1), (1, 0), (1, 1), (1, -1)]
        
        for r in range(n):
            for c in range(n):
                if board[r][c] != player:
                    continue
                
                for dr, dc in directions:
                    count = 0
                    for i in range(5):
                        nr, nc = r + dr*i, c + dc*i
                        if 0 <= nr < n and 0 <= nc < n and board[nr][nc] == player:
                            count += 1
                        else:
                            break
                    if count == 5:
                        return True
        return False

    def get_canonical_form(self, board, player):
        # Return state from perspective of 'player'. 
        # If player is -1, flip signs so it looks like player 1's turn
        return player * board

    def string_representation(self, board):
        return board.tobytes()
