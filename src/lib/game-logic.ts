import { BOARD_SIZE, TILE_TYPES } from './constants';
import type { Board, Tile, PowerUpType } from './types';

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
      };
    }
  }

  let matches = findMatches(board).matches;
  while (matches.length > 0) {
    matches.forEach(tile => {
      if (board[tile.row] && board[tile.row][tile.col]) {
        board[tile.row][tile.col] = {
          id: tileIdCounter++,
          type: getRandomTileType(),
          row: tile.row,
          col: tile.col,
        };
      }
    });
    matches = findMatches(board).matches;
  }

  return board;
};

export const findMatches = (
  board: Board
): {
  matches: Tile[];
  powerUp: { tile: Tile; powerUp: PowerUpType } | null;
} => {
  const matches = new Set<string>();
  let powerUp: { tile: Tile; powerUp: PowerUpType } | null = null;
  let longestMatch = 0;

  // Find horizontal matches
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE - 2; ) {
      const tile1 = board[row][col];
      if (tile1) {
        const match: Tile[] = [tile1];
        for (let i = col + 1; i < BOARD_SIZE; i++) {
          const nextTile = board[row][i];
          if (nextTile && nextTile.type === tile1.type) {
            match.push(nextTile);
          } else {
            break;
          }
        }
        if (match.length >= 3) {
          match.forEach(t => matches.add(String(t.id)));
          if (match.length > longestMatch) {
            longestMatch = match.length;
            if (match.length >= 4) {
              powerUp = { tile: tile1, powerUp: 'bomb' };
            }
          }
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
        const match: Tile[] = [tile1];
        for (let i = row + 1; i < BOARD_SIZE; i++) {
          const nextTile = board[i][col];
          if (nextTile && nextTile.type === tile1.type) {
            match.push(nextTile);
          } else {
            break;
          }
        }
        if (match.length >= 3) {
          match.forEach(t => matches.add(String(t.id)));
          if (match.length > longestMatch) {
            longestMatch = match.length;
            if (match.length >= 4) {
              powerUp = { tile: tile1, powerUp: 'bomb' };
            }
          }
        }
        row += match.length > 1 ? match.length : 1;
      } else {
        row++;
      }
    }
  }

  const allTiles = board.flat().filter((t): t is Tile => t !== null);
  const matchedTiles = allTiles.filter(t => matches.has(String(t.id)));

  // T-shape and L-shape matches for bombs
  if (matchedTiles.length >= 5 && longestMatch < 5) {
      // Basic check for intersection point
      for (const tile of matchedTiles) {
          const horizontalNeighbors = matchedTiles.filter(t => t.row === tile.row);
          const verticalNeighbors = matchedTiles.filter(t => t.col === tile.col);
          if (horizontalNeighbors.length >= 3 && verticalNeighbors.length >= 3) {
              powerUp = { tile, powerUp: 'bomb' };
              break;
          }
      }
  }


  // If a 4-match created a bomb, but a 5-match also exists, don't create the bomb.
  // A 5-match could be reserved for a different power-up later.
  if (longestMatch >= 5) {
      // For now, 5-match also creates a bomb.
      // This can be changed later.
  }

  return { matches: matchedTiles, powerUp };
};

export const applyGravity = (
  board: Board
): { newBoard: Board; movedTiles: Set<number> } => {
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
        if (findMatches(newBoard).matches.length > 0) return true;
      }
      // Try swapping down
      if (row < BOARD_SIZE - 1) {
        const newBoard = swapTiles(board, row, col, row + 1, col);
        if (findMatches(newBoard).matches.length > 0) return true;
      }
    }
  }
  return false;
};

const swapTiles = (
  board: Board,
  r1: number,
  c1: number,
  r2: number,
  c2: number
): Board => {
  const newBoard = board.map(row =>
    row.map(tile => (tile ? { ...tile } : null))
  );
  const tile1 = newBoard[r1][c1];
  const tile2 = newBoard[r2][c2];
  if (tile1) newBoard[r2][c2] = { ...tile1, row: r2, col: c2 };
  else newBoard[r2][c2] = null;
  if (tile2) newBoard[r1][c1] = { ...tile2, row: r1, col: c1 };
  else newBoard[r1][c1] = null;
  return newBoard;
};

export const activatePowerUp = (
  board: Board,
  tile: Tile
): { newBoard: Board; clearedTiles: Tile[] } => {
  let clearedTiles: Tile[] = [];
  const { row, col, powerUp } = tile;

  if (powerUp === 'bomb') {
    for (let r = row - 1; r <= row + 1; r++) {
      for (let c = col - 1; c <= col + 1; c++) {
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
          const targetTile = board[r][c];
          if (targetTile) {
            clearedTiles.push(targetTile);
          }
        }
      }
    }
  }

  const clearedTileIds = new Set(clearedTiles.map(t => t.id));
  const newBoard = board.map(r =>
    r.map(t => (t && clearedTileIds.has(t.id) ? null : t))
  );

  return { newBoard, clearedTiles };
};
