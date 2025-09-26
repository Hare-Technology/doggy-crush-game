import type { TileType } from './types';

export const BOARD_SIZE = 8;
export const INITIAL_MOVES = 25;
export const INITIAL_TARGET_SCORE = 1000;

export const TILE_TYPES: TileType[] = [
  'paw',
  'bone',
  'house',
  'ball',
  'bowl',
  'leash',
  'pawprint',
  'hotdog',
];

export const TILE_COLORS: Record<TileType, string> = {
  paw: '0 72% 75%',
  bone: '142 76% 75%',
  house: '221 83% 75%',
  ball: '45 100% 75%',
  bowl: '283 81% 75%',
  leash: '345 81% 75%',
  pawprint: '190 81% 75%',
  hotdog: '30 90% 75%',
};
