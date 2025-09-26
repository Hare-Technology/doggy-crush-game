'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Header from '@/components/header';
import GameSidebar from '@/components/game-sidebar';
import GameBoard from '@/components/game-board';
import GameOverDialog from '@/components/game-over-dialog';
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

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export default function Home() {
  const [board, setBoard] = useState<Board>([]);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [targetScore, setTargetScore] = useState(INITIAL_TARGET_SCORE);
  const [movesLeft, setMovesLeft] = useState(INITIAL_MOVES);
  const [gameState, setGameState] = useState<GameState>('playing');
  const [isProcessing, setIsProcessing] = useState(true);
  const [isAnimating, setIsAnimating] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const scoreNeeded = useMemo(
    () => Math.max(0, targetScore - score),
    [targetScore, score]
  );

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
        toast({ title: 'No moves available, reshuffling!' });
        newBoard = createInitialBoard();
      }

      setBoard(newBoard);
      await delay(100);
      setIsProcessing(false);
    },
    [toast]
  );

  const processMatchesAndCascades = useCallback(
    async (currentBoard: Board) => {
      let tempBoard = currentBoard;
      let cascadeCount = 1;

      while (true) {
        const matches = findMatches(tempBoard);
        if (matches.length === 0) break;

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
    []
  );

  useEffect(() => {
    // Generate the initial board on the client side to avoid hydration errors
    if (board.length === 0) {
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
        // No match, swap back
        setBoard(board);
        await delay(300);
        setIsProcessing(false);
        return;
      }
      
      setMovesLeft(prev => prev - 1);
      const boardAfterMatches = await processMatchesAndCascades(tempBoard);
      
      let finalBoard = boardAfterMatches;
      while (!checkBoardForMoves(finalBoard)) {
        toast({ title: "No moves left, reshuffling!"});
        await delay(500);
        let reshuffledBoard = createInitialBoard();
        setBoard(reshuffledBoard);
        finalBoard = await processMatchesAndCascades(reshuffledBoard);
      }
      
      setBoard(finalBoard);
      setIsProcessing(false);
    },
    [board, isProcessing, gameState, processMatchesAndCascades, toast]
  );

  useEffect(() => {
    if (isProcessing || board.length === 0) return;

    if (score >= targetScore) {
      setGameState('win');
    } else if (movesLeft <= 0) {
      setGameState('lose');
    }
  }, [score, movesLeft, targetScore, isProcessing, board.length]);

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
      // Fallback to a simple progression
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
      <main className="flex-grow container mx-auto p-4 flex flex-col lg:flex-row items-start gap-8">
        <GameSidebar
          level={level}
          score={score}
          scoreNeeded={scoreNeeded}
          movesLeft={movesLeft}
          targetScore={targetScore}
        />
        <div className="w-full lg:w-auto flex-grow flex items-center justify-center">
          <GameBoard
            board={board}
            onSwap={handleSwap}
            isProcessing={isProcessing}
            isAnimating={isAnimating}
          />
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
