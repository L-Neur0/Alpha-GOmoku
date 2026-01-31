export enum Player {
    A = 'A',
    B = 'B'
}

export interface GameConfig {
    cols: number;
    rows: number;
    canRemove: boolean;
    playerAName: string;
    playerBName: string;
}

export interface ScoreEntry {
    name: string;
    wins: number;
}

export type CellValue = Player | null;

export type GridState = CellValue[][];

export interface Coordinate {
    row: number;
    col: number;
}

export enum AppState {
    MENU,
    SETUP,
    PLAYING,
    GAME_OVER,
    SCOREBOARD
}

export enum GameMode {
    STANDARD,
    ADJUSTABLE,
    ADJUSTABLE_REMOVE,
    AI
}