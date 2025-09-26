import type { TileType } from './types';

export const BOARD_SIZE = 8;
export const INITIAL_MOVES = 25;
export const INITIAL_TARGET_SCORE = 1000;

export const TILE_TYPES: TileType[] = ['paw', 'bone', 'house', 'ball', 'bowl'];

export const TILE_COLORS: Record<TileType, string> = {
    paw: 'bg-red-400',
    bone: 'bg-blue-400',
    house: 'bg-green-400',
    ball: 'bg-yellow-400',
    bowl: 'bg-purple-400',
};
