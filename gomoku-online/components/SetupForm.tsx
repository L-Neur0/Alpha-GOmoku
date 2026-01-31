import React, { useState } from 'react';
import { GameMode } from '../types';
import { Button } from './Button';

interface SetupFormProps {
    mode: GameMode;
    onStart: (config: { cols: number; rows: number; playerAName: string; playerBName: string }) => void;
    onBack: () => void;
}

export const SetupForm: React.FC<SetupFormProps> = ({ mode, onStart, onBack }) => {
    const [playerA, setPlayerA] = useState('');
    const [playerB, setPlayerB] = useState('');
    const [cols, setCols] = useState(15);
    const [rows, setRows] = useState(15);
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!playerA.trim() || !playerB.trim()) {
            setError('Please enter names for both players.');
            return;
        }
        if (playerA.trim() === playerB.trim()) {
            setError('Players cannot have the same name.');
            return;
        }

        let targetCols = cols;
        let targetRows = rows;

        if (mode === GameMode.STANDARD) {
            targetCols = 15;
            targetRows = 15;
        } else if (mode === GameMode.AI) {
            targetCols = 8;
            targetRows = 8;
        }

        onStart({
            playerAName: playerA.trim(),
            playerBName: playerB.trim(),
            cols: targetCols,
            rows: targetRows,
        });
    };

    const isAdjustable = mode !== GameMode.STANDARD && mode !== GameMode.AI;

    // Auto-set AI name if mode is AI
    React.useEffect(() => {
        if (mode === GameMode.AI) {
            setPlayerB('Gomoku AI');
            setPlayerA('Human');
        }
    }, [mode]);

    return (
        <div className="w-full max-w-md mx-auto bg-white p-8 rounded-xl shadow-xl border border-stone-200">
            <h2 className="text-2xl font-bold text-stone-800 mb-6 text-center">Game Configuration</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Player A (Black)</label>
                        <input
                            type="text"
                            value={playerA}
                            onChange={e => setPlayerA(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-stone-800 focus:border-stone-800 outline-none transition-all"
                            placeholder="Enter name"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Player B (White)</label>
                        <input
                            type="text"
                            value={playerB}
                            onChange={e => setPlayerB(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-stone-800 focus:border-stone-800 outline-none transition-all"
                            placeholder="Enter name"
                        />
                    </div>
                </div>

                {isAdjustable && (
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-stone-100">
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">Columns (10-20)</label>
                            <input
                                type="number"
                                min={10}
                                max={20}
                                value={cols}
                                onChange={e => setCols(Number(e.target.value))}
                                className="w-full px-4 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-stone-800 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">Rows (10-20)</label>
                            <input
                                type="number"
                                min={10}
                                max={20}
                                value={rows}
                                onChange={e => setRows(Number(e.target.value))}
                                className="w-full px-4 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-stone-800 outline-none"
                            />
                        </div>
                    </div>
                )}

                {error && (
                    <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                        {error}
                    </div>
                )}

                <div className="flex flex-col gap-3 pt-4">
                    <Button type="submit" fullWidth>Start Game</Button>
                    <Button type="button" onClick={onBack} variant="secondary" fullWidth>Back</Button>
                </div>
            </form>
        </div>
    );
};