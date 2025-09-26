import type { TileType } from './types';

export const BOARD_SIZE = 8;
export const INITIAL_MOVES = 25;
export const INITIAL_TARGET_SCORE = 1000;

export const TILE_TYPES: TileType[] = ['paw', 'bone', 'house', 'ball', 'bowl'];

export const TILE_COLORS: Record<TileType, string> = {
    paw: 'bg-sky-300',
    bone: 'bg-rose-300',
    house: 'bg-amber-300',
    ball: 'bg-teal-300',
    bowl: 'bg-indigo-300',
};
