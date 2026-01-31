import React, { useState, useEffect } from 'react';
import { GameConfig, Player, GridState, Coordinate, GameMode } from '../types';
import { createEmptyGrid, checkWin, isGridFull, getPlayerName } from '../utils/gameLogic';
import { Board } from './Board';
import { Button } from './Button';
import confetti from 'https://cdn.skypack.dev/canvas-confetti';

interface GameProps {
    config: GameConfig;
    mode: GameMode;
    onGameEnd: (winner: string | null) => void;
    onExit: () => void;
}

export const Game: React.FC<GameProps> = ({ config, mode, onGameEnd, onExit }) => {
    const [grid, setGrid] = useState<GridState>(createEmptyGrid(config.rows, config.cols));
    
    // Randomize starting player in AI mode
    const [currentPlayer, setCurrentPlayer] = useState<Player>(() => {
        if (mode === GameMode.AI) {
            return Math.random() < 0.5 ? Player.A : Player.B;
        }
        return Player.A;
    });

    const [history, setHistory] = useState<Coordinate[]>([]);
    const [winner, setWinner] = useState<Player | null>(null);
    const [winningLine, setWinningLine] = useState<Coordinate[] | null>(null);
    const [isDraw, setIsDraw] = useState(false);
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [isOverlayVisible, setIsOverlayVisible] = useState(true);

    // AI Turn Logic
    useEffect(() => {
        if (mode === GameMode.AI && currentPlayer === Player.B && !winner && !isDraw) {
            const makeAiMove = async () => {
                setIsAiThinking(true);
                try {
                    // Convert grid for API: Player.A -> 1, Player.B -> -1, null -> 0
                    const apiGrid = grid.map(row => 
                        row.map(cell => {
                            if (cell === Player.A) return 1;
                            if (cell === Player.B) return -1;
                            return 0;
                        })
                    );

                    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                    const response = await fetch(`${API_URL}/predict`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            grid: apiGrid,
                            currentPlayer: -1 // AI is always Player B (-1) in this setup
                        })
                    });

                    if (!response.ok) throw new Error('AI Server Error');
                    
                    const move = await response.json();
                    handleCellClick(move.row, move.col, true);
                } catch (error) {
                    console.error("AI failed to move:", error);
                    alert("AI is offline or crashed. Check console.");
                } finally {
                    setIsAiThinking(false);
                }
            };
            
            // Small delay to make it feel natural
            const timer = setTimeout(makeAiMove, 500);
            return () => clearTimeout(timer);
        }
    }, [currentPlayer, grid, mode, winner, isDraw]);

    const handleCellClick = (row: number, col: number, isAiMove = false) => {
        // Block interaction if AI is thinking or game over
        // BUT allow if it is the AI making the move
        if ((isAiThinking && !isAiMove) || grid[row][col] !== null || winner || isDraw) return;
        
        // Block human from playing on AI's turn
        if (!isAiMove && mode === GameMode.AI && currentPlayer === Player.B) return; 

        const newGrid = grid.map(r => [...r]);
        newGrid[row][col] = currentPlayer;
        setGrid(newGrid);

        const newHistory = [...history, { row, col }];
        setHistory(newHistory);

        // Check Win
        const winResult = checkWin(newGrid);
        if (winResult) {
            setWinner(winResult.winner);
            setWinningLine(winResult.line);
            setIsOverlayVisible(true);
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 }
            });
            return; // Stop turn switching
        }

        // Check Draw
        if (isGridFull(newGrid)) {
            setIsDraw(true);
            setIsOverlayVisible(true);
            return;
        }

        // Switch Turn
        setCurrentPlayer(prev => prev === Player.A ? Player.B : Player.A);
    };

    const handleUndo = () => {
        if (history.length === 0 || winner || isDraw) return;

        const lastMove = history[history.length - 1];
        const newHistory = history.slice(0, -1);
        
        const newGrid = grid.map(r => [...r]);
        newGrid[lastMove.row][lastMove.col] = null;
        
        setGrid(newGrid);
        setHistory(newHistory);
        
        // Switch back to previous player
        setCurrentPlayer(prev => prev === Player.A ? Player.B : Player.A);
    };

    const handleFinish = () => {
        if (winner) {
            onGameEnd(getPlayerName(winner, config));
        } else if (isDraw) {
            onGameEnd(null);
        }
    };

    // Effect to trigger onGameEnd callback interaction after state update? 
    // Better to show a modal inside Game first, then allow "Finish"
    // Actually, let's show a result overlay here.

    const currentName = getPlayerName(currentPlayer, config);

    return (
        <div className="flex flex-col items-center w-full max-w-4xl mx-auto space-y-6 p-4">
            
            {/* Header / HUD */}
            <div className="flex justify-between items-center w-full bg-white p-4 rounded-xl shadow-sm border border-stone-200">
                <div className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${currentPlayer === Player.A && !winner && !isDraw ? 'bg-stone-900 text-white' : 'text-stone-500'}`}>
                    <div className="w-4 h-4 rounded-full bg-stone-900 border border-stone-600"></div>
                    <span className="font-bold">{config.playerAName}</span>
                </div>

                <div className="text-lg font-serif font-bold text-wood-800">
                    VS
                </div>

                <div className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${currentPlayer === Player.B && !winner && !isDraw ? 'bg-stone-200 text-stone-900' : 'text-stone-500'}`}>
                    <span className="font-bold">{config.playerBName}</span>
                    <div className="w-4 h-4 rounded-full bg-stone-100 border border-stone-300"></div>
                </div>
            </div>

            {/* Turn Indicator Message */}
            {!winner && !isDraw && (
                <div className="text-stone-600 font-medium animate-pulse">
                    {isAiThinking ? (
                        <span className="flex items-center gap-2 text-wood-800">
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            AI is thinking...
                        </span>
                    ) : (
                        <>It's <span className="font-bold text-stone-900">{currentName}'s</span> turn</>
                    )}
                </div>
            )}

            {/* Game Board */}
            <div className="w-full max-w-[600px] aspect-square">
                <Board 
                    grid={grid} 
                    onCellClick={handleCellClick} 
                    currentPlayer={currentPlayer}
                    isGameOver={!!winner || isDraw}
                    lastMove={history.length > 0 ? history[history.length - 1] : null}
                    winningLine={winningLine}
                />
            </div>

            {/* Controls */}
            <div className="flex gap-4 w-full max-w-[600px]">
                {config.canRemove && !winner && !isDraw && (
                    <Button 
                        onClick={handleUndo} 
                        disabled={history.length === 0}
                        className="flex-1"
                        variant="secondary"
                    >
                        Undo Move
                    </Button>
                )}
                
                {/* Show Results Button (when overlay is hidden) */}
                {(winner || isDraw) && !isOverlayVisible && (
                    <Button 
                        onClick={() => setIsOverlayVisible(true)} 
                        className="flex-1"
                        variant="wood"
                    >
                        Show Results
                    </Button>
                )}

                <Button onClick={onExit} variant="secondary" className="flex-1">
                    Quit Game
                </Button>
            </div>

            {/* Winner/Draw Overlay */}
            {(winner || isDraw) && isOverlayVisible && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full text-center border-4 border-wood-300 transform scale-100 animate-in fade-in zoom-in">
                        <h2 className="text-4xl font-bold mb-2 text-stone-800 font-serif">
                            {winner ? 'Game Won!' : 'Draw Game'}
                        </h2>
                        <p className="text-xl text-stone-600 mb-8">
                            {winner 
                                ? `${getPlayerName(winner, config)} takes the victory!` 
                                : "Nobody won this round."}
                        </p>
                        <div className="flex flex-col gap-3">
                            <Button onClick={handleFinish} fullWidth variant="wood">
                                Continue to Results
                            </Button>
                            <Button onClick={() => setIsOverlayVisible(false)} fullWidth variant="secondary">
                                Inspect Board
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};