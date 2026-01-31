from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import torch
import numpy as np
from fastapi.middleware.cors import CORSMiddleware

from game import GomokuGame
from model import GomokuNet
from mcts import MCTS

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration matches training
# WARNING: If you trained on n=8, you MUST change this to 8, or retrain the model on 15.
# For the demo, I am setting this to 8 to match train.py default.
# If your React app sends 15x15, this backend will error out unless you change this to 15 (and retrain).
BOARD_SIZE = 8 

game = GomokuGame(n=BOARD_SIZE)
nnet = GomokuNet(game)

# Try load model
try:
    nnet.load_checkpoint('checkpoint', 'best.pth.tar')
    nnet.eval()
    print("AI Model Loaded successfully")
except:
    print("WARNING: No trained model found. AI will play randomly/poorly.")

class Args:
    numMCTSSims = 400 # Higher = smarter but slower (was 50)
    cpuct = 1.0
    if torch.cuda.is_available():
        device = 'cuda'
    elif torch.backends.mps.is_available():
        device = 'mps'
    else:
        device = 'cpu'

args = Args()
print(f"Server using device: {args.device}")
nnet.to(args.device)

mcts = MCTS(game, nnet, args)

class GameState(BaseModel):
    # Flattened grid or 2D grid
    grid: List[List[int]] 
    # 1 for Player A (Black), -1 for Player B (White)
    # Your React app uses 1 and 2 usually, we will map 2 -> -1
    currentPlayer: int 

@app.post("/predict")
async def predict_move(state: GameState):
    # Convert React grid (0, "A", "B") to Model grid (0, 1, -1)
    # Assuming React sends raw strings or mapped integers.
    # Let's assume React sends: 0 for empty, 1 for Player A, -1 (or 2) for Player B.
    
    board_np = np.array(state.grid)
    
    # Validation
    if board_np.shape != (BOARD_SIZE, BOARD_SIZE):
        # Fallback: if we receive 15x15 but model is 8x8, we can just slice top-left 8x8 for testing
        # Or return error. For this toy example, let's return error.
        raise HTTPException(status_code=400, detail=f"Board must be {BOARD_SIZE}x{BOARD_SIZE}. AI is trained on {BOARD_SIZE}.")

    # Canonical form for the AI (AI always thinks it's Player 1)
    # The AI is 'state.currentPlayer'.
    canonical_board = game.get_canonical_form(board_np, state.currentPlayer)
    
    # Run MCTS
    # We create a new MCTS instance or reset the tree ideally for stateless requests, 
    # OR we keep the tree if we can track history. For simplicity: stateless.
    mcts_search = MCTS(game, nnet, args)
    
    probs = mcts_search.getActionProb(canonical_board, temp=0) # temp=0 for max competitive play
    action = np.argmax(probs)
    
    row = int(action // BOARD_SIZE)
    col = int(action % BOARD_SIZE)
    
    return {"row": row, "col": col}

@app.get("/health")
def health():
    return {"status": "ok"}
