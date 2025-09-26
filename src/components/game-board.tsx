'use client';

import type { FC } from 'react';
import type { Board, Tile as TileType } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  PawIcon,
  BoneIcon,
  DogHouseIcon,
  BallIcon,
  FoodBowlIcon,
  BombIcon,
  ColumnClearIcon,
  RowClearIcon,
} from '@/components/dog-icons';
import { BOARD_SIZE } from '@/lib/constants';

interface GameBoardProps {
  board: Board;
  onTileClick: (tile: TileType) => void;
  selectedTile: TileType | null;
  isProcessing: boolean;
  isAnimating: Set<number>;
}

const tileComponentMap: Record<string, React.ElementType> = {
  paw: PawIcon,
  bone: BoneIcon,
  house: DogHouseIcon,
  ball: BallIcon,
  bowl: FoodBowlIcon,
};

const powerUpComponentMap: Record<string, React.ElementType> = {
  bomb: BombIcon,
  column_clear: ColumnClearIcon,
  row_clear: RowClearIcon,
};

const Tile: FC<{
  tile: TileType;
  onClick: () => void;
  isSelected: boolean;
  isAnimating: boolean;
}> = ({ tile, onClick, isSelected, isAnimating }) => {
  const Icon = tile.powerUp
    ? powerUpComponentMap[tile.powerUp]
    : tileComponentMap[tile.type] || PawIcon;
  const top = (tile.row / BOARD_SIZE) * 100;
  const left = (tile.col / BOARD_SIZE) * 100;

  return (
    <div
      onClick={onClick}
      className={cn(
        'absolute rounded-lg flex items-center justify-center cursor-pointer transition-all duration-300 ease-in-out',
        'shadow-md',
        isSelected && 'ring-4 ring-offset-2 ring-white z-10 scale-110',
        isAnimating && 'animate-pop',
        tile.powerUp && 'animate-pulse'
      )}
      style={{
        top: `${top}%`,
        left: `${left}%`,
        width: `calc(${100 / BOARD_SIZE}% - 4px)`,
        height: `calc(${100 / BOARD_SIZE}% - 4px)`,
        margin: '2px',
        backgroundColor: `hsl(var(--tile-color-${tile.type}))`,
      }}
    >
      <Icon className="drop-shadow-lg w-full h-full flex items-center justify-center" />
    </div>
  );
};

const GameBoard: FC<GameBoardProps> = ({
  board,
  onTileClick,
  selectedTile,
  isProcessing,
  isAnimating,
}) => {
  const handleTileClick = (tile: TileType) => {
    if (isProcessing) return;
    onTileClick(tile);
  };

  const allTiles = board.flat().filter(Boolean) as TileType[];

  return (
    <div
      className={cn(
        'relative bg-primary/20 rounded-xl shadow-inner max-w-lg w-full aspect-square'
      )}
    >
      <style jsx global>{`
        :root {
          --tile-color-paw: 35 90% 80%;
          --tile-color-bone: 200 85% 80%;
          --tile-color-house: 100 85% 80%;
          --tile-color-ball: 300 80% 80%;
          --tile-color-bowl: 0 85% 80%;
        }
        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
            filter: brightness(1);
          }
          50% {
            transform: scale(1.05);
            filter: brightness(1.2);
          }
        }
        .animate-pulse {
          animation: pulse 2s infinite ease-in-out;
        }
      `}</style>

      {/* Grid background */}
      {Array.from({ length: BOARD_SIZE * BOARD_SIZE }).map((_, i) => (
        <div
          key={i}
          className="w-full h-full flex items-center justify-center bg-primary/10 rounded-lg"
          style={{
            position: 'absolute',
            top: `${Math.floor(i / BOARD_SIZE) * (100 / BOARD_SIZE)}%`,
            left: `${(i % BOARD_SIZE) * (100 / BOARD_SIZE)}%`,
            width: `${100 / BOARD_SIZE}%`,
            height: `${100 / BOARD_SIZE}%`,
            boxSizing: 'border-box',
            padding: '1px',
          }}
        >
          <div className="bg-primary/10 rounded-lg w-full h-full" />
        </div>
      ))}

      {/* Tiles */}
      {allTiles.map(tile => (
        <Tile
          key={tile.id}
          tile={tile}
          onClick={() => handleTileClick(tile)}
          isSelected={!!(selectedTile && selectedTile.id === tile.id)}
          isAnimating={isAnimating.has(tile.id)}
        />
      ))}
    </div>
  );
};

export default GameBoard;
