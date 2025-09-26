import { BOARD_SIZE, TILE_TYPES } from './constants';
import type { Board, Tile } from './types';

let tileIdCounter = 0;

const getRandomTileType = (): (typeof TILE_TYPES)[number] => {
  return TILE_TYPES[Math.floor(Math.random() * TILE_TYPES.length)];
};

export const createInitialBoard = (): Board => {
  let board: Board = [];
  tileIdCounter = 0;
  for (let row = 0; row < BOARD_SIZE; row++) {
    board[row] = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      board[row][col] = {
        id: tileIdCounter++,
        type: getRandomTileType(),
        row,
        col,
        isNew: true,
      };
    }
  }

  // Ensure no matches on creation
  while (findMatches(board).length > 0) {
    const matches = findMatches(board);
    matches.forEach(tile => {
        if (board[tile.row]) {
            board[tile.row][tile.col] = {
                id: tileIdCounter++,
                type: getRandomTileType(),
                row: tile.row,
                col: tile.col,
                isNew: true
            };
        }
    });
  }
  
  // Ensure there are possible moves
  while (!checkBoardForMoves(board)) {
      for (let row = 0; row < BOARD_SIZE; row++) {
          for (let col = 0; col < BOARD_SIZE; col++) {
              board[row][col] = {
                  id: tileIdCounter++,
                  type: getRandomTileType(),
                  row,
                  col,
                  isNew: true
              }
          }
      }
      // re-check for matches after reshuffle
      while (findMatches(board).length > 0) {
          const matches = findMatches(board);
          matches.forEach(tile => {
              if(board[tile.row]) {
                  board[tile.row][tile.col] = {
                      id: tileIdCounter++,
                      type: getRandomTileType(),
                      row: tile.row,
                      col: tile.col,
                      isNew: true
                  };
              }
          });
      }
  }

  // Set isNew to false for the final board state before starting the game
  const finalBoard = board.map(row => row.map(tile => {
    if (tile) {
      return {...tile, isNew: true}; // Start with animation
    }
    return null;
  }));

  // A brief delay to allow the initial animation to be seen
  setTimeout(() => {
    finalBoard.forEach(row => row.forEach(tile => {
      if (tile) {
        tile.isNew = false;
      }
    }));
  }, 500);

  return finalBoard;
};

export const findMatches = (board: Board): Tile[] => {
  const matches = new Set<string>();
  const matchedTiles: Tile[] = [];

  const addMatch = (tile: Tile) => {
    if (!matches.has(String(tile.id))) {
      matches.add(String(tile.id));
      matchedTiles.push(tile);
    }
  }

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
          match.forEach(t => addMatch(t));
        }
        col += match.length > 1 ? match.length : 1;
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
          match.forEach(t => addMatch(t));
        }
        row += match.length > 1 ? match.length : 1;
      } else {
        row++;
      }
    }
  }

  return matchedTiles;
};


export const applyGravity = (board: Board): { newBoard: Board; movedTiles: Set<number> } => {
    const newBoard = board.map(row => [...row]);
    const movedTiles = new Set<number>();

    for (let col = 0; col < BOARD_SIZE; col++) {
        let emptyRow = BOARD_SIZE - 1;
        for (let row = BOARD_SIZE - 1; row >= 0; row--) {
            if (newBoard[row][col]) {
                if (emptyRow !== row) {
                    const tile = newBoard[row][col]!;
                    newBoard[emptyRow][col] = { ...tile, row: emptyRow };
                    movedTiles.add(tile.id);
                    newBoard[row][col] = null;
                }
                emptyRow--;
            }
        }
    }
    return { newBoard, movedTiles };
};

export const fillEmptyTiles = (board: Board, isNew = false): Board => {
    const newBoard = board.map(row => [...row]);
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (newBoard[row][col] === null) {
                newBoard[row][col] = {
                    id: tileIdCounter++,
                    type: getRandomTileType(),
                    row,
                    col,
                    isNew,
                };
            } else {
                // Ensure existing tiles don't have isNew flag unless they just moved
                if (newBoard[row][col]!.isNew && !isNew) {
                    newBoard[row][col] = { ...newBoard[row][col]!, isNew: false };
                }
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
  if(tile1) newBoard[r2][c2] = {...tile1, row: r2, col: c2};
  else newBoard[r2][c2] = null;
  if(tile2) newBoard[r1][c1] = {...tile2, row: r1, col: c1};
  else newBoard[r1][c1] = null;
  return newBoard;
};
