'use client';

import type { FC } from 'react';
import { memo, useState } from 'react';
import type { Board, Tile as TileType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { PawIcon, BoneIcon, DogHouseIcon, BallIcon, FoodBowlIcon } from '@/components/dog-icons';

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
  tile: TileType | null;
  onClick: (tile: TileType) => void;
  isSelected: boolean;
}> = memo(({ tile, onClick, isSelected }) => {
  if (!tile) {
    return (
      <div className="w-full h-full aspect-square rounded-lg bg-primary/10" />
    );
  }

  const Icon = tileComponentMap[tile.type] || PawIcon;

  return (
    <div
      key={tile.id}
      onClick={() => onClick(tile)}
      className={cn(
        'w-full h-full aspect-square rounded-lg flex items-center justify-center cursor-pointer transition-all duration-300',
        'transform-gpu hover:scale-105 active:scale-95',
        'shadow-md hover:shadow-lg',
        'bg-[hsl(var(--tile-color))]',
        isSelected && 'ring-4 ring-offset-2 ring-white'
      )}
      style={
        {
          transform: tile ? 'scale(1)' : 'scale(0)',
          '--tile-color': `var(--tile-color-${tile.type})`,
        } as React.CSSProperties
      }
    >
      <Icon className="w-8 h-8 lg:w-10 lg:h-10 drop-shadow-lg" />
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
        'relative grid grid-cols-8 grid-rows-8 gap-1 p-2 bg-primary/20 rounded-xl shadow-inner max-w-lg w-full aspect-square',
        isProcessing && 'pointer-events-none'
      )}
    >
      <style jsx global>{`
        :root {
          --tile-color-paw: 25 80% 80%;
          --tile-color-bone: 45 85% 80%;
          --tile-color-house: 190 75% 80%;
          --tile-color-ball: 300 70% 80%;
          --tile-color-bowl: 120 75% 80%;
        }
      `}</style>
      {board.map((row, rowIndex) =>
        row.map((tile) => (
          <MemoizedTile
            key={`${rowIndex}-${tile?.col}-${tile?.id}`}
            tile={tile}
            onClick={handleTileClick}
            isSelected={!!(selectedTile && tile && selectedTile.id === tile.id)}
          />
        ))
      )}
    </div>
  );
};

export default GameBoard;
