# Alpha-GOmoku

An **AlphaZero-inspired Gomoku AI** built with PyTorch and Monte Carlo Tree Search (MCTS).  
The AI learns entirely through **self-play** — no human game data needed — and is served via a FastAPI backend to a React/TypeScript web interface.

---

## What It Is

**Gomoku** (五目並べ) is the classic board game where the first player to place five stones in a row (horizontally, vertically, or diagonally) wins.

This project implements the core ideas of the [AlphaZero paper](https://arxiv.org/abs/1712.01815):

| Component | Description |
|-----------|-------------|
| `game.py` | Gomoku rules engine (configurable board size, win detection, canonical form) |
| `model.py` | Convolutional neural network with a **policy head** (where to move) and **value head** (who is winning) |
| `mcts.py` | Monte Carlo Tree Search guided by the neural network, with tactical win-detection shortcut |
| `train.py` | Self-play training loop — generates games, trains the network, saves checkpoints |
| `server.py` | FastAPI backend exposing a `/predict` endpoint for the frontend |
| `gomoku-online/` | React + TypeScript + Vite frontend (play standard, vs AI, or custom board) |

A pre-trained checkpoint trained for **103 self-play iterations** on an 8×8 board is included in `checkpoint/best.pth.tar`.

---

## Architecture

```
Self-play loop
  └─> MCTS simulations (guided by GomokuNet)
        └─> GomokuNet (4 × Conv2D → policy + value heads)
  └─> Training examples → Adam optimizer
  └─> Save checkpoint
```

The network takes the board as input (canonical form, always from the current player's perspective) and outputs:
- **Policy**: probability distribution over all board positions
- **Value**: scalar in `[-1, 1]` estimating the current player's winning chances

---

## Requirements

- Python 3.10+
- PyTorch (CPU, CUDA, or Apple MPS are all auto-detected)
- Node.js 18+ (for the frontend only)

Install Python dependencies:

```bash
pip install -r requirements.txt
```

<details>
<summary>Full dependency list</summary>

```
numpy
torch
fastapi
uvicorn
matplotlib
tensorboard
```

</details>

---

## Running Locally

### 1. Play vs AI (backend + frontend)

**Start the FastAPI backend:**

```bash
uvicorn server:app --host 0.0.0.0 --port 8000
```

The server loads `checkpoint/best.pth.tar` automatically. It exposes:
- `POST /predict` — accepts board state, returns the AI's chosen move
- `GET /health` — health check

**Start the React frontend:**

```bash
cd gomoku-online
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. Choose **"Play vs AI (8×8 Demo)"** to play against the trained model.

> **Note:** The default board size in `server.py` is `BOARD_SIZE = 8` to match the included checkpoint. If you train on a different board size, update `BOARD_SIZE` in `server.py` accordingly.

---

### 2. Two-player (no backend needed)

Launch the frontend alone and select **"Play Standard Game (15×15)"** or **"Custom Board Size"** for a local two-player game — no Python server required.

---

## Training

Training runs entirely on your local machine via self-play.

```bash
python train.py
```

The script auto-detects and uses the best available device:

| Hardware | Device used |
|----------|-------------|
| NVIDIA GPU (CUDA) | `cuda` |
| Apple Silicon (Metal) | `mps` |
| CPU only | `cpu` |

### GPU notes

- **CUDA (NVIDIA):** Make sure you have a CUDA-compatible PyTorch build. Install with:
  ```bash
  pip install torch --index-url https://download.pytorch.org/whl/cu121
  ```
  Training is **significantly faster** on a GPU — each MCTS simulation calls the network, so throughput matters a lot.

- **Apple MPS:** Works out of the box on M1/M2/M3 Macs with PyTorch ≥ 2.0. Faster than CPU, slower than a dedicated GPU.

- **CPU:** Works but is slow. Consider reducing `numMCTSSims` (e.g., 25) and using a small board (`n=6` or `n=8`) for quick experiments.

### Key training parameters (in `train.py` → `Args`)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `numIters` | 100 | Number of training iterations |
| `numEps` | 50 | Self-play games per iteration |
| `numMCTSSims` | 100 | MCTS simulations per move (higher = smarter, slower) |
| `epochs` | 5 | Neural net training epochs per iteration |
| `batch_size` | 64 | Mini-batch size |
| `lr` | 0.001 | Adam learning rate |
| `tempThreshold` | 15 | Move number before switching to greedy play |

> **Quick start tip:** Change `game = GomokuGame(n=8)` to `n=6` and lower `numMCTSSims` to `25` to verify the pipeline works end-to-end before committing to a long run.

### Resuming training

Training automatically resumes from the last checkpoint saved in `checkpoint/`. Loss history is stored in `checkpoint/training_log.json` and loss curves are saved as `checkpoint/training_metrics.png`.

### Monitoring with TensorBoard

```bash
tensorboard --logdir runs/
```

---

## Deploying the Backend

The included `Procfile` is configured for **Heroku** (or any Procfile-based host):

```
web: uvicorn server:app --host 0.0.0.0 --port $PORT
```

Push the repository to Heroku, set the Python runtime to `3.10.13` (see `runtime.txt`), and the backend will start automatically. The frontend can be deployed separately to any static hosting (Vercel, Netlify, GitHub Pages, etc.) — just update the API endpoint URL in the frontend code.

> **Cloud GPU:** If you want to train in the cloud, use a GPU instance (e.g., Google Colab, Kaggle Kernels, Vast.ai, or AWS EC2 with a GPU AMI). Upload the repo, run `pip install -r requirements.txt`, then `python train.py`. Checkpoints saved during the run can be downloaded and used locally.

---

## Project Structure

```
Alpha-GOmoku/
├── game.py              # Gomoku rules engine
├── model.py             # PyTorch neural network (GomokuNet)
├── mcts.py              # Monte Carlo Tree Search
├── train.py             # Self-play training loop
├── server.py            # FastAPI inference server
├── requirements.txt     # Python dependencies
├── Procfile             # Heroku deployment config
├── runtime.txt          # Python version pin
├── checkpoint/          # Saved model weights + training logs
│   ├── best.pth.tar     # Best (latest) checkpoint
│   └── training_log.json
└── gomoku-online/       # React + TypeScript frontend
    ├── App.tsx
    ├── components/      # Board, Game, SetupForm, Scoreboard, Button
    ├── types.ts
    └── package.json
```
