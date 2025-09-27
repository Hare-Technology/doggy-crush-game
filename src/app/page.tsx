

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

type GameStateObject = {
  board: Board;
  level: number;
  score: number;
  highScore: number;
  targetScore: number;
  movesLeft: number;
  purchasedMoves: number;
  gameState: GameState;
  coins: number;
  highestCombo: number;
  powerUpsMade: number;
  winStreak: number;
  difficultyRating: number;
  idCounter: number;
};

export default function Home() {
  const [currentGameState, setCurrentGameState] = useState<GameStateObject>({
    board: [],
    level: 1,
    score: 0,
    highScore: 0,
    targetScore: INITIAL_TARGET_SCORE,
    movesLeft: INITIAL_MOVES,
    purchasedMoves: 0,
    gameState: 'playing',
    coins: 0,
    highestCombo: 0,
    powerUpsMade: 0,
    winStreak: 0,
    difficultyRating: 1.0,
    idCounter: 0,
  });

  const gameStateRef = useRef(currentGameState);
  gameStateRef.current = currentGameState;

  const {
    board,
    level,
    score,
    highScore,
    targetScore,
    movesLeft,
    purchasedMoves,
    gameState,
    coins,
    highestCombo,
    powerUpsMade,
    winStreak,
    difficultyRating,
  } = currentGameState;

  const setBoard = (newBoard: Board) =>
    setCurrentGameState(prev => ({ ...prev, board: newBoard }));
  const setLevel = (newLevel: number) =>
    setCurrentGameState(prev => ({ ...prev, level: newLevel }));
  const setScore = (updater: (s: number) => number) =>
    setCurrentGameState(prev => ({ ...prev, score: updater(prev.score) }));
  const setHighScore = (newHighScore: number) =>
    setCurrentGameState(prev => ({ ...prev, highScore: newHighScore }));
  const setTargetScore = (newTarget: number) =>
    setCurrentGameState(prev => ({ ...prev, targetScore: newTarget }));
  const setMovesLeft = (updater: (m: number) => number) =>
    setCurrentGameState(prev => ({ ...prev, movesLeft: updater(prev.movesLeft) }));
  const setPurchasedMoves = (updater: (p: number) => number) =>
    setCurrentGameState(prev => ({ ...prev, purchasedMoves: updater(prev.purchasedMoves) }));
  const setGameState = (newState: GameState) =>
    setCurrentGameState(prev => ({ ...prev, gameState: newState }));
  const setCoins = (updater: (c: number) => number) =>
    setCurrentGameState(prev => ({ ...prev, coins: updater(prev.coins) }));
  const setHighestCombo = (updater: (c: number) => number) =>
    setCurrentGameState(prev => ({ ...prev, highestCombo: updater(prev.highestCombo) }));
  const setPowerUpsMade = (updater: (p: number) => number) =>
    setCurrentGameState(prev => ({ ...prev, powerUpsMade: updater(prev.powerUpsMade) }));
  const setWinStreak = (updater: (w: number) => number) =>
    setCurrentGameState(prev => ({ ...prev, winStreak: updater(prev.winStreak) }));
  const setDifficultyRating = (newRating: number) =>
    setCurrentGameState(prev => ({ ...prev, difficultyRating: newRating }));
  
  const updateIdCounter = (value: number) => {
    setTileIdCounter(value);
    setCurrentGameState(prev => ({ ...prev, idCounter: value }));
  }


  const [isProcessing, setIsProcessing] = useState(true);
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [isAnimating, setIsAnimating] = useState(new Set<number>());
  const [comboMessage, setComboMessage] = useState<string>('');
  const { toast } = useToast();
  const { user } = useAuth();
  const { playSound } = useSound();

  const [levelStartTime, setLevelStartTime] = useState(0);
  const [levelEndTime, setLevelEndTime] = useState(0);
  const [isShuffling, setIsShuffling] = useState(false);
  const [hintTile, setHintTile] = useState<Tile | null>(null);
  const hintTimer = useRef<NodeJS.Timeout | null>(null);
  const [canBuyContinue, setCanBuyContinue] = useState(true);
  const [pendingRainbowPurchase, setPendingRainbowPurchase] = useState(false);

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
      setGameState('playing');
      setIsProcessing(true);
      setLevelStartTime(Date.now());
      setLevelEndTime(0);
      setIsShuffling(true);
      setCanBuyContinue(true);
      setPendingRainbowPurchase(false);

      setCurrentGameState(prev => ({
        ...prev,
        level: newLevel,
        movesLeft: newMoves,
        purchasedMoves: 0,
        targetScore: newTarget,
        score: 0,
        gameState: 'playing',
        highestCombo: 0,
        powerUpsMade: 0,
        idCounter: 0,
      }));


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
        setWinStreak(() => 0);
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
        await delay(1200); // Wait for shuffle animation
        setIsShuffling(false);
        setIsProcessing(false);
      };
      doShuffle();
    },
    [user]
  );

  const loadGame = useCallback(async () => {
    let loadedFromCloud = false;
  
    if (user) {
      const cloudGameState = await loadGameState(user.uid);
      const userData = await getUserData(user.uid);
  
      if (cloudGameState) {
        try {
          updateIdCounter(cloudGameState.idCounter || 0);
          setCurrentGameState(prev => ({
            ...prev,
            ...cloudGameState,
            coins: userData.coins,
            highScore: userData.totalScore,
            gameState: 'playing',
          }));
          loadedFromCloud = true;
        } catch (e) {
          console.error("Failed to load cloud game state", e);
        }
      } else {
         // If no cloud game, still load user's coins/highscore
         setCurrentGameState(prev => ({
            ...prev,
            coins: userData.coins,
            highScore: userData.totalScore,
            difficultyRating: userData.difficultyRating,
        }));
      }
    }
  
    if (loadedFromCloud) {
        setIsProcessing(false);
        return;
    }
    
    // This runs for guests, or for logged-in users if cloud load fails or is empty.
    const savedGame = localStorage.getItem('doggyCrushGameState');
    if (savedGame) { 
      try {
        const parsedState = JSON.parse(savedGame);
        
        updateIdCounter(parsedState.idCounter || 0);

        // For guests, load everything from local storage
        if (!user) {
            const localCoins = localStorage.getItem('doggyCrushCoins');
            const localDifficulty = localStorage.getItem('doggyCrushDifficulty');
            const localHighScore = localStorage.getItem('doggyCrushHighScore');
            parsedState.coins = localCoins ? parseInt(localCoins, 10) : 0;
            parsedState.difficultyRating = localDifficulty ? parseFloat(localDifficulty) : 1.0;
            parsedState.highScore = localHighScore ? parseInt(localHighScore, 10) : 0;
        }
        
        setCurrentGameState(prev => ({ ...prev, ...parsedState, gameState: 'playing' }));
        setIsProcessing(false);
      } catch (e) {
        console.error("Failed to load local game state", e);
        startNewLevel(1, INITIAL_TARGET_SCORE, INITIAL_MOVES);
      }
    } else {
      // No cloud save and no local save, start a fresh game.
      if (!user) {
        const localCoins = localStorage.getItem('doggyCrushCoins');
        const localDifficulty = localStorage.getItem('doggyCrushDifficulty');
        const localHighScore = localStorage.getItem('doggyCrushHighScore');
        setCurrentGameState(prev => ({
            ...prev,
            coins: localCoins ? parseInt(localCoins, 10) : 0,
            difficultyRating: localDifficulty ? parseFloat(localDifficulty) : 1.0,
            highScore: localHighScore ? parseInt(localHighScore, 10) : 0,
        }));
      }
      startNewLevel(1, INITIAL_TARGET_SCORE, INITIAL_MOVES);
    }
  }, [user, startNewLevel]);

  useEffect(() => {
    loadGame();
  }, [loadGame]);

  useEffect(() => {
    if (gameStateRef.current.gameState === 'playing' && gameStateRef.current.board.length > 0 && !isProcessing) {
      const {board, idCounter, ...stateToSave} = gameStateRef.current;
      const serializableState = {
          ...stateToSave,
          idCounter: tileIdCounter, // Use the module-level counter
      };
      
      if (user) {
        saveGameState(user.uid, { ...serializableState, board });
      } else {
        localStorage.setItem('doggyCrushGameState', JSON.stringify({ ...serializableState, board }));
      }
    }
  }, [currentGameState, user, isProcessing]);


  useEffect(() => {
    if (!user) {
      localStorage.setItem('doggyCrushCoins', coins.toString());
      localStorage.setItem('doggyCrushDifficulty', difficultyRating.toString());
      localStorage.setItem('doggyCrushHighScore', highScore.toString());
    }
  }, [coins, difficultyRating, highScore, user]);


  const processMatchesAndCascades = useCallback(
    async (currentBoard: Board, initialCombo: number = 0) => {
      let tempBoard = currentBoard;
      let cascadeCount = initialCombo;
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
        
        let powerUpTileIds = new Set<number>();
        if (powerUps.length > 0) {
          localPowerUpsMade += powerUps.length;
          powerUps.forEach(p => {
            const { row, col } = p.tile;
            const tileToUpdate = boardWithPowerups[row]?.[col];
            if (tileToUpdate) {
                tileToUpdate.powerUp = p.powerUp;
                powerUpTileIds.add(tileToUpdate.id);
            }
          });
        }
        
        const matchedTileIds = new Set(matches.map(t => t.id));
        
        setIsAnimating(prev => new Set([...prev, ...matchedTileIds]));
        await delay(1000);

        let boardWithNulls = boardWithPowerups.map(row =>
          row.map(tile => {
            if (!tile) return null;
            // Clear matched tiles, but not if they just became a power-up
            if (matchedTileIds.has(tile.id) && !powerUpTileIds.has(tile.id)) {
              return null;
            }
            return tile;
          })
        );
        
        setIsAnimating(new Set());
        setBoard(boardWithNulls);
        await delay(50); // Short delay for board to re-render with nulls before gravity

        let boardAfterGravity = applyGravity(boardWithNulls);
        setBoard(boardAfterGravity);
        await delay(1000);
        
        let boardWithNewTiles = fillEmptyTiles(boardAfterGravity);
        setBoard(boardWithNewTiles);
        await delay(50); // Short delay for new tiles to render above board
        
        boardAfterGravity = applyGravity(boardWithNewTiles);
        setBoard(boardAfterGravity);
        await delay(1000);

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
      await delay(1000);

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
      setBoard(boardWithNulls);
      await delay(50);

      let boardAfterGravity = applyGravity(boardWithNulls);
      setBoard(boardAfterGravity);
      await delay(1000);

      let boardWithNewTiles = fillEmptyTiles(boardAfterGravity);
      setBoard(boardWithNewTiles);
      await delay(50);
      
      boardAfterGravity = applyGravity(boardWithNewTiles);
      setBoard(boardAfterGravity);
      await delay(1000);

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
      updateIdCounter(newBombId + 1);

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

      tempBoard[r1][c1] = { ...tile2, row: r1, col: c1 };
      tempBoard[r2][c2] = { ...tile1, row: r2, col: c2 };
      
      setBoard(tempBoard);
      await delay(1000);

      const { matches, matchCount } = findMatches(tempBoard, tile1, tile2);
      
      if (matches.length === 0) {
        setBoard(board); // Swap back
        await delay(1000);
        setIsProcessing(false);
        return; // Do not decrement moves
      }

      setMovesLeft(prev => prev - 1); // Decrement moves only on a valid swap

      let initialCombo = 0;
      if (matchCount > 1) {
        initialCombo = 1;
        playSound('combo');
        setComboMessage('Combo!');
        setTimeout(() => setComboMessage(''), 1900);
      }

      const boardAfterMatches = await processMatchesAndCascades(tempBoard, initialCombo);

      let finalBoard = boardAfterMatches;
      while (!checkBoardForMoves(finalBoard)) {
        toast({ title: 'No moves left, reshuffling!' });
        await delay(900);
        setIsShuffling(true);
        let reshuffledBoard = createInitialBoard();
        setBoard(reshuffledBoard);
        await delay(1200);
        setIsShuffling(false);
        finalBoard = await processMatchesAndCascades(reshuffledBoard);
      }
      setBoard(finalBoard);
      setIsProcessing(false);
    },
    [board, processMatchesAndCascades, toast, playSound]
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
          await delay(900);
          setIsShuffling(true);
          let reshuffledBoard = createInitialBoard();
          setBoard(reshuffledBoard);
          await delay(1200);
          setIsShuffling(false);
          currentBoard = await processMatchesAndCascades(reshuffledBoard);
        }
  
        setBoard(currentBoard);
        setIsProcessing(false);
        return;
      }
  
      // Power-ups that activate on click DO NOT use a move
      // Rainbows should NOT activate on a single click
      if (tile.powerUp && tile.powerUp !== 'rainbow' && !selectedTile) {
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
          await delay(900);
          setIsShuffling(true);
          let reshuffledBoard = createInitialBoard();
          setBoard(reshuffledBoard);
          await delay(1200);
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
            await delay(900);
            setIsShuffling(true);
            let reshuffledBoard = createInitialBoard();
            setBoard(reshuffledBoard);
            await delay(1200);
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
    performanceScore += Math.max(0, 30 - (timeTaken - 30) / 3);
    // 3. Powerups made (up to 20 points)
    performanceScore += Math.min(20, powerUpsMade * 4);
    // 4. Highest combo (up to 10 points)
    performanceScore += Math.min(10, (highestCombo - 1) * 2);
  
    // --- Adjust Difficulty Rating ---
    let difficultyAdjustment = 0;
    if (performanceScore > 85) { // Increased threshold
      difficultyAdjustment = 0.1; // Increased adjustment
    } else if (performanceScore > 65) { // Increased threshold
      difficultyAdjustment = 0.05; // Increased adjustment
    } else if (performanceScore < 20) {
      difficultyAdjustment = -0.1;
    } else if (performanceScore < 40) {
      difficultyAdjustment = -0.05;
    }
    // Clamp the rating between a min and max
    const newDifficultyRating = Math.max(
      0.5,
      Math.min(2.5, difficultyRating + difficultyAdjustment)
    );
    setDifficultyRating(newDifficultyRating);
  
    // --- Calculate Next Level Params based on new rating ---
    const baseTargetIncrease = 300 + level * 75; // Increased base and per-level amount
    const baseMoveAdjustment = 8;
  
    const newTarget = Math.round(
      (targetScore + baseTargetIncrease) * newDifficultyRating
    );
    // Inverse relationship for moves: higher rating = fewer moves
    const newMoves = Math.max(
      15,
      Math.round(
        (INITIAL_MOVES - nextLevel + baseMoveAdjustment) / newDifficultyRating
      )
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
        setWinStreak(() => 0);
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
        setCoins(() => 0); // Reset coins locally on loss
      }
  
      if (user) {
        try {
          await updateUserStats({
            userId: user.uid,
            level: didWin ? level : 0,
            score,
            didWin,
            coins: didWin ? coinsEarned : -1, // Pass -1 to signal a reset
            difficultyRating: newDifficultyRating || difficultyRating,
          });
          // Refetch high score after update, regardless of win/loss
          const userData = await getUserData(user.uid);
          setHighScore(userData.totalScore);
        } catch (error) {
          toast({
            title: 'Sync Error',
            description: 'Could not save your score. Please try again later.',
            variant: 'destructive',
          });
        }
      } else {
        // Handle guest high score
         if (score > highScore) {
            setHighScore(score);
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
      highScore
    ]
  );
  

  useEffect(() => {
    if (gameState !== 'playing' || board.length === 0 || isProcessing) return;

    if (score > highScore) {
        setHighScore(score);
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
