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
} from '@/lib/game-logic';
import { useToast } from '@/hooks/use-toast';
import { suggestNextLevelParams } from '@/ai/flows/suggest-next-level-params';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export default function Home() {
  const [board, setBoard] = useState<Board>(() =>
    Array(BOARD_SIZE)
      .fill(null)
      .map(() => Array(BOARD_SIZE).fill(null))
  );
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [targetScore, setTargetScore] = useState(INITIAL_TARGET_SCORE);
  const [movesLeft, setMovesLeft] = useState(INITIAL_MOVES);
  const [gameState, setGameState] = useState<GameState>('playing');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const scoreNeeded = useMemo(() => Math.max(0, targetScore - score), [targetScore, score]);

  const startNewLevel = useCallback(
    (newLevel: number, newMoves: number, newTarget: number) => {
      setLevel(newLevel);
      setMovesLeft(newMoves);
      setTargetScore(newTarget);
      setScore(0);
      setBoard(createInitialBoard());
      setGameState('playing');
    },
    []
  );

  useEffect(() => {
    startNewLevel(1, INITIAL_MOVES, INITIAL_TARGET_SCORE);
  }, [startNewLevel]);

  const processMatchesAndCascades = useCallback(
    async (currentBoard: Board): Promise<number> => {
      let totalPoints = 0;
      let boardAfterMatches = currentBoard;
      
      while (true) {
        const matches = findMatches(boardAfterMatches);
        if (matches.length === 0) {
          break;
        }

        const points = matches.length * 10 * (totalPoints > 0 ? 2 : 1);
        totalPoints += points;
        
        const newBoardWithNulls = boardAfterMatches.map(row => [...row]);
        matches.forEach(({ row, col }) => {
          newBoardWithNulls[row][col] = null;
        });
        
        setBoard(newBoardWithNulls);
        await delay(250);

        const boardAfterGravity = applyGravity(newBoardWithNulls);
        const newFilledBoard = fillEmptyTiles(boardAfterGravity);
        
        setBoard(newFilledBoard);
        await delay(250);

        boardAfterMatches = newFilledBoard;
      }
      
      return totalPoints;
    },
    []
  );

  const handleSwap = useCallback(
    async (tile1: Tile, tile2: Tile) => {
      if (isProcessing || gameState !== 'playing' || !areTilesAdjacent(tile1, tile2)) {
        return;
      }

      setIsProcessing(true);

      const newBoard = board.map((row) => [...row]);
      newBoard[tile1.row][tile1.col] = tile2;
      newBoard[tile2.row][tile2.col] = tile1;

      const tempTile1 = newBoard[tile1.row][tile1.col];
      newBoard[tile1.row][tile1.col] = { ...tempTile1, row: tile1.row, col: tile1.col };
      const tempTile2 = newBoard[tile2.row][tile2.col];
      newBoard[tile2.row][tile2.col] = { ...tempTile2, row: tile2.row, col: tile2.col };

      const matches = findMatches(newBoard);

      if (matches.length === 0) {
        setBoard(newBoard);
        await delay(200);
        setBoard(board); // Swap back
        setIsProcessing(false);
        return;
      }
      
      setMovesLeft((prev) => prev - 1);
      setBoard(newBoard);
      await delay(200);

      const points = await processMatchesAndCascades(newBoard);
      setScore((prev) => prev + points);

      setIsProcessing(false);
    },
    [board, isProcessing, gameState, processMatchesAndCascades]
  );
  
  useEffect(() => {
    if (isProcessing) return;

    if (score >= targetScore) {
      setGameState('win');
    } else if (movesLeft <= 0) {
      setGameState('lose');
    }
  }, [score, movesLeft, targetScore, isProcessing]);

  const handleRestart = useCallback(() => {
    startNewLevel(level, movesLeft > 0 ? movesLeft : INITIAL_MOVES, targetScore);
  }, [level, movesLeft, targetScore, startNewLevel]);

  const handleNextLevel = useCallback(async () => {
    setIsProcessing(true);
    try {
      toast({
        title: "Designing Next Level...",
        description: "Our AI is crafting a new challenge for you!",
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
      console.error("AI level suggestion failed:", error);
      toast({
        title: "Error",
        description: "Could not generate next level. Using default settings.",
        variant: "destructive",
      });
      // Fallback to a simple progression
      startNewLevel(
        level + 1,
        Math.max(10, INITIAL_MOVES - level),
        INITIAL_TARGET_SCORE + level * 500
      );
    } finally {
      setIsProcessing(false);
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
           <GameBoard board={board} onSwap={handleSwap} isProcessing={isProcessing} />
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
