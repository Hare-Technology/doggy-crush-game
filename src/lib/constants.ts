import type { TileType } from './types';

export const BOARD_SIZE = 8;
export const INITIAL_MOVES = 25;
export const INITIAL_TARGET_SCORE = 1000;

export const TILE_TYPES: TileType[] = ['paw', 'bone', 'house', 'ball', 'bowl'];

export const TILE_COLORS: Record<TileType, string> = {
    paw: 'bg-orange-400',
    bone: 'bg-amber-200',
    house: 'bg-red-500',
    ball: 'bg-green-500',
    bowl: 'bg-blue-500',
};
