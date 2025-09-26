
import { BOARD_SIZE, TILE_TYPES } from './constants';
import type { Board, Tile, PowerUpType, TileType as TileTypeEnum } from './types';

export let tileIdCounter = 0;

export const resetTileIdCounter = () => {
  tileIdCounter = 0;
};

export const setTileIdCounter = (value: number) => {
  tileIdCounter = value;
};

const getRandomTileType = (exclude: string[] = []): (typeof TILE_TYPES)[number] => {
  const availableTypes = TILE_TYPES.filter(t => !exclude.includes(t));
  return availableTypes[Math.floor(Math.random() * availableTypes.length)];
};

export const createInitialBoard = (): Board => {
  const board: Board = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    board[row] = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      let tileType: (typeof TILE_TYPES)[number];
      const exclude: string[] = [];

      // Check for horizontal match
      if (col >= 2 && board[row][col - 1]?.type === board[row][col - 2]?.type) {
        exclude.push(board[row][col - 1]!.type);
      }

      // Check for vertical match
      if (row >= 2 && board[row - 1][col]?.type === board[row - 2][col]?.type) {
        exclude.push(board[row - 1][col]!.type);
      }
      
      tileType = getRandomTileType(exclude);
      
      board[row][col] = {
        id: tileIdCounter++,
        type: tileType,
        row,
        col,
      };
    }
  }

  return board;
};


export const findMatches = (
  board: Board
): {
  matches: Tile[];
  powerUps: { tile: Tile; powerUp: PowerUpType }[];
} => {
  const allMatches = new Set<Tile>();
  const powerUps: { tile: Tile; powerUp: PowerUpType }[] = [];
  const tilesInPowerups = new Set<number>();

  const horizontalMatches: Tile[][] = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE - 2; ) {
      const tile = board[row][col];
      if (tile && !tile.powerUp) {
        let match: Tile[] = [tile];
        for (let i = col + 1; i < BOARD_SIZE; i++) {
          const nextTile = board[row][i];
          if (nextTile && !nextTile.powerUp && nextTile.type === tile.type) {
            match.push(nextTile);
          } else {
            break;
          }
        }
        if (match.length >= 3) {
          horizontalMatches.push(match);
        }
        col += match.length > 1 ? match.length : 1;
      } else {
        col++;
      }
    }
  }

  const verticalMatches: Tile[][] = [];
  for (let col = 0; col < BOARD_SIZE; col++) {
    for (let row = 0; row < BOARD_SIZE - 2; ) {
      const tile = board[row][col];
      if (tile && !tile.powerUp) {
        let match: Tile[] = [tile];
        for (let i = row + 1; i < BOARD_SIZE; i++) {
          const nextTile = board[i][col];
          if (nextTile && !nextTile.powerUp && nextTile.type === tile.type) {
            match.push(nextTile);
          } else {
            break;
          }
        }
        if (match.length >= 3) {
          verticalMatches.push(match);
        }
        row += match.length > 1 ? match.length : 1;
      } else {
        row++;
      }
    }
  }
  
  const combinedMatches = [...horizontalMatches, ...verticalMatches];

  // Detect intersections for rainbow power-ups
  for (const hMatch of horizontalMatches) {
    if (hMatch.length < 3) continue;
    for (const vMatch of verticalMatches) {
       if (vMatch.length < 3) continue;
      const intersection = hMatch.find(ht =>
        vMatch.some(vt => vt.id === ht.id)
      );
      if (intersection) {
        hMatch.forEach(t => tilesInPowerups.add(t.id));
        vMatch.forEach(t => tilesInPowerups.add(t.id));
        powerUps.push({ tile: intersection, powerUp: 'rainbow' });
      }
    }
  }

  // Detect straight-line matches for other power-ups
  for (const match of combinedMatches) {
    if (match.some(t => tilesInPowerups.has(t.id))) continue;
    
    if (match.length >= 5) {
       const powerUpTile = match[Math.floor(match.length / 2)] || match[0];
       powerUps.push({
        tile: powerUpTile,
        powerUp: 'bomb',
      });
      match.forEach(t => tilesInPowerups.add(t.id));
    } else if (match.length === 4) {
      const powerUpTile = match[1] || match[0];
      const isVertical = match[0].col === match[1].col;
      powerUps.push({
        tile: powerUpTile,
        powerUp: isVertical ? 'column_clear' : 'row_clear',
      });
      match.forEach(t => tilesInPowerups.add(t.id));
    }
  }
  
  combinedMatches.flat().forEach(tile => {
      // If a powerup is formed, the tiles forming it are also part of a match.
      // But if it's just a 3-tile match, we only add them if not part of a powerup.
      if(!tilesInPowerups.has(tile.id)) {
          allMatches.add(tile);
      }
  })

  // If a powerup was created, it implies a valid match. We need to ensure `matches` is not empty.
  if (powerUps.length > 0) {
    const powerUpTileIds = new Set(powerUps.map(p => p.tile.id));
    for (const match of combinedMatches) {
        if (match.some(t => powerUpTileIds.has(t.id))) {
            match.forEach(t => allMatches.add(t));
        }
    }
  }

  return { matches: Array.from(allMatches), powerUps };
};

