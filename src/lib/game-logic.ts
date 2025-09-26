import { BOARD_SIZE, TILE_TYPES } from './constants';
import type { Board, Tile } from './types';

let tileIdCounter = 0;

const getRandomTileType = (): (typeof TILE_TYPES)[number] => {
  return TILE_TYPES[Math.floor(Math.random() * TILE_TYPES.length)];
};

export const createInitialBoard = (): Board => {
  const board: Board = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    board[row] = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      let newType;
      do {
        newType = getRandomTileType();
      } while (
        (col >= 2 &&
          board[row][col - 1]?.type === newType &&
          board[row][col - 2]?.type === newType) ||
        (row >= 2 &&
          board[row - 1][col]?.type === newType &&
          board[row - 2][col]?.type === newType)
      );
      board[row][col] = {
        id: tileIdCounter++,
        type: newType,
        row,
        col,
      };
    }
  }
  return board;
};

export const findMatches = (board: Board): Tile[] => {
  const matches = new Set<Tile>();

  // Find horizontal matches
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE - 2; col++) {
      const tile1 = board[row][col];
      const tile2 = board[row][col + 1];
      const tile3 = board[row][col + 2];
      if (tile1 && tile2 && tile3 && tile1.type === tile2.type && tile2.type === tile3.type) {
        matches.add(tile1);
        matches.add(tile2);
        matches.add(tile3);
        
        // check for more than 3
        for(let i=col+3; i < BOARD_SIZE; i++){
            if(board[row][i] && board[row][i]?.type === tile1.type) {
                matches.add(board[row][i] as Tile);
            } else {
                break;
            }
        }
      }
    }
  }

  // Find vertical matches
  for (let col = 0; col < BOARD_SIZE; col++) {
    for (let row = 0; row < BOARD_SIZE - 2; row++) {
      const tile1 = board[row][col];
      const tile2 = board[row + 1][col];
      const tile3 = board[row + 2][col];
      if (tile1 && tile2 && tile3 && tile1.type === tile2.type && tile2.type === tile3.type) {
        matches.add(tile1);
        matches.add(tile2);
        matches.add(tile3);

         // check for more than 3
         for(let i=row+3; i < BOARD_SIZE; i++){
            if(board[i][col] && board[i][col]?.type === tile1.type) {
                matches.add(board[i][col] as Tile);
            } else {
                break;
            }
        }
      }
    }
  }

  return Array.from(matches);
};


export const applyGravity = (board: Board): Board => {
    const newBoard = board.map(row => [...row]);

    for (let col = 0; col < BOARD_SIZE; col++) {
        let emptyRow = BOARD_SIZE - 1;
        for (let row = BOARD_SIZE - 1; row >= 0; row--) {
            if (newBoard[row][col]) {
                if (emptyRow !== row) {
                    newBoard[emptyRow][col] = { ...newBoard[row][col]!, row: emptyRow, col };
                    newBoard[row][col] = null;
                }
                emptyRow--;
            }
        }
    }
    return newBoard;
};

export const fillEmptyTiles = (board: Board): Board => {
    const newBoard = board.map(row => [...row]);
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (newBoard[row][col] === null) {
                newBoard[row][col] = {
                    id: tileIdCounter++,
                    type: getRandomTileType(),
                    row,
                    col,
                };
            }
        }
    }
    return newBoard;
};

export const areTilesAdjacent = (tile1: Tile, tile2: Tile): boolean => {
    const rowDiff = Math.abs(tile1.row - tile2.row);
    const colDiff = Math.abs(tile1.col - tile2.col);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
};
