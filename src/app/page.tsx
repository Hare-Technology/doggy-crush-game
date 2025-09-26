'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Header from '@/components/header';
import GameStats from '@/components/game-stats';
import GameBoard from '@/components/game-board';
import GameOverDialog from '@/components/game-over-dialog';
import ComboEffect from '@/components/combo-effect';
import {
  BOARD_SIZE,
  INITIAL_MOVES,
  INITIAL_TARGET_SCORE,
} from '@/lib/constants';
import type { Board, GameState, Tile } from '@/lib/types';
import {
  createInitialBoard,
  findMatches,
  applyGravity,
  fillEmptyTiles,
  areTilesAdjacent,
  checkBoardForMoves,
} from '@/lib/game-logic';
import { useToast } from '@/hooks/use-toast';
import { suggestNextLevelParams } from '@/ai/flows/suggest-next-level-params';
import { useAuth } from '@/hooks/use-auth';
import { updateUserStats } from '@/lib/firestore';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export default function Home() {
  const [board, setBoard] = useState<Board>([]);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [targetScore, setTargetScore] = useState(INITIAL_TARGET_SCORE);
  const [movesLeft, setMovesLeft] = useState(INITIAL_MOVES);
  const [gameState, setGameState] = useState<GameState>('playing');
  const [isProcessing, setIsProcessing] = useState(true);
  const [isAnimating, setIsAnimating] = useState(new Set<number>());
  const [comboMessage, setComboMessage] = useState<string>('');
  const { toast } = useToast();
  const { user } = useAuth();

  const scoreNeeded = useMemo(
    () => Math.max(0, targetScore - score),
    [targetScore, score]
  );

  useEffect(() => {
    const savedHighScore = localStorage.getItem('doggyCrushHighScore');
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore, 10));
    }
  }, []);

  const startNewLevel = useCallback(
    async (newLevel: number, newMoves: number, newTarget: number) => {
      setLevel(newLevel);
      setMovesLeft(newMoves);
      setTargetScore(newTarget);
      setScore(0);
      setGameState('playing');
      setIsProcessing(true);

      let newBoard = createInitialBoard();
      while (!checkBoardForMoves(newBoard)) {
        newBoard = createInitialBoard();
      }

      setBoard(newBoard);
      await delay(100);
      setIsProcessing(false);
    },
    []
  );

  const processMatchesAndCascades = useCallback(
    async (currentBoard: Board) => {
      let tempBoard = currentBoard;
      let cascadeCount = 1;

      while (true) {
        const matches = findMatches(tempBoard);
        if (matches.length === 0) break;

        if (cascadeCount > 1) {
          const comboText = `Combo x${cascadeCount}!`;
          setComboMessage(comboText);
          setTimeout(() => setComboMessage(''), 1500);
        }

        const points = matches.length * 10 * cascadeCount;
        setScore(prev => prev + points);

        const matchedTileIds = new Set(matches.map(t => t.id));
        setIsAnimating(prev => new Set([...prev, ...matchedTileIds]));
        await delay(300);

        let newBoardWithNulls = tempBoard.map(row =>
          row.map(tile =>
            tile && matchedTileIds.has(tile.id) ? null : tile
          )
        );
        setBoard(newBoardWithNulls);
        setIsAnimating(new Set());
        await delay(100);

        const { newBoard: boardAfterGravity } = applyGravity(newBoardWithNulls);
        setBoard(boardAfterGravity);
        await delay(300);

        const newFilledBoard = fillEmptyTiles(boardAfterGravity);
        setBoard(newFilledBoard);
        await delay(300);

        tempBoard = newFilledBoard;
        cascadeCount++;
      }
      return tempBoard;
    },
    [setIsAnimating]
  );

  useEffect(() => {
    if (board.length === 0 && typeof window !== 'undefined') {
      startNewLevel(1, INITIAL_MOVES, INITIAL_TARGET_SCORE);
    }
  }, [board.length, startNewLevel]);

  const handleSwap = useCallback(
    async (tile1: Tile, tile2: Tile) => {
      if (isProcessing || gameState !== 'playing') return;
      if (!areTilesAdjacent(tile1, tile2)) return;

      setIsProcessing(true);

      let tempBoard = board.map(r => r.map(tile => (tile ? { ...tile } : null)));
      const { row: r1, col: c1 } = tile1;
      const { row: r2, col: c2 } = tile2;

      tempBoard[r1][c1] = { ...tile2, row: r1, col: c1 };
      tempBoard[r2][c2] = { ...tile1, row: r2, col: c2 };

      setBoard(tempBoard);
      await delay(300);

      const matches = findMatches(tempBoard);
      if (matches.length === 0) {
        setBoard(board);
        await delay(300);
        setIsProcessing(false);
        return;
      }

      setMovesLeft(prev => prev - 1);
      const boardAfterMatches = await processMatchesAndCascades(tempBoard);

      let finalBoard = boardAfterMatches;
      while (!checkBoardForMoves(finalBoard)) {
        toast({ title: 'No moves left, reshuffling!' });
        await delay(500);
        let reshuffledBoard = createInitialBoard();
        setBoard(reshuffledBoard);
        await delay(300);
        finalBoard = await processMatchesAndCascades(reshuffledBoard);
      }

      setBoard(finalBoard);
      setIsProcessing(false);
    },
    [board, isProcessing, gameState, processMatchesAndCascades, toast]
  );

  const handleGameOver = useCallback(
    async (didWin: boolean) => {
      if (user && score > 0) {
        setIsProcessing(true);
        try {
          await updateUserStats({
            userId: user.uid,
            level,
            score,
            didWin,
          });
          toast({
            title: 'Score Saved!',
            description: 'Your progress has been saved to the leaderboard.',
          });
        } catch (error) {
          toast({
            title: 'Sync Error',
            description: 'Could not save your score. Please try again later.',
            variant: 'destructive',
          });
        } finally {
          setIsProcessing(false);
        }
      }
    },
    [user, level, score, toast]
  );

  useEffect(() => {
    if (isProcessing || board.length === 0) return;

    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('doggyCrushHighScore', score.toString());
    }

    if (score >= targetScore) {
      setGameState('win');
      handleGameOver(true);
    } else if (movesLeft <= 0) {
      setGameState('lose');
      handleGameOver(false);
    }
  }, [
    score,
    movesLeft,
    targetScore,
    isProcessing,
    board.length,
    highScore,
    handleGameOver,
  ]);

  const handleRestart = useCallback(() => {
    startNewLevel(level, INITIAL_MOVES, targetScore);
  }, [level, targetScore, startNewLevel]);

  const handleNextLevel = useCallback(async () => {
    setIsProcessing(true);
    try {
      toast({
        title: 'Designing Next Level...',
        description: 'Our AI is crafting a new challenge for you!',
      });

      const result = await suggestNextLevelParams({
        currentLevel: level,
        currentScore: score,
        movesRemaining: movesLeft,
      });

      startNewLevel(
        level + 1,
        result.suggestedMoves,
        result.suggestedTargetScore
      );
    } catch (error) {
      console.error('AI level suggestion failed:', error);
      toast({
        title: 'Error',
        description: 'Could not generate next level. Using default settings.',
        variant: 'destructive',
      });
      startNewLevel(
        level + 1,
        Math.max(10, INITIAL_MOVES - level),
        INITIAL_TARGET_SCORE + level * 500
      );
    }
  }, [level, score, movesLeft, startNewLevel, toast]);

  return (
    <div className="flex flex-col min-h-screen bg-background font-headline">
      <Header />
      <GameStats
        level={level}
        score={score}
        highScore={highScore}
        movesLeft={movesLeft}
        targetScore={targetScore}
      />
      <main className="flex-grow container mx-auto p-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-lg flex items-center justify-center relative">
          <GameBoard
            board={board}
            onSwap={handleSwap}
            isProcessing={isProcessing}
            isAnimating={isAnimating}
          />
          <ComboEffect message={comboMessage} />
        </div>
      </main>
      <GameOverDialog
        gameState={gameState}
        score={score}
        onNextLevel={handleNextLevel}
        onRestart={handleRestart}
        isProcessing={isProcessing}
      />
    </div>
  );
}