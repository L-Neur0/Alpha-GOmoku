import { GridState, Player, Coordinate } from '../types';

// Directions: Horizontal, Vertical, Diagonal Down-Right, Diagonal Up-Right
const DIRECTIONS = [
    [1, 0],  
    [0, 1],  
    [1, 1],  
    [1, -1]  
];

export const createEmptyGrid = (rows: number, cols: number): GridState => {
    return Array(rows).fill(null).map(() => Array(cols).fill(null));
};

export const isGridFull = (grid: GridState): boolean => {
    return grid.every(row => row.every(cell => cell !== null));
};

export interface WinResult {
    winner: Player;
    line: { row: number; col: number }[];
}

export const checkWin = (grid: GridState): WinResult | null => {
    const rows = grid.length;
    if (rows === 0) return null;
    const cols = grid[0].length;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const player = grid[r][c];
            if (player === null) continue;

            for (const [dr, dc] of DIRECTIONS) {
                let count = 1;
                // Check next 4 positions in this direction
                for (let i = 1; i < 5; i++) {
                    const nr = r + dr * i;
                    const nc = c + dc * i;

                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === player) {
                        count++;
                    } else {
                        break;
                    }
                }

                if (count >= 5) {
                    // Construct winning line
                    const line = [];
                    for (let i = 0; i < 5; i++) {
                        line.push({ row: r + dr * i, col: c + dc * i });
                    }
                    return { winner: player, line };
                }
            }
        }
    }
    return null;
};

// Helper to get display name
export const getPlayerName = (player: Player, config: { playerAName: string, playerBName: string }) => {
    return player === Player.A ? config.playerAName : config.playerBName;
};