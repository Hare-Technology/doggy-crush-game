import { TILE_TYPES } from './constants';

export type TileType = (typeof TILE_TYPES)[number];

export type Tile = {
  id: number;
  type: TileType;
  row: number;
  col: number;
  isNew?: boolean;
};

export type Board = (Tile | null)[][];

export type GameState = 'playing' | 'win' | 'lose';
