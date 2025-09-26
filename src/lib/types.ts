import { TILE_TYPES } from './constants';

export type TileType = (typeof TILE_TYPES)[number];
export type PowerUpType = 'bomb' | 'column_clear' | 'row_clear' | 'rainbow';

export type Tile = {
  id: number;
  type: TileType;
  row: number;
  col: number;
  powerUp?: PowerUpType;
};

export type Board = (Tile | null)[][];

export type GameState = 'playing' | 'win' | 'lose' | 'level_end';
