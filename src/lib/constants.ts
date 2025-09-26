import type { TileType } from './types';

export const BOARD_SIZE = 8;
export const INITIAL_MOVES = 25;
export const INITIAL_TARGET_SCORE = 1000;

export const TILE_TYPES: TileType[] = ['paw', 'bone', 'house', 'ball', 'bowl'];

export const TILE_COLORS: Record<TileType, string> = {
    paw: 'bg-orange-300',
    bone: 'bg-yellow-300',
    house: 'bg-pink-400',
    ball: 'bg-sky-400',
    bowl: 'bg-lime-400',
};
