'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, PartyPopper, Frown } from 'lucide-react';
import type { GameState } from '@/lib/types';
import { addScore } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';

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
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const isOpen = gameState === 'win' || gameState === 'lose';

  const handleActionClick = () => {
    if (gameState === 'win') {
      onNextLevel();
    } else {
      onRestart();
    }
    // Reset state for next game
    setName('');
    setScoreSubmitted(false);
  };

  const handleSubmitScore = async () => {
    if (!name.trim()) {
      toast({
        title: 'Please enter your name',
        variant: 'destructive',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await addScore(name, score);
      setScoreSubmitted(true);
      toast({
        title: 'Score Submitted!',
        description: 'Check out your ranking on the leaderboard.',
      });
      setTimeout(() => {
        router.push('/leaderboard');
      }, 1000);
    } catch (error) {
      console.error('Failed to submit score', error);
      toast({
        title: 'Submission Failed',
        description: 'Could not save your score. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const showSubmitForm =
    gameState === 'lose' && score > 0 && !scoreSubmitted;

  return (
    <AlertDialog open={isOpen} onOpenChange={() => {
      if (isOpen) {
        // Reset local component state when dialog is about to close
        setName('');
        setScoreSubmitted(false);
      }
    }}>
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

        {showSubmitForm && (
          <div className="flex flex-col gap-4 pt-4">
            <p className="text-center text-sm font-medium">
              Add your score to the leaderboard!
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Enter your name"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={isSubmitting}
                maxLength={20}
              />
              <Button onClick={handleSubmitScore} disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  'Submit'
                )}
              </Button>
            </div>
          </div>
        )}

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
