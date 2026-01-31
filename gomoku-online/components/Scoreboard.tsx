import React from 'react';
import { ScoreEntry } from '../types';
import { Button } from './Button';

interface ScoreboardProps {
    scores: Record<string, number>;
    onBack: () => void;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({ scores, onBack }) => {
    const sortedScores: ScoreEntry[] = Object.entries(scores)
        .map(([name, wins]) => ({ name, wins: wins as number }))
        .sort((a, b) => b.wins - a.wins)
        .filter(s => s.wins > 0);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] w-full max-w-2xl mx-auto p-6">
            <h2 className="text-4xl font-bold text-wood-800 mb-8 font-serif tracking-wide">Hall of Fame</h2>
            
            <div className="w-full bg-white rounded-xl shadow-xl overflow-hidden border border-stone-200 mb-8">
                {sortedScores.length === 0 ? (
                    <div className="p-8 text-center text-stone-500">
                        No games played yet. Be the first to win!
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-wood-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-stone-800 font-bold uppercase text-sm">Rank</th>
                                <th className="px-6 py-4 text-left text-stone-800 font-bold uppercase text-sm">Player</th>
                                <th className="px-6 py-4 text-right text-stone-800 font-bold uppercase text-sm">Wins</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {sortedScores.map((entry, index) => (
                                <tr key={entry.name} className="hover:bg-stone-50 transition-colors">
                                    <td className="px-6 py-4 text-stone-500 font-mono">#{index + 1}</td>
                                    <td className="px-6 py-4 text-stone-800 font-medium">{entry.name}</td>
                                    <td className="px-6 py-4 text-right font-bold text-wood-800">{entry.wins}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <Button onClick={onBack} variant="secondary">
                Back to Menu
            </Button>
        </div>
    );
};