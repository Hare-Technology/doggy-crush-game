




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
  if(availableTypes.length === 0) {
    // Fallback if all types are excluded for some reason
    return TILE_TYPES[Math.floor(Math.random() * TILE_TYPES.length)];
  }
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
  board: Board,
  swappedTile1?: Tile,
  swappedTile2?: Tile
): {
  matches: Tile[];
  powerUps: { tile: Tile; powerUp: PowerUpType }[];
} => {
  const allMatches = new Set<Tile>();
  const powerUps: { tile: Tile; powerUp: PowerUpType }[] = [];
  const tilesInPowerups = new Set<number>();
  
  const horizontalMatches: Tile[][] = [];
  const verticalMatches: Tile[][] = [];

  // Find horizontal matches
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE - 2; ) {
      const tile = board[row][col];
      if (tile) {
        let matchLength = 1;
        while (
          col + matchLength < BOARD_SIZE &&
          board[row][col + matchLength]?.type === tile.type
        ) {
          matchLength++;
        }
        if (matchLength >= 3) {
          const match = Array.from({ length: matchLength }, (_, i) => board[row][col + i]!);
          horizontalMatches.push(match);
        }
        col += matchLength;
      } else {
        col++;
      }
    }
  }

  // Find vertical matches
  for (let col = 0; col < BOARD_SIZE; col++) {
    for (let row = 0; row < BOARD_SIZE - 2; ) {
      const tile = board[row][col];
      if (tile) {
        let matchLength = 1;
        while (
          row + matchLength < BOARD_SIZE &&
          board[row + matchLength][col]?.type === tile.type
        ) {
          matchLength++;
        }
        if (matchLength >= 3) {
          const match = Array.from({ length: matchLength }, (_, i) => board[row + i][col]!);
          verticalMatches.push(match);
        }
        row += matchLength;
      } else {
        row++;
      }
    }
  }

  const allFoundMatches = [...horizontalMatches, ...verticalMatches];

  // Detect intersections for rainbow power-ups (L or T shapes)
  for (const hMatch of horizontalMatches) {
    for (const vMatch of verticalMatches) {
      const intersection = hMatch.find(ht => vMatch.some(vt => vt.id === ht.id));
      if (intersection && !tilesInPowerups.has(intersection.id)) {
        powerUps.push({ tile: intersection, powerUp: 'rainbow' });
        hMatch.forEach(t => tilesInPowerups.add(t.id));
        vMatch.forEach(t => tilesInPowerups.add(t.id));
      }
    }
  }

  // Process remaining matches for bombs and line clears
  for (const match of allFoundMatches) {
    if (match.some(t => tilesInPowerups.has(t.id))) continue;

    let powerUpTile: Tile | undefined;
    
    // Find the tile on the current board that was part of the swap
    const swappedTile1OnBoard = swappedTile1 ? match.find(t => t.id === swappedTile1.id) : undefined;
    const swappedTile2OnBoard = swappedTile2 ? match.find(t => t.id === swappedTile2.id) : undefined;

    if (swappedTile1OnBoard) {
      powerUpTile = swappedTile1OnBoard;
    } else if (swappedTile2OnBoard) {
      powerUpTile = swappedTile2OnBoard;
    }

    if (!powerUpTile) {
       powerUpTile = match[Math.floor(match.length / 2)];
    }


    if (match.length >= 5) {
      powerUps.push({ tile: powerUpTile, powerUp: 'bomb' });
      match.forEach(t => tilesInPowerups.add(t.id));
    } else if (match.length === 4) {
      const isHorizontal = match[0].row === match[1].row;
      powerUps.push({
        tile: powerUpTile,
        powerUp: isHorizontal ? 'row_clear' : 'column_clear',
      });
      match.forEach(t => tilesInPowerups.add(t.id));
    }
  }

  allFoundMatches.forEach(match => match.forEach(t => allMatches.add(t)));

  return { matches: Array.from(allMatches), powerUps };
};

