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
  activatePowerUp,
} from '@/lib/game-logic';
import { useToast } from '@/hooks/use-toast';
import { suggestNextLevelParams } from '@/ai/flows/suggest-next-level-params';
import { useAuth } from '@/hooks/use-auth';
import { updateUserStats } from '@/lib/firestore';
import { useSound } from '@/hooks/use-sound';

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
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [isAnimating, setIsAnimating] = useState(new Set<number>());
  const [comboMessage, setComboMessage] = useState<string>('');
  const { toast } = useToast();
  const { user } = useAuth();
  const { playSound } = useSound();
  const [coins, setCoins] = useState(0);
  const [highestCombo, setHighestCombo] = useState(0);
  const [powerUpsMade, setPowerUpsMade] = useState(0);
  const [levelStartTime, setLevelStartTime] = useState(0);
  const [levelEndTime, setLevelEndTime] = useState(0);

  const scoreNeeded = useMemo(
    () => Math.max(0, targetScore - score),
    [targetScore, score]
  );

  useEffect(() => {
    const savedHighScore = localStorage.getItem('doggyCrushHighScore');
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore, 10));
    }
    const savedCoins = localStorage.getItem('doggyCrushCoins');
    if (savedCoins) {
      setCoins(parseInt(savedCoins, 10));
    }

    const savedGame = localStorage.getItem('doggyCrushGameState');
    if (savedGame) {
      try {
        const { board, level, score, movesLeft, targetScore, coins } = JSON.parse(savedGame);
        setBoard(board);
        setLevel(level);
        setScore(score);
        setMovesLeft(movesLeft);
        setTargetScore(targetScore);
        setCoins(coins);
        setGameState('playing');
        setIsProcessing(false);
      } catch (e) {
        // If parsing fails, start a new game
        startNewLevel(1, INITIAL_MOVES, INITIAL_TARGET_SCORE);
      }
    } else {
      startNewLevel(1, INITIAL_MOVES, INITIAL_TARGET_SCORE);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('doggyCrushCoins', coins.toString());
    if (gameState === 'playing' && board.length > 0) {
      const stateToSave = JSON.stringify({
        board,
        level,
        score,
        movesLeft,
        targetScore,
        coins,
      });
      localStorage.setItem('doggyCrushGameState', stateToSave);
    } else {
      localStorage.removeItem('doggyCrushGameState');
    }
  }, [board, level, score, movesLeft, targetScore, coins, gameState]);

  const startNewLevel = useCallback(
    async (newLevel: number, newMoves: number, newTarget: number) => {
      setLevel(newLevel);
      setMovesLeft(newMoves);
      setTargetScore(newTarget);
      setScore(0);
      setGameState('playing');
      setIsProcessing(true);
      setHighestCombo(0);
      setPowerUpsMade(0);
      setLevelStartTime(Date.now());
      setLevelEndTime(0);

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
      let cascadeCount = 0;
      let totalPoints = 0;

      while (true) {
        const { matches, powerUp } = findMatches(tempBoard);
        if (matches.length === 0) break;

        cascadeCount++;
        if (cascadeCount > highestCombo) {
          setHighestCombo(cascadeCount);
        }
        if (cascadeCount > 1) {
          playSound('combo');
          const comboText = `Combo x${cascadeCount}!`;
          setComboMessage(comboText);
          setTimeout(() => setComboMessage(''), 1500);
        } else {
          playSound('match');
        }

        const points = matches.length * 10 * cascadeCount;
        totalPoints += points;

        const matchedTileIds = new Set(matches.map(t => t.id));
        setIsAnimating(prev => new Set([...prev, ...matchedTileIds]));
        await delay(300);

        let newBoardWithNulls = tempBoard.map(row =>
          row.map(tile => {
            if (!tile) return null;
            // Protect existing powerups unless they are part of the match
            if (tile.powerUp && !matchedTileIds.has(tile.id)) {
              return tile;
            }
            if (matchedTileIds.has(tile.id)) {
              return null;
            }
            return tile;
          })
        );

        if (powerUp) {
          setPowerUpsMade(prev => prev + 1);
          const { tile: powerUpTile, powerUp: powerUpType } = powerUp;
          // Find the tile on the board to turn into a power-up
          let powerupApplied = false;
          newBoardWithNulls = newBoardWithNulls.map(row =>
            row.map(t => {
              if (t && t.id === powerUpTile.id && !powerupApplied) {
                powerupApplied = true;
                return { ...t, powerUp: powerUpType };
              }
              return t;
            })
          );
        }

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
      }

      if (totalPoints > 0) {
        setScore(prev => prev + totalPoints);
      }

      return tempBoard;
    },
    [playSound, highestCombo]
  );

  const processBoardChanges = useCallback(
    async (initialBoard: Board, clearedTiles: Tile[]): Promise<Board> => {
      const clearedTileIds = new Set(clearedTiles.map(t => t.id));
      setIsAnimating(prev => new Set([...prev, ...clearedTileIds]));
      playSound('bomb');
      await delay(300);

      let boardWithNulls = initialBoard.map(row =>
        row.map(tile => {
          if (!tile) return null;
          if (tile.powerUp && !clearedTileIds.has(tile.id)) {
            return tile;
          }
          if (clearedTileIds.has(tile.id)) {
            return null;
          }
          return tile;
        })
      );
      setBoard(boardWithNulls);
      setIsAnimating(new Set());
      await delay(100);

      const { newBoard: boardAfterGravity } = applyGravity(boardWithNulls);
      setBoard(boardAfterGravity);
      await delay(300);

      const newFilledBoard = fillEmptyTiles(boardAfterGravity);
      setBoard(newFilledBoard);
      await delay(300);

      const boardAfterCascade = await processMatchesAndCascades(newFilledBoard);
      setBoard(boardAfterCascade);

      return boardAfterCascade;
    },
    [playSound, processMatchesAndCascades]
  );

  const handleSwap = useCallback(
    async (tile1: Tile, tile2: Tile) => {
      if (isProcessing || gameState !== 'playing') return;
      if (!areTilesAdjacent(tile1, tile2)) return;

      if (tile1.powerUp || tile2.powerUp) {
        setSelectedTile(null);
        setIsProcessing(false);
        return;
      }

      setIsProcessing(true);
      setMovesLeft(prev => prev - 1);

      let tempBoard = board.map(r => r.map(tile => (tile ? { ...tile } : null)));
      const { row: r1, col: c1 } = tile1;
      const { row: r2, col: c2 } = tile2;

      const landingTileForT1 = { ...tile2, row: r1, col: c1 };
      const landingTileForT2 = { ...tile1, row: r2, col: c2 };

      tempBoard[r1][c1] = landingTileForT1;
      tempBoard[r2][c2] = landingTileForT2;

      setBoard(tempBoard);
      await delay(300);

      const { matches } = findMatches(tempBoard);
      if (matches.length === 0) {
        setBoard(board);
        await delay(300);
        setIsProcessing(false);
        setMovesLeft(prev => prev + 1); // Revert move count
        return;
      }

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

  const handleTileClick = useCallback(
    async (tile: Tile) => {
      if (isProcessing || gameState !== 'playing') return;

      if (tile.powerUp) {
        setSelectedTile(null);
        setIsProcessing(true);
        let finalBoard: Board;

        if (tile.powerUp === 'bomb') {
          const { clearedTiles, randomBombTile } = activatePowerUp(board, tile);
          setScore(prev => prev + clearedTiles.length * 10);
          let boardAfterFirstExplosion = await processBoardChanges(board, [
            ...clearedTiles,
          ]);

          if (randomBombTile) {
            let tempBoardWithNewBomb = boardAfterFirstExplosion.map(row =>
              row.map(t => {
                if (t && t.id === randomBombTile.id) {
                  return { ...t, powerUp: 'bomb' as 'bomb' };
                }
                return t;
              })
            );
            setBoard(tempBoardWithNewBomb);
            await delay(0);

            const currentSecondBombTile = tempBoardWithNewBomb
              .flat()
              .find(t => t?.id === randomBombTile.id);

            if (currentSecondBombTile) {
              const { clearedTiles: secondClearedTiles } = activatePowerUp(
                tempBoardWithNewBomb,
                currentSecondBombTile
              );
              setScore(prev => prev + secondClearedTiles.length * 10);
              boardAfterFirstExplosion = await processBoardChanges(
                tempBoardWithNewBomb,
                secondClearedTiles
              );
            }
          }
          finalBoard = boardAfterFirstExplosion;
        } else if (
          tile.powerUp === 'column_clear' ||
          tile.powerUp === 'row_clear'
        ) {
          const { clearedTiles } = activatePowerUp(board, tile);
          setScore(prev => prev + clearedTiles.length * 10);
          finalBoard = await processBoardChanges(board, clearedTiles);
        } else {
          finalBoard = board;
        }

        let checkBoard = finalBoard;
        while (!checkBoardForMoves(checkBoard)) {
          toast({ title: 'No moves left, reshuffling!' });
          await delay(500);
          let reshuffledBoard = createInitialBoard();
          setBoard(reshuffledBoard);
          await delay(300);
          checkBoard = await processMatchesAndCascades(reshuffledBoard);
        }
        setBoard(checkBoard);
        setIsProcessing(false);
        return;
      }

      if (selectedTile) {
        if (selectedTile.id !== tile.id) {
          await handleSwap(selectedTile, tile);
        }
        setSelectedTile(null);
      } else {
        setSelectedTile(tile);
      }
    },
    [
      isProcessing,
      gameState,
      selectedTile,
      handleSwap,
      board,
      processBoardChanges,
      processMatchesAndCascades,
      toast,
    ]
  );

  const handleGameOver = useCallback(
    async (didWin: boolean) => {
      const endTime = Date.now();
      setLevelEndTime(endTime);
      localStorage.removeItem('doggyCrushGameState');

      if (didWin) {
        playSound('win');
        const timeTaken = Math.round((endTime - levelStartTime) / 1000); // in seconds
        const timeBonus = Math.floor(Math.max(0, 180 - timeTaken) * 0.5); // 0.5 coin per second under 3 minutes
        const moveBonus = movesLeft * 2; // 2 coins per move left
        const comboBonus = highestCombo * 10; // 10 coins per max combo
        const powerUpBonus = powerUpsMade * 15; // 15 coins per power-up created
        const coinsEarned = timeBonus + moveBonus + comboBonus + powerUpBonus;
        setCoins(prev => prev + coinsEarned);
      } else {
        playSound('lose');
        setLevel(1);
      }

      if (user && score > 0) {
        try {
          await updateUserStats({
            userId: user.uid,
            level,
            score,
            didWin,
            coins: didWin ? coins : 0, // Only save coin updates on win
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
        }
      }
    },
    [
      user,
      level,
      score,
      toast,
      playSound,
      levelStartTime,
      movesLeft,
      highestCombo,
      powerUpsMade,
      coins,
    ]
  );

  useEffect(() => {
    if (gameState !== 'playing' || board.length === 0 || isProcessing) return;

    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('doggyCrushHighScore', score.toString());
    }

    if (score >= targetScore) {
      handleGameOver(true);
      setGameState('win');
    } else if (movesLeft <= 0) {
      handleGameOver(false);
      setGameState('lose');
    }
  }, [
    score,
    movesLeft,
    targetScore,
    board.length,
    highScore,
    handleGameOver,
    gameState,
    isProcessing,
  ]);

  const handleRestart = useCallback(async () => {
    try {
      setIsProcessing(true);
      const result = await suggestNextLevelParams({
        currentLevel: level,
        currentScore: 0,
        movesRemaining: 0,
      });

      startNewLevel(
        level,
        result.suggestedMoves,
        result.suggestedTargetScore
      );
    } catch (error) {
      console.error('AI level suggestion failed:', error);
      startNewLevel(
        level,
        Math.max(10, INITIAL_MOVES - level),
        INITIAL_TARGET_SCORE + level * 500
      );
    }
  }, [startNewLevel, level]);
  
  const handleNewGame = useCallback(() => {
    startNewLevel(1, INITIAL_MOVES, INITIAL_TARGET_SCORE);
  }, [startNewLevel]);

  const handleNextLevel = useCallback(async () => {
    try {
      setIsProcessing(true);
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

  const coinBonuses = useMemo(() => {
    if (gameState !== 'win' || levelEndTime === 0) return null;
    const timeTaken = Math.round((levelEndTime - levelStartTime) / 1000);
    return {
      movesLeft: movesLeft * 2,
      highestCombo: highestCombo * 10,
      powerUpsMade: powerUpsMade * 15,
      time: Math.floor(Math.max(0, 180 - timeTaken) * 0.5),
    };
  }, [
    gameState,
    levelEndTime,
    levelStartTime,
    movesLeft,
    highestCombo,
    powerUpsMade,
  ]);

  return (
    <div className="flex flex-col min-h-screen bg-background font-headline">
      <Header />
      <GameStats
        level={level}
        score={score}
        highScore={highScore}
        movesLeft={movesLeft}
        targetScore={targetScore}
        coins={coins}
      />
      <main className="flex-grow container mx-auto p-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-lg flex items-center justify-center relative">
          <GameBoard
            board={board}
            onTileClick={handleTileClick}
            selectedTile={selectedTile}
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
        onNewGame={handleNewGame}
        isProcessing={isProcessing}
        coinBonuses={coinBonuses}
      />
    </div>
  );
}
