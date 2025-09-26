import { BOARD_SIZE, TILE_TYPES } from './constants';
import type { Board, Tile, PowerUpType } from './types';

export let tileIdCounter = 0;

export const resetTileIdCounter = () => {
  tileIdCounter = 0;
};

export const setTileIdCounter = (value: number) => {
  tileIdCounter = value;
};

const getRandomTileType = (): (typeof TILE_TYPES)[number] => {
  return TILE_TYPES[Math.floor(Math.random() * TILE_TYPES.length)];
};

export const createInitialBoard = (): Board => {
  let board: Board = [];
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

  const checkLine = (line: (Tile | null)[], isVertical = false) => {
    if (line.length < 3) return;

    for (let i = 0; i <= line.length - 3; i++) {
      const tile1 = line[i];
      if (!tile1 || tile1.powerUp) continue;

      let match = [tile1];
      for (let j = i + 1; j < line.length; j++) {
        const tile2 = line[j];
        if (tile2 && !tile2.powerUp && tile2.type === tile1.type) {
          match.push(tile2);
        } else {
          break;
        }
      }

      if (match.length >= 3) {
        match.forEach(t => matches.add(String(t.id)));

        if (match.length >= 5 && !powerUp) {
          const powerUpTile = match[Math.floor(match.length / 2)];
          powerUp = {
            tile: powerUpTile,
            powerUp: 'bomb',
          };
        } else if (match.length === 4 && !powerUp) {
          const powerUpTile = match[Math.floor(match.length / 2)];
          powerUp = {
            tile: powerUpTile,
            powerUp: isVertical ? 'column_clear' : 'row_clear',
          };
        }

        i += match.length - 1; // Skip ahead
      }
    }
  };

  // Find horizontal matches
  for (let row = 0; row < BOARD_SIZE; row++) {
    checkLine(board[row], false);
  }

  // Find vertical matches
  for (let col = 0; col < BOARD_SIZE; col++) {
    checkLine(
      board.map(row => row[col]),
      true
    );
  }

  const matchedTiles = allTiles.filter(t => matches.has(String(t.id)));

  // If a powerup is being created, ensure its source tile is not in the final match list to be cleared immediately
  const finalMatches = powerUp
    ? matchedTiles.filter(t => t.id !== powerUp!.tile.id)
    : matchedTiles;

  return { matches: finalMatches, powerUp };
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

  if (tile.powerUp === 'bomb') {
    // Clear 3x3 area around the bomb
    for (let r = tile.row - 1; r <= tile.row + 1; r++) {
      for (let c = tile.col - 1; c <= tile.col + 1; c++) {
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
          const targetTile = board[r][c];
          if (targetTile) {
            // Don't clear other powerups unless they are the one being activated
            if (targetTile.powerUp && targetTile.id !== tile.id) {
              continue;
            }
            clearedTiles.add(targetTile);
          }
        }
      }
    }

    // Find a random tile to also turn into a bomb for the second explosion
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
  } else if (tile.powerUp === 'column_clear') {
    for (let r = 0; r < BOARD_SIZE; r++) {
      const targetTile = board[r][tile.col];
      if (targetTile) {
        if (targetTile.powerUp && targetTile.id !== tile.id) continue;
        clearedTiles.add(targetTile);
      }
    }
  } else if (tile.powerUp === 'row_clear') {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const targetTile = board[tile.row][c];
      if (targetTile) {
        if (targetTile.powerUp && targetTile.id !== tile.id) continue;
        clearedTiles.add(targetTile);
      }
    }
  }

  return { clearedTiles: Array.from(clearedTiles), randomBombTile };
};
