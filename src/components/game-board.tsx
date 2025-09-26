'use client';

import type { FC } from 'react';
import { memo, useState, useCallback } from 'react';
import type { Board, Tile as TileType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { PawIcon, BoneIcon, DogHouseIcon, BallIcon, FoodBowlIcon } from '@/components/dog-icons';
import { BOARD_SIZE } from '@/lib/constants';

interface GameBoardProps {
  board: Board;
  onSwap: (tile1: TileType, tile2: TileType) => void;
  isProcessing: boolean;
}

const tileComponentMap: Record<string, React.ElementType> = {
  paw: PawIcon,
  bone: BoneIcon,
  house: DogHouseIcon,
  ball: BallIcon,
  bowl: FoodBowlIcon,
};

const MemoizedTile: FC<{
  tile: TileType;
  onClick: (tile: TileType) => void;
  isSelected: boolean;
}> = memo(({ tile, onClick, isSelected }) => {
  const Icon = tileComponentMap[tile.type] || PawIcon;
  return (
    <div
      onClick={() => onClick(tile)}
      className={cn(
        'aspect-square rounded-lg flex items-center justify-center cursor-pointer',
        isSelected && 'ring-4 ring-offset-2 ring-white z-10 scale-110',
        'shadow-md',
        'bg-[hsl(var(--tile-color))]'
      )}
      style={
        {
          '--tile-color': `var(--tile-color-${tile.type})`,
        } as React.CSSProperties
      }
    >
      <Icon className="drop-shadow-lg w-full h-full flex items-center justify-center" />
    </div>
  );
});
MemoizedTile.displayName = 'MemoizedTile';

const GameBoard: FC<GameBoardProps> = ({ board, onSwap, isProcessing }) => {
  const [selectedTile, setSelectedTile] = useState<TileType | null>(null);

  const handleTileClick = (tile: TileType) => {
    if (isProcessing) return;

    if (selectedTile) {
      if (selectedTile.id !== tile.id) {
        onSwap(selectedTile, tile);
      }
      setSelectedTile(null);
    } else {
      setSelectedTile(tile);
    }
  };

  return (
    <div
      className={cn(
        'grid gap-1 p-2 bg-primary/20 rounded-xl shadow-inner max-w-lg w-full aspect-square',
        `grid-cols-${BOARD_SIZE}`
      )}
    >
      <style jsx global>{`
        :root {
          --tile-color-paw: 25 90% 80%;
          --tile-color-bone: 45 95% 80%;
          --tile-color-house: 190 85% 80%;
          --tile-color-ball: 300 80% 80%;
          --tile-color-bowl: 120 85% 80%;
        }
      `}</style>
      
      {board.map((row, rowIndex) =>
        row.map((tile, colIndex) => (
          <div key={`${rowIndex}-${colIndex}`} className="w-full h-full flex items-center justify-center bg-primary/10 rounded-lg">
            {tile && (
              <MemoizedTile
                tile={tile}
                onClick={handleTileClick}
                isSelected={!!(selectedTile && selectedTile.id === tile.id)}
              />
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default GameBoard;
