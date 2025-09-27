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
  HotdogIcon,
  BombIcon,
  ColumnClearIcon,
  RowClearIcon,
  RainbowIcon,
} from '@/components/dog-icons';
import { BOARD_SIZE } from '@/lib/constants';

interface GameBoardProps {
  board: Board;
  onTileClick: (tile: TileType) => void;
  selectedTile: TileType | null;
  isProcessing: boolean;
  isAnimating: Set<number>;
  isShuffling: boolean;
  hintTile: TileType | null;
}

const tileComponentMap: Record<string, React.ElementType> = {
  paw: PawIcon,
  bone: BoneIcon,
  house: DogHouseIcon,
  ball: BallIcon,
  bowl: FoodBowlIcon,
  hotdog: HotdogIcon,
};

const powerUpComponentMap: Record<string, React.ElementType> = {
  bomb: BombIcon,
  column_clear: ColumnClearIcon,
  row_clear: RowClearIcon,
  rainbow: RainbowIcon,
};

const Tile: FC<{
  tile: TileType;
  onClick: () => void;
  isSelected: boolean;
  isAnimating: boolean;
  isShuffling: boolean;
  isHint: boolean;
  hasDropped: boolean;
}> = ({ tile, onClick, isSelected, isAnimating, isShuffling, isHint, hasDropped }) => {
  const Icon = tile.powerUp
    ? powerUpComponentMap[tile.powerUp]
    : tileComponentMap[tile.type] || PawIcon;
  const top = (tile.row / BOARD_SIZE) * 100;
  const left = (tile.col / BOARD_SIZE) * 100;

  const style: React.CSSProperties = {
    top: `${top}%`,
    left: `${left}%`,
    width: `calc(${100 / BOARD_SIZE}% - 4px)`,
    height: `calc(${100 / BOARD_SIZE}% - 4px)`,
    margin: '2px',
    backgroundColor: `hsl(var(--tile-color-${tile.type}))`,
  };

  let animationClass = '';
  if (isShuffling) {
    style['--x'] = `${left}%`;
    style['--y'] = `${top}%`;
    style['--center-x'] = '50%';
    style['--center-y'] = '50%';
    style['--delay'] = `${Math.random() * 0.3}s`;
    animationClass = 'animate-shuffle';
  } else if (isAnimating) {
    animationClass = 'animate-pop';
  } else if (!hasDropped) {
    // Only apply drop-in animation if it hasn't dropped before
    const delay = (BOARD_SIZE - tile.row - 1) * 0.05 + tile.col * 0.02;
    style['--delay'] = `${delay}s`;
    animationClass = 'animate-drop-in';
  } else {
     // Normal transition for swaps and gravity
     style.transition = 'top 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)';
  }


  return (
    <div
      onClick={onClick}
      className={cn(
        'absolute rounded-lg flex items-center justify-center cursor-pointer',
        'shadow-md',
        animationClass,
        isSelected && 'ring-4 ring-offset-2 ring-white z-10 scale-110',
        isHint && !isSelected && 'animate-flash',
        tile.powerUp && !isShuffling && 'animate-pulse'
      )}
      style={style}
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
  isShuffling,
  hintTile,
}) => {
  const handleTileClick = (tile: TileType) => {
    if (isProcessing) return;
    onTileClick(tile);
  };

  const allTiles = board.flat().filter(Boolean) as TileType[];
  const prevTileIds = React.useRef(new Set<number>());

  React.useEffect(() => {
    // Store current tile IDs to compare on next render
    prevTileIds.current = new Set(allTiles.map(t => t.id));
  }, [allTiles]);


  return (
    <div
      className={cn(
        'relative bg-primary/20 rounded-xl shadow-inner max-w-lg w-full aspect-square overflow-hidden'
      )}
    >
      <style jsx global>{`
        :root {
          --tile-color-paw: 35 90% 80%;
          --tile-color-bone: 200 85% 80%;
          --tile-color-house: 100 85% 80%;
          --tile-color-ball: 300 80% 80%;
          --tile-color-bowl: 0 85% 80%;
          --tile-color-hotdog: 30 90% 75%;
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
          animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
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
          isShuffling={isShuffling}
          isHint={!!(hintTile && hintTile.id === tile.id)}
          hasDropped={prevTileIds.current.has(tile.id)}
        />
      ))}
    </div>
  );
};

export default GameBoard;
