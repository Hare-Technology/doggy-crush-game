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
  const allTiles = board.flat().filter((t): t is Tile => t !== null);

  const checkLine = (line: (Tile | null)[]) => {
    for (let i = 0; i < line.length - 2; ) {
      const tile1 = line[i];
      if (tile1 && !tile1.powerUp) {
        const match: Tile[] = [tile1];
        for (let j = i + 1; j < line.length; j++) {
          const nextTile = line[j];
          if (nextTile && !nextTile.powerUp && nextTile.type === tile1.type) {
            match.push(nextTile);
          } else {
            break;
          }
        }
        if (match.length >= 3) {
          match.forEach(t => {
            if (!t.powerUp) matches.add(String(t.id));
          });
          if (match.length >= 5 && !powerUp) {
            // Create bomb on the middle tile of the 5-match
            powerUp = { tile: match[2], powerUp: 'bomb' };
          }
        }
        i += match.length > 1 ? match.length : 1;
      } else {
        i++;
      }
    }
  };

  // Find horizontal matches
  for (let row = 0; row < BOARD_SIZE; row++) {
    checkLine(board[row]);
  }

  // Find vertical matches
  for (let col = 0; col < BOARD_SIZE; col++) {
    checkLine(board.map(row => row[col]));
  }

  const matchedTiles = allTiles.filter(
    t => !t.powerUp && matches.has(String(t.id))
  );

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
      const tile = board[row][col];
      if (!tile) continue;
      // Try swapping right
      if (col < BOARD_SIZE - 1) {
        if (!board[row][col + 1]) continue;
        const newBoard = swapTiles(board, row, col, row, col + 1);
        if (findMatches(newBoard).matches.length > 0) return true;
      }
      // Try swapping down
      if (row < BOARD_SIZE - 1) {
        if (!board[row + 1][col]) continue;
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
): { clearedTiles: Tile[]; randomBombTile: Tile | null } => {
  const clearedTiles = new Set<Tile>();
  let randomBombTile: Tile | null = null;

  // Bomb clears a 3x3 area
  if (tile.powerUp === 'bomb') {
    // 1. Clear 3x3 area around the clicked bomb
    for (let r = tile.row - 1; r <= tile.row + 1; r++) {
      for (let c = tile.col - 1; c <= tile.col + 1; c++) {
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
          const targetTile = board[r][c];
          if (targetTile) {
            // Do not destroy other powerups unless it's the bomb itself
            if (targetTile.powerUp && targetTile.id !== tile.id) {
              continue;
            }
            clearedTiles.add(targetTile);
          }
        }
      }
    }

    // 2. Select a random tile to become the next bomb
    const allOtherTiles = board
      .flat()
      .filter(
        (t): t is Tile =>
          t !== null && !clearedTiles.has(t) && !t.powerUp
      );

    if (allOtherTiles.length > 0) {
      randomBombTile =
        allOtherTiles[Math.floor(Math.random() * allOtherTiles.length)];
    }
  }

  return { clearedTiles: Array.from(clearedTiles), randomBombTile };
};
