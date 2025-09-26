
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  resetTileIdCounter,
  setTileIdCounter,
  tileIdCounter,
  findHint,
} from '@/lib/game-logic';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { updateUserStats, getUserCoins } from '@/lib/firestore';
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
  const [isShuffling, setIsShuffling] = useState(false);
  const [hintTile, setHintTile] = useState<Tile | null>(null);
  const hintTimer = useRef<NodeJS.Timeout | null>(null);

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
    async (newLevel: number, newMoves: number, newTarget: number) => {
      resetTileIdCounter();
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
      setIsShuffling(true);

      if (
        newLevel === 1 &&
        newMoves === INITIAL_MOVES &&
        newTarget === INITIAL_TARGET_SCORE
      ) {
        localStorage.removeItem('doggyCrushGameState');
      }

      let newBoard: Board;
      do {
        newBoard = createInitialBoard();
      } while (!checkBoardForMoves(newBoard));

      setBoard(newBoard);
      await delay(1000); // Wait for shuffle animation
      setIsShuffling(false);
      setIsProcessing(false);
    },
    []
  );

  const loadGame = useCallback(async () => {
    const savedGame = localStorage.getItem('doggyCrushGameState');
    let userCoins = 0;
    if (user) {
      userCoins = await getUserCoins(user.uid);
    } else {
      const localCoins = localStorage.getItem('doggyCrushCoins');
      userCoins = localCoins ? parseInt(localCoins, 10) : 0;
    }
    setCoins(userCoins);

    if (savedGame) {
      try {
        const {
          board,
          level,
          score,
          movesLeft,
          targetScore,
          idCounter,
          coins: savedCoins,
        } = JSON.parse(savedGame);

        setBoard(board);
setLevel(level);
setScore(score);
setMovesLeft(movesLeft);
setTargetScore(targetScore);
if (typeof idCounter === 'number') {
  setTileIdCounter(idCounter);
}
        // If user logs out, keep their local coins.
        // If they log in, we defer to server coins.
        if (!user) {
          setCoins(savedCoins || 0);
        }
        setGameState('playing');
        setIsProcessing(false);
      } catch (e) {
        startNewLevel(1, INITIAL_MOVES, INITIAL_TARGET_SCORE);
      }
    } else {
      startNewLevel(1, INITIAL_MOVES, INITIAL_TARGET_SCORE);
    }
  }, [user, startNewLevel]);

  useEffect(() => {
    loadGame();
  }, [loadGame]);

  useEffect(() => {
    if (gameState === 'playing' && board.length > 0) {
      const stateToSave = {
        board,
        level,
        score,
        movesLeft,
        targetScore,
        idCounter: tileIdCounter,
        coins,
      };
      localStorage.setItem('doggyCrushGameState', JSON.stringify(stateToSave));
    }
  }, [board, level, score, movesLeft, targetScore, gameState, coins]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem('doggyCrushCoins', coins.toString());
    }
  }, [coins, user]);

  useEffect(() => {
    const savedHighScore = localStorage.getItem('doggyCrushHighScore');
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore, 10));
    }
  }, []);

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

        const points = matches.length * 10 * cascadeCount;
        totalPoints += points;
        
        let boardWithPowerups = tempBoard.map(row => row.map(tile => tile ? {...tile} : null));
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
            return tile;
          })
        );

        if (powerUps.length > 0) {
          powerUps.forEach(p => {
            const {row, col} = p.tile;
            newBoardWithNulls[row][col] = {...p.tile, powerUp: p.powerUp};
          });
        }
        
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
    async (initialBoard: Board, clearedTiles: Tile[]): Promise<Board> => {
      const clearedTileIds = new Set(clearedTiles.map(t => t.id));
      setIsAnimating(prev => new Set([...prev, ...clearedTileIds]));
      playSound('bomb');
      await delay(500);

      let boardWithNulls = initialBoard.map(row =>
        row.map(tile => {
          if (!tile) return null;
          // This check is important: don't nullify a tile that became a power-up
          if (tile.powerUp && !clearedTileIds.has(tile.id)) {
            return tile;
          }
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
      
      const boardAfterCascade = await processMatchesAndCascades(boardAfterGravity);
      setBoard(boardAfterCascade);

      return boardAfterCascade;
    },
    [playSound, processMatchesAndCascades]
  );

  const handleRegularSwap = useCallback(async (tile1: Tile, tile2: Tile) => {
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

  }, [board, processMatchesAndCascades, toast]);

  const handleTileInteraction = useCallback(async (tile: Tile) => {
    if (isProcessing || gameState !== 'playing') return;

    resetHintTimer();

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
      const rainbowTile = tile1.powerUp === 'rainbow' ? tile1 : (tile2.powerUp === 'rainbow' ? tile2 : null);
      const otherTile = rainbowTile ? (rainbowTile.id === tile1.id ? tile2 : tile1) : null;

      if (rainbowTile && otherTile && !otherTile.powerUp) {
        setIsProcessing(true);
        setMovesLeft(prev => prev - 1);
        
        // Activate rainbow power-up by swapping
        const { clearedTiles } = activatePowerUp(board, rainbowTile, otherTile.type);
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
      // This is the first tile selection
      if (tile.powerUp && tile.powerUp !== 'rainbow') {
        // Power-ups that activate on click do not use a move
        setIsProcessing(true);

        const { clearedTiles, secondaryExplosions } = activatePowerUp(board, tile);
        setScore(prev => prev + clearedTiles.length * 10);
        let currentBoard = await processBoardChanges(board, clearedTiles);

        if (secondaryExplosions && secondaryExplosions.length > 0) {
          let chainBoard = currentBoard;
          for (const secondaryTile of secondaryExplosions) {
            const { clearedTiles: secondClearedTiles } = activatePowerUp(chainBoard, secondaryTile);
            setScore(prev => prev + secondClearedTiles.length * 10);
            chainBoard = await processBoardChanges(chainBoard, secondClearedTiles);
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
      } else {
        // It's a regular tile or a rainbow tile, set it as selected
        setSelectedTile(tile);
      }
    }
  }, [isProcessing, gameState, selectedTile, board, handleRegularSwap, processBoardChanges, toast, processMatchesAndCascades, resetHintTimer]);

  const handleGameOver = useCallback(
    async (didWin: boolean) => {
      const endTime = Date.now();
      setLevelEndTime(endTime);
      if (!didWin) {
        localStorage.removeItem('doggyCrushGameState');
      }

      let coinsEarned = 0;
      if (didWin) {
        playSound('win');
        const timeTaken = Math.round((endTime - levelStartTime) / 1000); // in seconds
        const timeBonus = Math.floor(Math.max(0, 180 - timeTaken) * 0.5); // 0.5 coin per second under 3 minutes
        const moveBonus = movesLeft * 2; // 2 coins per move left
        const comboBonus = highestCombo * 10; // 10 coins per max combo
        const powerUpBonus = powerUpsMade * 15; // 15 coins per power-up created
        coinsEarned = timeBonus + moveBonus + comboBonus + powerUpBonus;
        setCoins(prev => prev + coinsEarned);
      } else {
        playSound('lose');
        setCoins(0);
      }

      if (user) {
        try {
          await updateUserStats({
            userId: user.uid,
            level: didWin ? level : 0, // only update level on win
            score,
            didWin,
            coins: didWin ? coinsEarned : 0,
          });
          if (didWin) {
            toast({
              title: 'Score Saved!',
              description: 'Your progress has been saved to the leaderboard.',
            });
          }
        } catch (error) {
          toast({
            title: 'Sync Error',
            description: 'Could not save your score. Please try again later.',
            variant: 'destructive',
          });
        }
      }

      if (!didWin) {
        setLevel(1);
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
    ]
  );

  useEffect(() => {
    if (
      gameState !== 'playing' ||
      board.length === 0 ||
      isProcessing
    )
      return;

    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('doggyCrushHighScore', score.toString());
    }

    if (score >= targetScore) {
      setGameState('level_end');
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

  const handleLevelEndClick = useCallback(async (tile: Tile) => {
    if (isProcessing || gameState !== 'level_end') return;
    
    setIsProcessing(true);

    const { clearedTiles, secondaryExplosions } = activatePowerUp(board, tile);
    setScore(prev => prev + clearedTiles.length * 10);
    let currentBoard = await processBoardChanges(board, clearedTiles);
    
    if (secondaryExplosions && secondaryExplosions.length > 0) {
      let chainBoard = currentBoard;
      for (const secondaryTile of secondaryExplosions) {
        // At level end, just clear, don't create more explosions
        const { clearedTiles: secondClearedTiles } = activatePowerUp(chainBoard, {...secondaryTile, powerUp: 'bomb'});
        setScore(prev => prev + secondClearedTiles.length * 10);
        chainBoard = await processBoardChanges(chainBoard, secondClearedTiles);
      }
      currentBoard = chainBoard;
    }
    
    setBoard(currentBoard);
    setIsProcessing(false);
  }, [board, gameState, isProcessing, processBoardChanges]);
  
  useEffect(() => {
    if (gameState !== 'level_end' || isProcessing) {
      return;
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
        
        await handleGameOver(true);
        setGameState('win');
        setIsProcessing(false);
      }
      finishLevel();
    }
  }, [gameState, board, isProcessing, handleLevelEndClick, processMatchesAndCascades, handleGameOver]);
  
  
  const handleRestart = useCallback(() => {
    // When restarting a level, make it a bit easier
    const newTarget = Math.max(1000, targetScore - 500);
    const newMoves = movesLeft + 5;
    startNewLevel(level, newMoves, newTarget);
  }, [startNewLevel, level, targetScore, movesLeft]);

  const handleNewGame = useCallback(() => {
    startNewLevel(1, INITIAL_MOVES, INITIAL_TARGET_SCORE);
  }, [startNewLevel]);

  const handleNextLevel = useCallback(() => {
    const nextLevel = level + 1;
    // Standard progression: harder target, slightly fewer moves over time
    const newTarget = targetScore + 1000;
    const newMoves = Math.max(10, INITIAL_MOVES - Math.floor(level / 2) * 2);
    startNewLevel(nextLevel, newMoves, newTarget);
  }, [level, startNewLevel, targetScore]);

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
            onTileClick={handleTileInteraction}
            selectedTile={selectedTile}
            isProcessing={isProcessing}
            isAnimating={isAnimating}
            isShuffling={isShuffling}
            hintTile={hintTile}
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
