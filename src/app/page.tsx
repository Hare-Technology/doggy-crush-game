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
  checkBoardForMoves
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
  const [isAnimating, setIsAnimating] = useState(false);
  const { toast } = useToast();

  const scoreNeeded = useMemo(() => Math.max(0, targetScore - score), [targetScore, score]);

  const processMatchesAndCascades = useCallback(
    async (currentBoard: Board, isInitialSetup = false): Promise<number> => {
      let totalPoints = 0;
      let boardAfterMatches = currentBoard.map(row => row.map(tile => tile ? {...tile} : null));
      let cascadeCount = 1;
      
      while (true) {
        const matches = findMatches(boardAfterMatches);
        if (matches.length === 0) {
          break;
        }

        if (!isInitialSetup) {
          setIsAnimating(true);
          const points = matches.length * 10 * cascadeCount;
          setScore(prev => prev + points);
          totalPoints += points;
          cascadeCount++;
          await delay(100);
        }
        
        const newBoardWithNulls = boardAfterMatches.map(row => [...row]);
        matches.forEach(({ row, col }) => {
            newBoardWithNulls[row][col] = null;
        });

        if (!isInitialSetup) {
          setBoard(newBoardWithNulls);
          await delay(200); // Animation for tiles disappearing
        }

        const boardAfterGravity = applyGravity(newBoardWithNulls);
        
        if (!isInitialSetup) {
            setBoard(boardAfterGravity);
            await delay(200); // Animation for gravity
        }

        const newFilledBoard = fillEmptyTiles(boardAfterGravity, true);
        
        if (!isInitialSetup) {
          setBoard(newFilledBoard);
          await delay(200); // Animation for new tiles appearing
        }
        
        const finalFilledBoard = fillEmptyTiles(boardAfterGravity, false);
        boardAfterMatches = finalFilledBoard;
      }
      
      if (!isInitialSetup) {
        setIsAnimating(false);
      }
      
      return totalPoints;
    },
    []
  );

  const startNewLevel = useCallback(
    async (newLevel: number, newMoves: number, newTarget: number) => {
      setLevel(newLevel);
      setMovesLeft(newMoves);
      setTargetScore(newTarget);
      setScore(0);
      setGameState('playing');
      setIsProcessing(true);
      
      let newBoard : Board;
      do {
          newBoard = createInitialBoard();
      } while(findMatches(newBoard).length > 0 || !checkBoardForMoves(newBoard));

      setBoard(newBoard);
      
      // Check for available moves and reshuffle if none
      if (!checkBoardForMoves(newBoard)) {
        toast({ title: "No moves available, reshuffling!"});
        await delay(1000);
        startNewLevel(newLevel, newMoves, newTarget);
        return;
      }
      setIsProcessing(false);
    },
    []
  );

  useEffect(() => {
    startNewLevel(1, INITIAL_MOVES, INITIAL_TARGET_SCORE);
  }, [startNewLevel]);


  const handleSwap = useCallback(
    async (tile1: Tile, tile2: Tile) => {
      if (isProcessing || gameState !== 'playing' || !areTilesAdjacent(tile1, tile2) || isAnimating) {
        return;
      }

      setIsProcessing(true);

      const newBoard = board.map(r => [...r]);
      const { row: r1, col: c1 } = tile1;
      const { row: r2, col: c2 } = tile2;

      // Swap tiles in the board
      newBoard[r1][c1] = { ...tile2, row: r1, col: c1 };
      newBoard[r2][c2] = { ...tile1, row: r2, col: c2 };
      
      setBoard(newBoard);
      await delay(200);

      const matches = findMatches(newBoard);

      if (matches.length === 0) {
        setBoard(board); // Swap back
        await delay(200);
        setIsProcessing(false);
        return;
      }
      
      setMovesLeft((prev) => prev - 1);

      let boardAfterSwap = newBoard;
      await processMatchesAndCascades(boardAfterSwap);
      
      // This part ensures we get the final state of the board after all cascades
      let finalBoard = newBoard;
      while(true) {
        const matches = findMatches(finalBoard);
        if (matches.length === 0) break;
        
        const boardWithNulls = finalBoard.map(row => row.map(tile => tile ? {...tile, isNew: false} : null));
        matches.forEach(({ row, col }) => {
            boardWithNulls[row][col] = null;
        });

        const boardAfterGravity = applyGravity(boardWithNulls);
        finalBoard = fillEmptyTiles(boardAfterGravity);
      }
      
      setBoard(finalBoard);

      if (!checkBoardForMoves(finalBoard)) {
        toast({ title: "No moves left, reshuffling!"});
        await delay(1000);
        const currentMoves = movesLeft - 1;
        startNewLevel(level, currentMoves > 0 ? currentMoves : 0, targetScore);
      } else {
        setIsProcessing(false);
      }
    },
    [board, isProcessing, gameState, processMatchesAndCascades, level, movesLeft, targetScore, startNewLevel, toast, isAnimating]
  );
  
  useEffect(() => {
    if (isProcessing || isAnimating) return;

    if (score >= targetScore) {
      setGameState('win');
    } else if (movesLeft <= 0) {
      setGameState('lose');
    }
  }, [score, movesLeft, targetScore, isProcessing, isAnimating]);

  const handleRestart = useCallback(() => {
    startNewLevel(level, INITIAL_MOVES, targetScore);
  }, [level, targetScore, startNewLevel]);

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
      // setIsProcessing is handled by startNewLevel
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
           <GameBoard board={board} onSwap={handleSwap} isProcessing={isProcessing || isAnimating} />
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