export const applyGravity = (
  board: Board
): { newBoard: Board; movedTiles: Set<number> } => {
  const movedTiles = new Set<number>();
  const newBoard: Board = Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill(null)
  );

  for (let col = 0; col < BOARD_SIZE; col++) {
    const columnTiles: Tile[] = [];
    // Get all tiles from the column, including newly created ones above the board
    for (let row = 0; row < BOARD_SIZE; row++) {
      if (board[row][col]) {
        columnTiles.push(board[row][col]!);
      }
    }

    let newRowIndex = BOARD_SIZE - 1;
    columnTiles.sort((a,b) => a.row - b.row).reverse().forEach(tile => {
      if (newRowIndex >= 0) {
        if (tile.row !== newRowIndex || tile.col !== col) {
          movedTiles.add(tile.id);
        }
        newBoard[newRowIndex][col] = { ...tile, row: newRowIndex, col };
        newRowIndex--;
      }
    });
  }

  return { newBoard, movedTiles };
};


export const fillEmptyTiles = (
  board: Board
): Board => {
  const newBoard = board.map(row => [...row]);
  
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (newBoard[row][col] === null) {
        const exclude: string[] = [];
        // Check left for horizontal match
        if (col >= 2 && newBoard[row][col - 1]?.type === newBoard[row][col - 2]?.type) {
            exclude.push(newBoard[row][col - 1]!.type);
        }
        // Check below for vertical match
        if (row >= 2 && newBoard[row - 1][col]?.type === newBoard[row - 2][col]?.type) {
            exclude.push(newBoard[row - 1][col]!.type);
        }
        
        newBoard[row][col] = {
          id: tileIdCounter++,
          type: getRandomTileType(exclude),
          row: -1, // Start above the board
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
        const { matches, powerUps } = findMatches(newBoard, tile, board[row][col+1]);
        if (matches.length > 0 || powerUps.length > 0) return true;
      }
      // Try swapping down
      if (row < BOARD_SIZE - 1) {
        if (!board[row + 1][col]) continue;
        const newBoard = swapTiles(board, row, col, row + 1, col);
        const { matches, powerUps } = findMatches(newBoard, tile, board[row+1][col]);
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
          const { matches, powerUps } = findMatches(newBoard, tile, rightTile);
          if (matches.length > 0 || powerUps.length > 0) return tile;
        }
      }

      // Try swapping down
      if (row < BOARD_SIZE - 1) {
        const downTile = board[row + 1][col];
        if (downTile) {
          const newBoard = swapTiles(board, row, col, row + 1, col);
          const { matches, powerUps } = findMatches(newBoard, tile, downTile);
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
  isPrimaryActivation = false
): { clearedTiles: Tile[]; secondaryExplosions?: Tile[]; spawnBomb?: boolean } => {
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
    // Only spawn a new bomb on the primary activation
    return {
      clearedTiles: Array.from(clearedTilesMap.values()),
      secondaryExplosions,
      spawnBomb: isPrimaryActivation,
    };
  } else if (tile.powerUp === 'column_clear') {
    for (let r = 0; r < BOARD_SIZE; r++) {
      const targetTile = board[r][tile.col];
      if (targetTile) {
        if (targetTile.powerUp && targetTile.id !== tile.id) {
          secondaryExplosions.push(targetTile);
        } else {
          clearedTilesMap.set(targetTile.id, targetTile);
        }
      }
    }
  } else if (tile.powerUp === 'row_clear') {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const targetTile = board[tile.row][c];
      if (targetTile) {
         if (targetTile.powerUp && targetTile.id !== tile.id) {
          secondaryExplosions.push(targetTile);
        } else {
          clearedTilesMap.set(targetTile.id, targetTile);
        }
      }
    }
  } else if (tile.powerUp === 'rainbow' || targetType) {
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
