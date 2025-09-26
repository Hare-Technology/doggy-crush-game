import type { TileType } from './types';

export const BOARD_SIZE = 8;
export const INITIAL_MOVES = 25;
export const INITIAL_TARGET_SCORE = 1000;

export const TILE_TYPES: TileType[] = ['paw', 'bone', 'house', 'ball', 'bowl'];

export const TILE_COLORS: Record<TileType, string> = {
    paw: '0 72% 51%', // red
    bone: '142 76% 36%', // green
    house: '221 83% 53%', // blue
    ball: '45 100% 51%', // yellow
    bowl: '283 81% 51%', // purple
};
