
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Header from '@/components/header';
import GameStats from '@/components/game-stats';
import GameBoard from '@/components/game-board';
import GameOverDialog from '@/components/game-over-dialog';
import ComboEffect from '@/components/combo-effect';
import PowerUpShop from '@/components/power-up-shop';
import {
  BOARD_SIZE,
  INITIAL_MOVES,
  INITIAL_TARGET_SCORE,
} from '@/lib/constants';
import type { Board, GameState, Tile, PowerUpType } from '@/lib/types';
import {
  createInitialBoard,
  findMatches,
  applyGravity,
  fillEmptyTiles,
  areTilesAdjacent,
  checkBoardForMoves,
  activatePowerUp,
  resetTileIdCounter,
  setTileIdCounter,
  tileIdCounter,
  findHint,
} from '@/lib/game-logic';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import {
  updateUserStats,
  getUserData,
  saveGameState,
  loadGameState,
} from '@/lib/firestore';
import { useSound } from '@/hooks/use-sound';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export default function Home() {
  const [board, setBoard] = useState<Board>([]);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [targetScore, setTargetScore] = useState(INITIAL_TARGET_SCORE);
  const [movesLeft, setMovesLeft] = useState(INITIAL_MOVES);
  const [purchasedMoves, setPurchasedMoves] = useState(0);
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
  const [isShuffling, setIsShuffling] = useState(false);
  const [hintTile, setHintTile] = useState<Tile | null>(null);
  const hintTimer = useRef<NodeJS.Timeout | null>(null);
  const [winStreak, setWinStreak] = useState(0);
  const [canBuyContinue, setCanBuyContinue] = useState(true);
  const [pendingRainbowPurchase, setPendingRainbowPurchase] = useState(false);
  const [difficultyRating, setDifficultyRating] = useState(1.0);

  const scoreNeeded = useMemo(
    () => Math.max(0, targetScore - score),
    [targetScore, score]
  );

  const resetHintTimer = useCallback(() => {
    if (hintTimer.current) {
      clearTimeout(hintTimer.current);
    }
    setHintTile(null);
    hintTimer.current = setTimeout(() => {
      if (gameState === 'playing' && !isProcessing) {
        const hint = findHint(board);
        setHintTile(hint);
      }
    }, 10000);
  }, [board, gameState, isProcessing]);

  useEffect(() => {
    if (gameState === 'playing' && !isProcessing) {
      resetHintTimer();
    }
    return () => {
      if (hintTimer.current) {
        clearTimeout(hintTimer.current);
      }
    };
  }, [gameState, isProcessing, resetHintTimer]);

  const startNewLevel = useCallback(
    (newLevel: number, newTarget: number, newMoves: number) => {
      resetTileIdCounter();
      setLevel(newLevel);
      setMovesLeft(newMoves);
      setPurchasedMoves(0);
      setTargetScore(newTarget);
      setScore(0);
      setGameState('playing');
      setIsProcessing(true);
      setHighestCombo(0);
      setPowerUpsMade(0);
      setLevelStartTime(Date.now());
      setLevelEndTime(0);
      setIsShuffling(true);
      setCanBuyContinue(true);
      setPendingRainbowPurchase(false);


      if (
        newLevel === 1 &&
        newMoves === INITIAL_MOVES &&
        newTarget === INITIAL_TARGET_SCORE
      ) {
        // Clear local storage for new game start, cloud state handled separately
        localStorage.removeItem('doggyCrushGameState');
        if (user) {
          saveGameState(user.uid, null); // Clear cloud state
        }
        setWinStreak(0);
        // Reset difficulty for a brand new game
        setDifficultyRating(1.0);
        if (!user) {
          localStorage.setItem('doggyCrushDifficulty', '1.0');
        }
      }

      let newBoard: Board;
      do {
        newBoard = createInitialBoard();
      } while (!checkBoardForMoves(newBoard));

      setBoard(newBoard);
      const doShuffle = async () => {
        await delay(1000); // Wait for shuffle animation
        setIsShuffling(false);
        setIsProcessing(false);
      };
      doShuffle();
    },
    [user]
  );

  const loadGame = useCallback(async () => {
    let userCoins = 0;
    let userDifficulty = 1.0;
    let loadedFromCloud = false;
    let userHighScore = 0;

    if (user) {
      const cloudGameState = await loadGameState(user.uid);
      const userData = await getUserData(user.uid);
      setCoins(userData.coins);
      setDifficultyRating(userData.difficultyRating);
      userHighScore = userData.totalScore;
      setHighScore(userHighScore);


      if (cloudGameState) {
        try {
          setBoard(cloudGameState.board);
          setLevel(cloudGameState.level);
          setScore(cloudGameState.score);
          setMovesLeft(cloudGameState.movesLeft);
          setTargetScore(cloudGameState.targetScore);
          setPurchasedMoves(cloudGameState.purchasedMoves || 0);
          if (typeof cloudGameState.idCounter === 'number') {
            setTileIdCounter(cloudGameState.idCounter);
          }
          if (typeof cloudGameState.winStreak === 'number') {
            setWinStreak(cloudGameState.winStreak);
          }
          setDifficultyRating(cloudGameState.difficultyRating || 1.0);
          
          setGameState('playing');
          setIsProcessing(false);
          loadedFromCloud = true;
        } catch (e) {
            console.error("Failed to load cloud game state", e);
            // Fallback to new game
        }
      }
    } else {
      // Guest user logic
      const localCoins = localStorage.getItem('doggyCrushCoins');
      userCoins = localCoins ? parseInt(localCoins, 10) : 0;
      const localDifficulty = localStorage.getItem('doggyCrushDifficulty');
      userDifficulty = localDifficulty ? parseFloat(localDifficulty) : 1.0;
      const localHighScore = localStorage.getItem('doggyCrushHighScore');
      userHighScore = localHighScore ? parseInt(localHighScore, 10) : 0;
      setCoins(userCoins);
      setDifficultyRating(userDifficulty);
      setHighScore(userHighScore);
    }
    
    if (loadedFromCloud) return;

    const savedGame = localStorage.getItem('doggyCrushGameState');
    if (savedGame && !user) { // Only load from local if not logged in
      try {
        const {
          board,
          level,
          score,
          movesLeft,
          targetScore,
          idCounter,
          coins: savedCoins,
          winStreak: savedWinStreak,
          purchasedMoves: savedPurchasedMoves,
          difficultyRating: savedDifficulty,
        } = JSON.parse(savedGame);

        setBoard(board);
        setLevel(level);
        setScore(score);
        setMovesLeft(movesLeft);
        setTargetScore(targetScore);
        setPurchasedMoves(savedPurchasedMoves || 0);
        if (typeof idCounter === 'number') {
          setTileIdCounter(idCounter);
        }
        if (typeof savedWinStreak === 'number') {
          setWinStreak(savedWinStreak);
        }
        setCoins(savedCoins || 0);
        setDifficultyRating(savedDifficulty || 1.0);
        setGameState('playing');
        setIsProcessing(false);
      } catch (e) {
        startNewLevel(1, INITIAL_TARGET_SCORE, INITIAL_MOVES);
      }
    } else {
      startNewLevel(1, INITIAL_TARGET_SCORE, INITIAL_MOVES);
    }
  }, [user, startNewLevel]);

  useEffect(() => {
    loadGame();
  }, [loadGame]);

  useEffect(() => {
    if (gameState === 'playing' && board.length > 0 && !isProcessing) {
      const stateToSave = {
        board,
        level,
        score,
        movesLeft,
        targetScore,
        idCounter: tileIdCounter,
        winStreak,
        purchasedMoves,
        difficultyRating,
        coins, // only for local
      };
      if (user) {
        saveGameState(user.uid, stateToSave);
      } else {
        localStorage.setItem('doggyCrushGameState', JSON.stringify(stateToSave));
      }
    }
  }, [
    board,
    level,
    score,
    movesLeft,
    targetScore,
    gameState,
    coins,
    winStreak,
    purchasedMoves,
    difficultyRating,
    user,
    isProcessing,
  ]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem('doggyCrushCoins', coins.toString());
      localStorage.setItem('doggyCrushDifficulty', difficultyRating.toString());
      localStorage.setItem('doggyCrushHighScore', highScore.toString());
    }
  }, [coins, difficultyRating, highScore, user]);


  const processMatchesAndCascades = useCallback(
    async (currentBoard: Board) => {
      let tempBoard = currentBoard;
      let cascadeCount = 0;
      let totalPoints = 0;
      let localPowerUpsMade = 0;

      while (true) {
        const { matches, powerUps } = findMatches(tempBoard);
        if (matches.length === 0) break;

        cascadeCount++;
        setHighestCombo(prev => Math.max(prev, cascadeCount));

        if (cascadeCount > 1) {
          playSound('combo');
          const comboText = `Combo x${cascadeCount}!`;
          setComboMessage(comboText);
          setTimeout(() => setComboMessage(''), 1900);
        } else {
          playSound('match');
        }

        const points = matches.length * 10 * cascadeCount * cascadeCount;
        totalPoints += points;

        let boardWithPowerups = tempBoard.map(row =>
          row.map(tile => (tile ? { ...tile } : null))
        );
        if (powerUps.length > 0) {
          localPowerUpsMade += powerUps.length;
          powerUps.forEach(p => {
            const { row, col } = p.tile;
            if (boardWithPowerups[row][col]) {
              boardWithPowerups[row][col] = p.tile;
              boardWithPowerups[row][col]!.powerUp = p.powerUp;
            }
          });
        }

        const matchedTileIds = new Set(matches.map(t => t.id));
        setIsAnimating(prev => new Set([...prev, ...matchedTileIds]));
        await delay(500);

        let newBoardWithNulls = tempBoard.map(row =>
          row.map(tile => {
            if (!tile) return null;
            if (matchedTileIds.has(tile.id)) {
              return null;
            }
            // Preserve powerups that were just created in the same move
            const powerUpHere = powerUps.find(p => p.tile.row === tile.row && p.tile.col === tile.col);
            if(powerUpHere) {
                return {...powerUpHere.tile, powerUp: powerUpHere.powerUp};
            }
            return tile;
          })
        );

        setIsAnimating(new Set());

        let boardWithNewTiles = fillEmptyTiles(newBoardWithNulls);
        const { newBoard: boardAfterGravity } = applyGravity(boardWithNewTiles);

        setBoard(boardAfterGravity);
        await delay(700);

        tempBoard = boardAfterGravity;
      }

      if (totalPoints > 0) {
        setScore(prev => prev + totalPoints);
      }
      if (localPowerUpsMade > 0) {
        setPowerUpsMade(prev => prev + localPowerUpsMade);
      }

      return tempBoard;
    },
    [playSound]
  );

  const processBoardChanges = useCallback(
    async (
      initialBoard: Board,
      clearedTiles: Tile[]
    ): Promise<Board> => {
      const clearedTileIds = new Set(clearedTiles.map(t => t.id));
      setIsAnimating(prev => new Set([...prev, ...clearedTileIds]));
      playSound('bomb');
      await delay(500);

      let boardWithNulls = initialBoard.map(row =>
        row.map(tile => {
          if (!tile) return null;
          // If a tile is in the cleared set, it must be removed.
          if (clearedTileIds.has(tile.id)) {
            return null;
          }
          return tile;
        })
      );
      
      setIsAnimating(new Set());

      let boardWithNewTiles = fillEmptyTiles(boardWithNulls);

      const { newBoard: boardAfterGravity } = applyGravity(boardWithNewTiles);

      setBoard(boardAfterGravity);
      await delay(700);

      const boardAfterCascade = await processMatchesAndCascades(
        boardAfterGravity
      );
      setBoard(boardAfterCascade);

      return boardAfterCascade;
    },
    [playSound, processMatchesAndCascades]
  );
  
  const handleBombChainReaction = useCallback(
    async (boardAfterPrimary: Board) => {
      let tempBoard = boardAfterPrimary.map(r => r.map(t => t ? {...t} : null));

      // Find a random empty spot to spawn the new bomb
      const emptyCells: { row: number; col: number }[] = [];
      tempBoard.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (!cell) {
            emptyCells.push({ row: r, col: c });
          }
        });
      });

      if (emptyCells.length === 0) return tempBoard;

      const spawnLocation = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      
      const newBombId = tileIdCounter + 1000;
      setTileIdCounter(newBombId + 1);

      tempBoard[spawnLocation.row][spawnLocation.col] = {
        id: newBombId,
        type: 'paw', // placeholder
        row: spawnLocation.row,
        col: spawnLocation.col,
        powerUp: 'bomb',
      };
      
      setBoard(tempBoard);
      await delay(250); // Fuse time

      const { clearedTiles: secondaryCleared } = activatePowerUp(
        tempBoard,
        tempBoard[spawnLocation.row][spawnLocation.col]!,
        undefined,
        false // This is NOT a primary activation
      );
      setScore(prev => prev + secondaryCleared.length * 10);
      const finalBoard = await processBoardChanges(tempBoard, secondaryCleared);
      return finalBoard;
    },
    [processBoardChanges]
  );


  const handleRegularSwap = useCallback(
    async (tile1: Tile, tile2: Tile) => {
      setIsProcessing(true);

      let tempBoard = board.map(r => r.map(tile => (tile ? { ...tile } : null)));
      const { row: r1, col: c1 } = tile1;
      const { row: r2, col: c2 } = tile2;

      const landingTileForT1 = { ...tile2, row: r1, col: c1 };
      const landingTileForT2 = { ...tile1, row: r2, col: c2 };

      tempBoard[r1][c1] = landingTileForT1;
      tempBoard[r2][c2] = landingTileForT2;

      setBoard(tempBoard);
      await delay(500);

      const { matches, powerUps } = findMatches(tempBoard);
      if (matches.length === 0 && powerUps.length === 0) {
        setBoard(board); // Swap back
        await delay(500);
        setIsProcessing(false);
        return; // Do not decrement moves
      }

      setMovesLeft(prev => prev - 1); // Decrement moves only on a valid swap

      const boardAfterMatches = await processMatchesAndCascades(tempBoard);

      let finalBoard = boardAfterMatches;
      while (!checkBoardForMoves(finalBoard)) {
        toast({ title: 'No moves left, reshuffling!' });
        await delay(700);
        setIsShuffling(true);
        let reshuffledBoard = createInitialBoard();
        setBoard(reshuffledBoard);
        await delay(1000);
        setIsShuffling(false);
        finalBoard = await processMatchesAndCascades(reshuffledBoard);
      }
      setBoard(finalBoard);
      setIsProcessing(false);
    },
    [board, processMatchesAndCascades, toast]
  );

  const handleTileClick = useCallback(
    async (tile: Tile) => {
      if (isProcessing || gameState !== 'playing') return;
  
      resetHintTimer();
  
      if (pendingRainbowPurchase) {
        if (tile.powerUp) {
          toast({
            title: 'Invalid Target',
            description: 'Cannot target a power-up tile.',
            variant: 'destructive',
          });
          return;
        }
  
        setIsProcessing(true);
        setPendingRainbowPurchase(false);
        setCoins(prev => prev - 300);
  
        toast({
          title: 'Power-up Activated!',
          description: `Rainbow cleared all ${tile.type}s.`,
        });
        
        // Create a temporary rainbow tile to activate
        const rainbowTile: Tile = { ...tile, powerUp: 'rainbow' };
  
        const { clearedTiles } = activatePowerUp(board, rainbowTile, tile.type);
        setScore(prev => prev + clearedTiles.length * 10);
        let currentBoard = await processBoardChanges(board, clearedTiles);
  
        while (!checkBoardForMoves(currentBoard)) {
          toast({ title: 'No moves left, reshuffling!' });
          await delay(700);
          setIsShuffling(true);
          let reshuffledBoard = createInitialBoard();
          setBoard(reshuffledBoard);
          await delay(1000);
          setIsShuffling(false);
          currentBoard = await processMatchesAndCascades(reshuffledBoard);
        }
  
        setBoard(currentBoard);
        setIsProcessing(false);
        return;
      }
  
      // Power-ups that activate on click DO NOT use a move
      if (tile.powerUp && !selectedTile) {
        setIsProcessing(true);
  
        const { clearedTiles, secondaryExplosions, spawnBomb } = activatePowerUp(
          board,
          tile,
          undefined,
          true // isPrimaryActivation
        );
        setScore(prev => prev + clearedTiles.length * 10);
        let currentBoard = await processBoardChanges(
          board,
          clearedTiles
        );
  
        // Handle the secondary bomb spawn
        if(spawnBomb) {
          currentBoard = await handleBombChainReaction(currentBoard);
        }
  
        if (secondaryExplosions && secondaryExplosions.length > 0) {
          let chainBoard = currentBoard;
          for (const secondaryTile of secondaryExplosions) {
            const { clearedTiles: secondClearedTiles } = activatePowerUp(
              chainBoard,
              secondaryTile,
              undefined,
              false // Secondary explosions are not primary
            );
            setScore(prev => prev + secondClearedTiles.length * 10);
            chainBoard = await processBoardChanges(
              chainBoard,
              secondClearedTiles
            );
          }
          currentBoard = chainBoard;
        }
        
        while (!checkBoardForMoves(currentBoard)) {
          toast({ title: 'No moves left, reshuffling!' });
          await delay(700);
          setIsShuffling(true);
          let reshuffledBoard = createInitialBoard();
          setBoard(reshuffledBoard);
          await delay(1000);
          setIsShuffling(false);
          currentBoard = await processMatchesAndCascades(reshuffledBoard);
        }
        
        setBoard(currentBoard);
        setIsProcessing(false);
        return;
      }
  
      if (selectedTile) {
        // This is the second tile selection
        const tile1 = selectedTile;
        const tile2 = tile;
        setSelectedTile(null);
  
        if (tile1.id === tile2.id) {
          return; // Clicked the same tile twice
        }
  
        if (!areTilesAdjacent(tile1, tile2)) {
          setSelectedTile(tile); // Select the new tile instead
          return;
        }
  
        // Check for rainbow swap
        const rainbowTile =
          tile1.powerUp === 'rainbow'
            ? tile1
            : tile2.powerUp === 'rainbow'
            ? tile2
            : null;
        const otherTile = rainbowTile
          ? rainbowTile.id === tile1.id
            ? tile2
            : tile1
          : null;
  
        if (rainbowTile && otherTile) {
          setIsProcessing(true);
          setMovesLeft(prev => prev - 1);
  
          // Activate rainbow power-up by swapping
          const { clearedTiles } = activatePowerUp(
            board,
            rainbowTile,
            otherTile.type
          );
          setScore(prev => prev + clearedTiles.length * 10);
          let currentBoard = await processBoardChanges(board, clearedTiles);
  
          while (!checkBoardForMoves(currentBoard)) {
            toast({ title: 'No moves left, reshuffling!' });
            await delay(700);
            setIsShuffling(true);
            let reshuffledBoard = createInitialBoard();
            setBoard(reshuffledBoard);
            await delay(1000);
            setIsShuffling(false);
            currentBoard = await processMatchesAndCascades(reshuffledBoard);
          }
  
          setBoard(currentBoard);
          setIsProcessing(false);
        } else {
          // Regular swap (handles powerup vs powerup, and regular vs regular)
          await handleRegularSwap(tile1, tile2);
        }
      } else {
        // It's a regular tile or a powerup, set it as selected
        setSelectedTile(tile);
      }
    },
    [
      isProcessing,
      gameState,
      selectedTile,
      board,
      handleRegularSwap,
      processBoardChanges,
      toast,
      processMatchesAndCascades,
      resetHintTimer,
      handleBombChainReaction,
      pendingRainbowPurchase,
    ]
  );

  const getNextLevelParams = useCallback(() => {
    const nextLevel = level + 1;
    const timeTaken = Math.max(
      1,
      Math.round((levelEndTime - levelStartTime) / 1000)
    );
  
    // --- Performance Score (0-100+) ---
    let performanceScore = 0;
    // 1. Moves left (up to 40 points)
    performanceScore += Math.min(40, (movesLeft - purchasedMoves) * 2); 
    // 2. Time taken (up to 30 points, less time is better)
    performanceScore += Math.max(0, 30 - (timeTaken - 30) / 5);
    // 3. Powerups made (up to 20 points)
    performanceScore += Math.min(20, powerUpsMade * 4);
    // 4. Highest combo (up to 10 points)
    performanceScore += Math.min(10, (highestCombo - 1) * 2);
  
    // --- Adjust Difficulty Rating ---
    let difficultyAdjustment = 0;
    if (performanceScore > 75) {
      difficultyAdjustment = 0.05; // Stronger increase
    } else if (performanceScore < 40) {
      difficultyAdjustment = -0.05; // Less forgiving decrease
    }
     // Clamp the rating between a min and max
    const newDifficultyRating = Math.max(0.5, Math.min(2.0, difficultyRating + difficultyAdjustment));
    setDifficultyRating(newDifficultyRating);
  
    // --- Calculate Next Level Params based on new rating ---
    const baseTargetIncrease = 500 + level * 200; // Faster increase
    const baseMoveAdjustment = 0; // Start with fewer moves
  
    const newTarget = Math.round(
      (targetScore + baseTargetIncrease) * newDifficultyRating
    );
    // Inverse relationship for moves: higher rating = fewer moves
    const newMoves = Math.max(
      10, // Lower move floor
      Math.round((INITIAL_MOVES - nextLevel + baseMoveAdjustment) / newDifficultyRating)
    );
  
    return {
      nextLevel,
      newTarget: Math.floor(newTarget / 100) * 100, // Round to nearest 100
      newMoves,
      newDifficultyRating,
    };
  }, [
    level,
    movesLeft,
    targetScore,
    levelStartTime,
    levelEndTime,
    powerUpsMade,
    highestCombo,
    purchasedMoves,
    difficultyRating,
  ]);

  const handleGameOver = useCallback(
    async (didWin: boolean, newDifficultyRating?: number) => {
      const endTime = Date.now();
      if (levelEndTime === 0) {
        setLevelEndTime(endTime);
      }
      if (!didWin) {
        localStorage.removeItem('doggyCrushGameState');
        if (user) {
          saveGameState(user.uid, null); // Clear cloud state on final loss
        }
        setWinStreak(0);
        setCanBuyContinue(false);
      } else {
        setWinStreak(prev => prev + 1);
      }
  
      let coinsEarned = 0;
      if (didWin) {
        playSound('win');
        const timeTaken = Math.round((endTime - levelStartTime) / 1000);
        const timeBonus = Math.floor(Math.max(0, 180 - timeTaken) * 0.5);
        const moveBonus = (movesLeft - purchasedMoves) * 2;
        const comboBonus = highestCombo * 10;
        const powerUpBonus = powerUpsMade * 15;
        coinsEarned = timeBonus + moveBonus + comboBonus + powerUpBonus;
        setCoins(prev => prev + coinsEarned);
      } else {
        playSound('lose');
        if(user) {
            // Reset coins to 0 in firestore on loss
            await updateUserStats({
                userId: user.uid,
                level: 0,
                score: 0,
                didWin: false,
                coins: -coins, // This will be used to set coins to 0
                difficultyRating: newDifficultyRating || difficultyRating
            })
        }
        setCoins(0);
      }
  
      if (user) {
        try {
          await updateUserStats({
            userId: user.uid,
            level: didWin ? level : 0,
            score,
            didWin,
            coins: didWin ? coinsEarned : 0,
            difficultyRating: newDifficultyRating || difficultyRating,
          });
          if (didWin) {
            toast({
              title: 'Score Saved!',
              description: 'Your progress has been saved to the leaderboard.',
            });
            // Refetch high score after update
            const userData = await getUserData(user.uid);
            setHighScore(userData.totalScore);
          }
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
      purchasedMoves,
      difficultyRating,
      levelEndTime,
      coins,
    ]
  );
  

  useEffect(() => {
    if (gameState !== 'playing' || board.length === 0 || isProcessing) return;

    const currentTotalScore = score + (user ? highScore - score : 0);
    if (currentTotalScore > highScore) {
      setHighScore(currentTotalScore);
    }
  
    if (score >= targetScore) {
      setGameState('level_end');
    } else if (movesLeft <= 0) {
      if (canBuyContinue && coins >= 500) {
        setGameState('lose'); // Show the dialog with the "continue" option
      } else {
        handleGameOver(false); // No continue possible, official game over
        setGameState('lose');
      }
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
    canBuyContinue,
    coins,
    user,
  ]);

  const handleLevelEndClick = useCallback(
    async (tile: Tile) => {
      if (isProcessing || gameState !== 'level_end') return;

      setIsProcessing(true);

      const { clearedTiles, secondaryExplosions } = activatePowerUp(
        board,
        tile
      );
      setScore(prev => prev + clearedTiles.length * 10);
      let currentBoard = await processBoardChanges(board, clearedTiles);

      if (secondaryExplosions && secondaryExplosions.length > 0) {
        let chainBoard = currentBoard;
        for (const secondaryTile of secondaryExplosions) {
          // At level end, just clear, don't create more explosions
          const { clearedTiles: secondClearedTiles } = activatePowerUp(
            chainBoard,
            { ...secondaryTile, powerUp: 'bomb' }
          );
          setScore(prev => prev + secondClearedTiles.length * 10);
          chainBoard = await processBoardChanges(chainBoard, secondClearedTiles);
        }
        currentBoard = chainBoard;
      }

      setBoard(currentBoard);
      setIsProcessing(false);
    },
    [board, gameState, isProcessing, processBoardChanges]
  );

  useEffect(() => {
    if (gameState !== 'level_end' || isProcessing) {
      return;
    }
    // Set end time here, right before calculating next level params
    if (levelEndTime === 0) {
      setLevelEndTime(Date.now());
    }

    const powerUpsOnBoard = board.flat().filter((t): t is Tile => !!t?.powerUp);

    if (powerUpsOnBoard.length > 0) {
      const tileToClick = powerUpsOnBoard[0];
      setTimeout(() => handleLevelEndClick(tileToClick), 100);
    } else {
      const finishLevel = async () => {
        setIsProcessing(true);

        const finalBoard = await processMatchesAndCascades(board);
        setBoard(finalBoard);

        const { newDifficultyRating } = getNextLevelParams();
        await handleGameOver(true, newDifficultyRating);
        setGameState('win');
        setIsProcessing(false);
      };
      finishLevel();
    }
  }, [
    gameState,
    board,
    isProcessing,
    handleLevelEndClick,
    processMatchesAndCascades,
    handleGameOver,
    getNextLevelParams,
    levelEndTime,
  ]);

  const handleRestart = useCallback(() => {
    // When restarting a level after a loss, make it a bit easier
    const newTarget = Math.max(1000, targetScore - 1000);
    const newMoves = INITIAL_MOVES - level + 5; // Give more moves than the original attempt
    startNewLevel(level, newTarget, newMoves);
  }, [startNewLevel, level, targetScore]);

  const handleNewGame = useCallback(() => {
    startNewLevel(1, INITIAL_TARGET_SCORE, INITIAL_MOVES);
  }, [startNewLevel]);

  const handleNextLevel = useCallback(() => {
    const { nextLevel, newTarget, newMoves } = getNextLevelParams();
    startNewLevel(nextLevel, newTarget, newMoves);
  }, [startNewLevel, getNextLevelParams]);

  const coinBonuses = useMemo(() => {
    if (gameState !== 'win' || levelEndTime === 0) return null;
    const timeTaken = Math.round((levelEndTime - levelStartTime) / 1000);
    return {
      movesLeft: (movesLeft - purchasedMoves) * 2,
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
    purchasedMoves,
  ]);

  const handlePurchase = useCallback(
    (powerUp: PowerUpType | '+5 moves') => {
      setIsProcessing(true);
      if (powerUp === '+5 moves') {
        setMovesLeft(prev => prev + 5);
        setPurchasedMoves(prev => prev + 5);
        toast({
          title: 'Power-up Purchased!',
          description: '+5 moves have been added.',
        });
        setIsProcessing(false);
      } else if (powerUp === 'rainbow') {
        setPendingRainbowPurchase(true);
        toast({
          title: 'Rainbow Power-up Ready!',
          description: 'Click on any color to clear it from the board.',
        });
        setIsProcessing(false);
      } else {
        let tempBoard = board.map(r =>
          r.map(tile => (tile ? { ...tile } : null))
        );
        const availableTiles = tempBoard
          .flat()
          .filter((t): t is Tile => !!t && !t.powerUp);

        if (availableTiles.length > 0) {
          const randomTile =
            availableTiles[Math.floor(Math.random() * availableTiles.length)];
          const { row, col } = randomTile;
          if (tempBoard[row][col]) {
            tempBoard[row][col]!.powerUp = powerUp;
            setBoard(tempBoard);
            toast({
              title: 'Power-up Purchased!',
              description: `A ${powerUp
                .replace('_', ' ')
                .replace(/\b\w/g, l =>
                  l.toUpperCase()
                )} has been added to the board.`,
            });
          }
        } else {
          toast({
            title: 'Purchase Failed',
            description: 'No space on the board for a new power-up.',
            variant: 'destructive',
          });
        }
        setIsProcessing(false);
      }
    },
    [board, toast]
  );
  
  const handleBuyExtraMoves = useCallback(() => {
    if (coins >= 500 && canBuyContinue) {
      setCoins(prev => prev - 500);
      setMovesLeft(prev => prev + 5);
      setPurchasedMoves(prev => prev + 5);
      setCanBuyContinue(false);
      setGameState('playing');
      toast({
        title: 'Second Chance!',
        description: 'You got 5 extra moves. Good luck!',
      });
    }
  }, [coins, canBuyContinue, toast]);

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
            isShuffling={isShuffling}
            hintTile={hintTile}
          />
          <ComboEffect message={comboMessage} />
        </div>
        <PowerUpShop
          coins={coins}
          onPurchase={handlePurchase}
          isProcessing={isProcessing}
          setCoins={setCoins}
          pendingRainbowPurchase={pendingRainbowPurchase}
        />
      </main>
      <GameOverDialog
        gameState={gameState}
        score={score}
        onNextLevel={handleNextLevel}
        onRestart={handleRestart}
        onNewGame={handleNewGame}
        isProcessing={isProcessing}
        coinBonuses={coinBonuses}
        coins={coins}
        canBuyContinue={canBuyContinue}
        onBuyExtraMoves={handleBuyExtraMoves}
      />
    </div>
  );
}
