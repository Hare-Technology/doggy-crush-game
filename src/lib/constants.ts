import type { TileType } from './types';

export const BOARD_SIZE = 8;
export const INITIAL_MOVES = 25;
export const INITIAL_TARGET_SCORE = 1000;

export const TILE_TYPES: TileType[] = ['paw', 'bone', 'house', 'ball', 'bowl'];

export const TILE_COLORS: Record<TileType, string> = {
    paw: 'bg-red-400',
    bone: 'bg-sky-400',
    house: 'bg-emerald-400',
    ball: 'bg-amber-400',
    bowl: 'bg-violet-400',
};