export const applyGravity = (
  board: Board
): { newBoard: Board; movedTiles: Set<number> } => {
  const newBoard: Board = Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill(null)
  );
  const movedTiles = new Set<number>();

  for (let col = 0; col < BOARD_SIZE; col++) {
    const columnTiles: Tile[] = [];
    // Collect all tiles in the current column, from the board and above
    for (let row = board.length - 1; row >= 0; row--) {
      if (board[row][col]) {
        columnTiles.push(board[row][col]!);
      }
    }

    // Place tiles back into the column from the bottom up
    let newRow = BOARD_SIZE - 1;
    for (const tile of columnTiles) {
      if (newRow >= 0) {
        if (tile.row !== newRow || tile.col !== col) {
          movedTiles.add(tile.id);
        }
        newBoard[newRow][col] = { ...tile, row: newRow, col };
        newRow--;
      }
    }
  }

  return { newBoard, movedTiles };
};

export const fillEmptyTiles = (board: Board): Board => {
  const newBoard = board.map(row => [...row]);

  for (let col = 0; col < BOARD_SIZE; col++) {
    let newTileRow = -1;
    for (let row = BOARD_SIZE - 1; row >= 0; row--) {
      if (newBoard[row][col] === null) {
        newBoard[row][col] = {
          id: tileIdCounter++,
          type: getRandomTileType(),
          row: newTileRow,
          col,
        };
        newTileRow--;
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
        const { matches, powerUps } = findMatches(newBoard);
        if (matches.length > 0 || powerUps.length > 0) return true;
      }
      // Try swapping down
      if (row < BOARD_SIZE - 1) {
        if (!board[row + 1][col]) continue;
        const newBoard = swapTiles(board, row, col, row + 1, col);
        const { matches, powerUps } = findMatches(newBoard);
        if (matches.length > 0 || powerUps.length > 0) return true;
      }
    }
  }
  return false;
};

export const findHint = (board: Board): Tile | null => {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const tile = board[row][col];
      if (!tile) continue;

      // Try swapping right
      if (col < BOARD_SIZE - 1) {
        const rightTile = board[row][col + 1];
        if (rightTile) {
          const newBoard = swapTiles(board, row, col, row, col + 1);
          const { matches, powerUps } = findMatches(newBoard);
          if (matches.length > 0 || powerUps.length > 0) return tile;
        }
      }

      // Try swapping down
      if (row < BOARD_SIZE - 1) {
        const downTile = board[row + 1][col];
        if (downTile) {
          const newBoard = swapTiles(board, row, col, row + 1, col);
          const { matches, powerUps } = findMatches(newBoard);
          if (matches.length > 0 || powerUps.length > 0) return tile;
        }
      }
    }
  }
  return null;
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
  tile: Tile,
  targetType?: TileTypeEnum,
): { clearedTiles: Tile[]; secondaryExplosions?: Tile[] } => {
  const clearedTilesMap = new Map<number, Tile>();
  clearedTilesMap.set(tile.id, tile);
  const secondaryExplosions: Tile[] = [];

  if (tile.powerUp === 'bomb') {
    // Clear 3x3 area around the bomb
    for (let r = tile.row - 1; r <= tile.row + 1; r++) {
      for (let c = tile.col - 1; c <= tile.col + 1; c++) {
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
          const targetTile = board[r][c];
          if (targetTile) {
            if (targetTile.powerUp && targetTile.id !== tile.id) {
              secondaryExplosions.push(targetTile);
            }
            clearedTilesMap.set(targetTile.id, targetTile);
          }
        }
      }
    }
  } else if (tile.powerUp === 'column_clear') {
    for (let r = 0; r < BOARD_SIZE; r++) {
      const targetTile = board[r][tile.col];
      if (targetTile) {
        if (targetTile.powerUp && targetTile.id !== tile.id) {
          secondaryExplosions.push(targetTile);
        }
        clearedTilesMap.set(targetTile.id, targetTile);
      }
    }
  } else if (tile.powerUp === 'row_clear') {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const targetTile = board[tile.row][c];
      if (targetTile) {
         if (targetTile.powerUp && targetTile.id !== tile.id) {
          secondaryExplosions.push(targetTile);
        }
        clearedTilesMap.set(targetTile.id, targetTile);
      }
    }
  } else if (tile.powerUp === 'rainbow') {
    let typeToClear = targetType;
    if (!typeToClear) {
        // If no target (e.g. from just clicking), pick a random one
        const availableTiles = board.flat().filter((t): t is Tile => t !== null && t.id !== tile.id && !t.powerUp);
        if(availableTiles.length > 0) {
            typeToClear = availableTiles[Math.floor(Math.random() * availableTiles.length)].type;
        }
    }
    if (typeToClear) {
        board.flat().forEach(t => {
            if (t?.type === typeToClear) {
              if (t.powerUp) {
                secondaryExplosions.push(t);
              }
              clearedTilesMap.set(t.id, t);
            }
        });
    }
  }

  return { clearedTiles: Array.from(clearedTilesMap.values()), secondaryExplosions };
};
