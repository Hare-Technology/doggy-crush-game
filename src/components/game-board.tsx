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
  tileSize: number;
  tileGap: number;
}> = memo(({ tile, onClick, isSelected, tileSize, tileGap }) => {
  const Icon = tileComponentMap[tile.type] || PawIcon;
  const size = tileSize - tileGap;
  const offset = tileGap / 2;

  return (
    <div
      onClick={() => onClick(tile)}
      className={cn(
        'absolute aspect-square rounded-lg flex items-center justify-center cursor-pointer transition-all duration-300',
        'transform-gpu',
        isSelected && 'ring-4 ring-offset-2 ring-white z-10',
        'shadow-md',
        tile.isNew && 'animate-drop-in',
        'bg-[hsl(var(--tile-color))]'
      )}
      style={
        {
          '--tile-color': `var(--tile-color-${tile.type})`,
          width: `${size}px`,
          height: `${size}px`,
          top: `${tile.row * tileSize + offset}px`,
          left: `${tile.col * tileSize + offset}px`,
          transition: 'top 0.2s ease-out, left 0.2s ease-out',
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
  const [containerSize, setContainerSize] = useState(500);
  
  const tileGap = 4; // The gap in pixels
  const tileSize = containerSize / BOARD_SIZE;
  const gridCellSize = tileSize - tileGap;
  const gridOffset = tileGap / 2;


  const boardRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      const resizeObserver = new ResizeObserver(() => {
        // We subtract the padding from the offsetWidth to get the inner size
        const padding = 16; // p-4 = 1rem = 16px
        setContainerSize(node.offsetWidth - padding);
      });
      resizeObserver.observe(node);
      return () => resizeObserver.disconnect();
    }
  }, []);

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

  const flattenedBoard = board.flat().filter((tile): tile is TileType => tile !== null);

  return (
    <div
      ref={boardRef}
      className={cn(
        'relative p-2 bg-primary/20 rounded-xl shadow-inner max-w-lg w-full aspect-square'
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
      
      {/* Background grid */}
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
        {Array.from({ length: BOARD_SIZE * BOARD_SIZE }).map((_, i) => (
          <div key={i} className="w-full h-full flex items-center justify-center">
            <div 
              className="bg-primary/10 rounded-lg"
              style={{
                width: `${gridCellSize}px`,
                height: `${gridCellSize}px`,
              }}
            />
          </div>
        ))}
      </div>

      {/* Tiles */}
      <div className="absolute top-2 left-2 right-2 bottom-2">
        {flattenedBoard.map((tile) => (
            <MemoizedTile
              key={tile.id}
              tile={tile}
              onClick={handleTileClick}
              isSelected={!!(selectedTile && tile && selectedTile.id === tile.id)}
              tileSize={tileSize}
              tileGap={tileGap}
            />
        ))}
      </div>
    </div>
  );
};

export default GameBoard;
