import React from 'react';
import { GridState, Player, Coordinate } from '../types';

interface BoardProps {
    grid: GridState;
    onCellClick: (row: number, col: number) => void;
    currentPlayer: Player;
    isGameOver: boolean;
    lastMove: { row: number, col: number } | null;
    winningLine?: Coordinate[] | null;
}

export const Board: React.FC<BoardProps> = ({ grid, onCellClick, currentPlayer, isGameOver, lastMove, winningLine }) => {
    const rows = grid.length;
    const cols = grid[0].length;

    return (
        <div className="relative p-4 bg-wood-800 rounded-lg shadow-2xl shadow-stone-900/50">
            {/* The Board Surface */}
            <div 
                className="bg-wood-200 rounded shadow-inner border border-wood-400 relative"
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                    gap: '1px', // This creates the grid lines visually if background is dark, but we draw SVG lines instead for realism
                }}
            >
                {/* Grid Lines Overlay */}
                <div className="absolute inset-0 pointer-events-none z-0">
                    {/* Horizontal Lines */}
                    {Array.from({ length: rows }).map((_, i) => (
                        <div 
                            key={`h-${i}`}
                            className="absolute w-full border-b border-stone-800/30"
                            style={{ 
                                top: `${(i * 100) / rows + (100 / rows) / 2}%`, 
                                left: 0,
                            }} 
                        />
                    ))}
                    {/* Vertical Lines */}
                    {Array.from({ length: cols }).map((_, i) => (
                        <div 
                            key={`v-${i}`}
                            className="absolute h-full border-r border-stone-800/30"
                            style={{ 
                                left: `${(i * 100) / cols + (100 / cols) / 2}%`, 
                                top: 0,
                            }} 
                        />
                    ))}
                </div>

                {/* Cells and Stones */}
                {grid.map((row, rIndex) => (
                    row.map((cell, cIndex) => {
                        const isLastMove = lastMove && lastMove.row === rIndex && lastMove.col === cIndex;
                        const isWinningStone = winningLine?.some(coord => coord.row === rIndex && coord.col === cIndex);
                        
                        return (
                            <div 
                                key={`${rIndex}-${cIndex}`}
                                onClick={() => onCellClick(rIndex, cIndex)}
                                className={`
                                    aspect-square relative z-10 flex items-center justify-center
                                    ${!cell && !isGameOver ? 'cursor-pointer hover:bg-black/5' : ''}
                                `}
                            >
                                {/* Hover Shadow for next move */}
                                {!cell && !isGameOver && (
                                    <div className={`
                                        w-[80%] h-[80%] rounded-full opacity-0 hover:opacity-40 transition-opacity
                                        ${currentPlayer === Player.A ? 'bg-black' : 'bg-white'}
                                    `}></div>
                                )}

                                {/* Actual Stone */}
                                {cell && (
                                    <div 
                                        className={`
                                            w-[85%] h-[85%] rounded-full shadow-stone-black transition-transform duration-300
                                            ${cell === Player.A ? 'bg-stone-black' : 'bg-stone-white shadow-stone-white'}
                                            ${isLastMove && !isWinningStone ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-wood-200 scale-105' : ''}
                                            ${isWinningStone ? 'ring-4 ring-green-500 ring-offset-2 ring-offset-wood-200 scale-110 z-20' : ''}
                                            animate-in fade-in zoom-in duration-200
                                        `}
                                    />
                                )}
                                
                                {/* Star points (Standard Gomoku 15x15 has 5 star points) */}
                                {rows === 15 && cols === 15 && 
                                    ((rIndex === 3 && cIndex === 3) || 
                                    (rIndex === 3 && cIndex === 11) || 
                                    (rIndex === 7 && cIndex === 7) || 
                                    (rIndex === 11 && cIndex === 3) || 
                                    (rIndex === 11 && cIndex === 11)) && !cell && (
                                    <div className="absolute w-1.5 h-1.5 bg-stone-800 rounded-full"></div>
                                )}
                            </div>
                        );
                    })
                ))}
            </div>
        </div>
    );
};