'use client';

import type { FC } from 'react';
import { memo, useState } from 'react';
import type { Board, Tile as TileType } from '@/lib/types';
import { TILE_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface GameBoardProps {
  board: Board;
  onSwap: (tile1: TileType, tile2: TileType) => void;
  isProcessing: boolean;
}

const tileEmojiMap: Record<string, string> = {
  paw: '🐾',
  bone: '🐕',
  house: '🐩',
  ball: '🦮',
  bowl: '🐶',
};

const MemoizedTile: FC<{ tile: TileType | null; onDragStart: (tile: TileType) => void; onDrop: (tile: TileType) => void }> = memo(({ tile, onDragStart, onDrop }) => {
  if (!tile) {
    return (
      <div className="w-full h-full aspect-square rounded-lg bg-primary/10" />
    );
  }

  const emoji = tileEmojiMap[tile.type] || '❓';
  const color = TILE_COLORS[tile.type as keyof typeof TILE_COLORS] || '240 10% 3.9%';

  return (
    <div
      key={tile.id}
      draggable
      onDragStart={() => onDragStart(tile)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDrop(tile)}
      onDragEnd={(e) => e.currentTarget.classList.remove('opacity-50')}
      className={cn(
        'w-full h-full aspect-square rounded-lg flex items-center justify-center cursor-grab active:cursor-grabbing transition-all duration-300',
        'transform-gpu hover:scale-105 active:scale-95',
        'shadow-md hover:shadow-lg',
        'bg-[hsl(var(--tile-color))]'
      )}
      style={{
        transform: tile ? 'scale(1)' : 'scale(0)',
        '--tile-color': color,
      } as React.CSSProperties}
    >
      <span className="text-4xl lg:text-5xl drop-shadow-lg">{emoji}</span>
    </div>
  );
});
MemoizedTile.displayName = 'MemoizedTile';


const GameBoard: FC<GameBoardProps> = ({ board, onSwap, isProcessing }) => {
  const [draggedTile, setDraggedTile] = useState<TileType | null>(null);

  const handleDragStart = (tile: TileType) => {
    setDraggedTile(tile);
  };

  const handleDrop = (targetTile: TileType) => {
    if (draggedTile) {
      onSwap(draggedTile, targetTile);
    }
    setDraggedTile(null);
  };

  return (
    <div
      className={cn(
        'relative grid grid-cols-8 grid-rows-8 gap-1 p-2 bg-primary/20 rounded-xl shadow-inner max-w-lg w-full aspect-square',
        isProcessing && 'pointer-events-none'
      )}
    >
      {board.map((row, rowIndex) =>
        row.map((tile, colIndex) => (
          <MemoizedTile
            key={`${rowIndex}-${colIndex}-${tile?.id}`}
            tile={tile}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
          />
        ))
      )}
      {isProcessing && (
        <div className="absolute inset-0 bg-background/30 backdrop-blur-sm flex items-center justify-center rounded-xl z-10">
           {/* Optional: Add a spinner here */}
        </div>
      )}
    </div>
  );
};

export default GameBoard;
