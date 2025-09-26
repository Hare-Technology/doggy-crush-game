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
import { Loader2, PartyPopper, Frown } from 'lucide-react';
import type { GameState } from '@/lib/types';

interface GameOverDialogProps {
  gameState: GameState;
  score: number;
  onNextLevel: () => void;
  onRestart: () => void;
  isProcessing: boolean;
}

export default function GameOverDialog({
  gameState,
  score,
  onNextLevel,
  onRestart,
  isProcessing,
}: GameOverDialogProps) {
  const isOpen = gameState === 'win' || gameState === 'lose';

  const handleActionClick = () => {
    if (gameState === 'win') {
      onNextLevel();
    } else {
      onRestart();
    }
  };

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
                Out of Moves
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-lg">
            Your final score was:{' '}
            <span className="font-bold text-foreground">
              {score.toLocaleString()}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="sm:justify-center pt-4">
          {gameState === 'win' && (
            <Button
              onClick={handleActionClick}
              disabled={isProcessing}
              size="lg"
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                'Next Level'
              )}
            </Button>
          )}
          {gameState === 'lose' && (
            <Button
              onClick={handleActionClick}
              disabled={isProcessing}
              size="lg"
            >
              Try Again
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
