


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

  const processMatch = (match: Tile[], isHorizontal: boolean) => {
    if (match.length < 3) return;

    // Check if this match has already been used to form a power-up
    if (match.some(t => tilesInPowerups.has(t.id))) {
      match.forEach(t => allMatches.add(t));
      return;
    }

    let powerUpTile: Tile | undefined = undefined;

    // Prioritize the swapped tile for power-up creation
    if (swappedTile1 && match.some(t => t.id === swappedTile1.id)) {
      powerUpTile = swappedTile1;
    } else if (swappedTile2 && match.some(t => t.id === swappedTile2.id)) {
      powerUpTile = swappedTile2;
    } else {
      // Fallback to the middle tile if swapped tiles aren't in this match
      powerUpTile = match[Math.floor(match.length / 2)];
    }
    
    if (!powerUpTile) return;

    // A match of 4 or 5 that also includes a swapped tile can create a power-up
    if (match.length >= 5) {
      powerUps.push({
        tile: powerUpTile,
        powerUp: 'bomb',
      });
      match.forEach(t => tilesInPowerups.add(t.id));
    } else if (match.length === 4) {
      powerUps.push({
        tile: powerUpTile,
        powerUp: isHorizontal ? 'row_clear' : 'column_clear',
      });
      match.forEach(t => tilesInPowerups.add(t.id));
    }
    
    match.forEach(t => allMatches.add(t));
  };
  
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
          processMatch(match, true);
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
          processMatch(match, false);
        }
        row += matchLength;
      } else {
        row++;
      }
    }
  }

  // Detect intersections for rainbow power-ups
  for(let r=0; r<BOARD_SIZE; r++) {
    for(let c=0; c<BOARD_SIZE; c++) {
      const tile = board[r][c];
      if(!tile) continue;

      const hMatch = board[r].filter(t => t?.type === tile.type);
      const vMatch = board.map(row => row[c]).filter(t => t?.type === tile.type);

      if(hMatch.length >=3 && vMatch.length >=3) {
         const intersectionTile = tile;
         if(!tilesInPowerups.has(intersectionTile.id)) {
            powerUps.push({tile: intersectionTile, powerUp: 'rainbow'});
            hMatch.forEach(t => t && tilesInPowerups.add(t.id));
            vMatch.forEach(t => t && tilesInPowerups.add(t.id));
            hMatch.forEach(t => t && allMatches.add(t));
            vMatch.forEach(t => t && allMatches.add(t));
         }
      }
    }
  }


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
  board: Board,
  specialPlacements: { row: number; col: number; powerUp: PowerUpType, id: number }[] = []
): Board => {
  const newBoard = board.map(row => [...row]);
  const specialPlacedCoords = new Set(specialPlacements.map(p => `${p.row},${p.col}`));

  for (let col = 0; col < BOARD_SIZE; col++) {
    let newTileRow = -1;
    for (let row = BOARD_SIZE - 1; row >= 0; row--) {
      if (newBoard[row][col] === null && !specialPlacedCoords.has(`${row},${col}`)) {
        newBoard[row][col] = {
          id: tileIdCounter++,
          type: getRandomTileType(),
          row: newTileRow, // Start above the board
          col,
        };
        newTileRow--;
      }
    }
  }

  specialPlacements.forEach(p => {
    newBoard[p.row][p.col] = {
        id: p.id,
        type: getRandomTileType(), // Type doesn't matter much for a bomb
        row: -1, // Spawn off-screen
        col: p.col,
        powerUp: p.powerUp
    }
  });

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
