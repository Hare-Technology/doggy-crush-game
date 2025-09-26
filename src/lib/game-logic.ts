
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
      // Only add to allMatches if it's not part of a group that created a powerup
      if(!tilesInPowerups.has(tile.id)) {
          allMatches.add(tile);
      }
  })

  return { matches: Array.from(allMatches), powerUps };
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
  for (let col = 0; col < BOARD_SIZE; col++) {
    for (let row = 0; row < BOARD_SIZE; row++) {
      if (newBoard[row][col] === null) {
        // Only create new tiles at the top where there's space.
        // The gravity function will handle moving them down.
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
  tile: Tile,
  targetType?: TileTypeEnum,
): { clearedTiles: Tile[]; secondaryExplosionTile?: Tile } => {
  const clearedTiles = new Set<Tile>();
  let secondaryExplosionTile: Tile | undefined;

  if (tile.powerUp === 'bomb') {
    // Clear 3x3 area around the bomb
    for (let r = tile.row - 1; r <= tile.row + 1; r++) {
      for (let c = tile.col - 1; c <= tile.col + 1; c++) {
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
          const targetTile = board[r][c];
          if (targetTile) {
            // Don't trigger other power-ups in the blast, just clear them
            clearedTiles.add(targetTile);
          }
        }
      }
    }
    // For level end cascade, create a secondary explosion
    if (!targetType) {
        const allOtherTiles = board.flat().filter((t): t is Tile =>
            t !== null && !Array.from(clearedTiles).some(ct => ct.id === t.id)
        );
        if (allOtherTiles.length > 0) {
            const randomBombTile = allOtherTiles[Math.floor(Math.random() * allOtherTiles.length)];
            secondaryExplosionTile = { ...randomBombTile, powerUp: 'bomb' };
        }
    }

  } else if (tile.powerUp === 'column_clear') {
    for (let r = 0; r < BOARD_SIZE; r++) {
      const targetTile = board[r][tile.col];
      if (targetTile) {
        clearedTiles.add(targetTile);
      }
    }
  } else if (tile.powerUp === 'row_clear') {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const targetTile = board[tile.row][c];
      if (targetTile) {
        clearedTiles.add(targetTile);
      }
    }
  } else if (tile.powerUp === 'rainbow') {
    clearedTiles.add(tile);
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
              clearedTiles.add(t);
            }
        });
    }
  }

  return { clearedTiles: Array.from(clearedTiles), secondaryExplosionTile };
};
