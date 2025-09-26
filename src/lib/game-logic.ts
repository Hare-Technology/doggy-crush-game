import { BOARD_SIZE, TILE_TYPES } from './constants';
import type { Board, Tile } from './types';

let tileIdCounter = 0;

const getRandomTileType = (): (typeof TILE_TYPES)[number] => {
  return TILE_TYPES[Math.floor(Math.random() * TILE_TYPES.length)];
};

export const createInitialBoard = (): Board => {
  let board: Board = [];
  do {
    board = [];
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
  } while (findMatches(board).length > 0 || !checkBoardForMoves(board));
  return board;
};

export const findMatches = (board: Board): Tile[] => {
  const matches = new Set<Tile>();

  // Find horizontal matches
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE - 2; ) {
      const tile1 = board[row][col];
      if (tile1) {
        const match = [tile1];
        for (let i = col + 1; i < BOARD_SIZE; i++) {
          const nextTile = board[row][i];
          if (nextTile && nextTile.type === tile1.type) {
            match.push(nextTile);
          } else {
            break;
          }
        }
        if (match.length >= 3) {
          match.forEach(t => matches.add(t));
        }
        col += match.length;
      } else {
        col++;
      }
    }
  }

  // Find vertical matches
  for (let col = 0; col < BOARD_SIZE; col++) {
    for (let row = 0; row < BOARD_SIZE - 2; ) {
      const tile1 = board[row][col];
      if (tile1) {
        const match = [tile1];
        for (let i = row + 1; i < BOARD_SIZE; i++) {
          const nextTile = board[i][col];
          if (nextTile && nextTile.type === tile1.type) {
            match.push(nextTile);
          } else {
            break;
          }
        }
        if (match.length >= 3) {
          match.forEach(t => matches.add(t));
        }
        row += match.length;
      } else {
        row++;
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


export const checkBoardForMoves = (board: Board): boolean => {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      // Try swapping right
      if (col < BOARD_SIZE - 1) {
        const newBoard = swapTiles(board, row, col, row, col + 1);
        if (findMatches(newBoard).length > 0) return true;
      }
      // Try swapping down
      if (row < BOARD_SIZE - 1) {
        const newBoard = swapTiles(board, row, col, row + 1, col);
        if (findMatches(newBoard).length > 0) return true;
      }
    }
  }
  return false;
};

const swapTiles = (board: Board, r1: number, c1: number, r2: number, c2: number): Board => {
  const newBoard = board.map(row => row.map(tile => (tile ? { ...tile } : null)));
  const tile1 = newBoard[r1][c1];
  const tile2 = newBoard[r2][c2];
  newBoard[r1][c1] = tile2;
  newBoard[r2][c2] = tile1;
  return newBoard;
};
