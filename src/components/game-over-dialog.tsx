'use client';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loader2, PartyPopper, Frown, RefreshCw, Coins, Star, Zap, GaugeCircle, Repeat } from 'lucide-react';
import type { GameState } from '@/lib/types';
import { useSound } from '@/hooks/use-sound';

interface GameOverDialogProps {
  gameState: GameState;
  score: number;
  onNextLevel: () => void;
  onNewGame: () => void;
  isProcessing: boolean;
  coinBonuses: {
    movesLeft: number;
    highestCombo: number;
    powerUpsMade: number;
    time: number;
  } | null;
  coins: number;
  canBuyContinue: boolean;
  onBuyExtraMoves: () => void;
  onRestart: () => void;
}

export default function GameOverDialog({
  gameState,
  score,
  onNextLevel,
  onNewGame,
  isProcessing,
  coinBonuses,
  coins,
  canBuyContinue,
  onBuyExtraMoves,
  onRestart,
}: GameOverDialogProps) {
  const isOpen = gameState === 'win' || gameState === 'lose';
  const { playSound } = useSound();

  const handleNextLevelClick = () => {
    playSound('click');
    onNextLevel();
  };
  const handleNewGameClick = () => {
    playSound('click');
    onNewGame();
  }
  const handleBuyMovesClick = () => {
      playSound('click');
      onBuyExtraMoves();
  }
    
  const totalCoins = coinBonuses ? Object.values(coinBonuses).reduce((a, b) => a + b, 0) : 0;
  const showContinue = gameState === 'lose' && canBuyContinue && coins >= 500;

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center justify-center text-3xl gap-4">
            {gameState === 'win' ? (
              <>
                <PartyPopper className="w-10 h-10 text-yellow-400" />
                You Win!
              </>
            ) : (
              <>
                <Frown className="w-10 h-10 text-blue-400" />
                Game Over
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-lg">
            {gameState === 'lose' && !showContinue && "Better luck next time. "}
            Your final score was:{' '}
            <span className="font-bold text-foreground">
              {score.toLocaleString()}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {gameState === 'win' && coinBonuses && (
          <div className="flex flex-col gap-2 my-4">
            <div className="flex justify-between items-center text-lg font-semibold border-b pb-2 mb-2">
                <span>Total Coins Earned</span>
                <span className="flex items-center gap-1">
                    {totalCoins.toLocaleString()}
                    <Coins className="w-5 h-5 text-yellow-500" />
                </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2 text-muted-foreground"><Star className="w-4 h-4" /> Combo Bonus</span>
              <span className="font-mono">{coinBonuses.highestCombo.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2 text-muted-foreground"><Zap className="w-4 h-4" /> Power-up Bonus</span>
              <span className="font-mono">{coinBonuses.powerUpsMade.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2 text-muted-foreground"><RefreshCw className="w-4 h-4" /> Moves Left Bonus</span>
              <span className="font-mono">{coinBonuses.movesLeft.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2 text-muted-foreground"><GaugeCircle className="w-4 h-4" /> Time Bonus</span>
              <span className="font-mono">{coinBonuses.time.toLocaleString()}</span>
            </div>
          </div>
        )}

        <AlertDialogFooter className="sm:justify-center pt-4 sm:flex-col sm:gap-2">
          {gameState === 'win' && (
            <>
              <Button
                onClick={handleNextLevelClick}
                disabled={isProcessing}
                size="lg"
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  'Next Level'
                )}
              </Button>
            </>
          )}
          {gameState === 'lose' && (
            <>
              {showContinue && (
                <Button
                    onClick={handleBuyMovesClick}
                    disabled={isProcessing || coins < 500}
                    size="lg"
                    className="bg-green-500 hover:bg-green-600"
                >
                   {isProcessing ? (
                     <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                   ) : (
                    <>
                     Continue? (+5 moves)
                     <Coins className="w-4 h-4 ml-2" /> 500
                    </>
                   )}
                </Button>
              )}
               <Button
                onClick={handleNewGameClick}
                disabled={isProcessing}
                size="lg"
                variant="outline"
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                   'New Game'
                )}
              </Button>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
