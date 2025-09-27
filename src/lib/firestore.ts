import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  runTransaction,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Board, Tile } from './types';
import { BOARD_SIZE } from './constants';


export interface LeaderboardEntry {
  id: string;
  name: string;
  totalScore: number;
  highestLevel: number;
  wins: number;
  losses: number;
  totalCoinsEarned: number;
}

export interface GameStateDocument {
  flatBoard: (Tile | null)[];
  level: number;
  score: number;
  movesLeft: number;
  targetScore: number;
  idCounter: number;
  winStreak: number;
  purchasedMoves: number;
  difficultyRating: number;
}

export async function isDisplayNameTaken(displayName: string): Promise<boolean> {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('displayName', '==', displayName));
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
}

// This function now queries the 'users' collection
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const usersCol = collection(db, 'users');
    const q = query(
      usersCol,
      orderBy('totalScore', 'desc'),
      limit(10)
    );
    const querySnapshot = await getDocs(q);
    const leaderboardList = querySnapshot.docs
      .filter(doc => doc.data().displayName)
      .map(doc => ({
        id: doc.id,
        name: doc.data().displayName,
        totalScore: doc.data().totalScore || 0,
        highestLevel: doc.data().highestLevel || 1,
        wins: doc.data().wins || 0,
        losses: doc.data().losses || 0,
        totalCoinsEarned: doc.data().totalCoinsEarned || 0,
      }));
    return leaderboardList;
  } catch (error) {
    console.error('Error fetching leaderboard: ', error);
    return [];
  }
}

export function getRealtimeLeaderboard(
  callback: (data: LeaderboardEntry[]) => void
): () => void {
  const usersCol = collection(db, 'users');
  const q = query(
    usersCol,
    orderBy('totalScore', 'desc'),
    limit(10)
  );

  const unsubscribe = onSnapshot(
    q,
    querySnapshot => {
      const leaderboardList = querySnapshot.docs
        .filter(doc => doc.data().displayName) // Ensure displayName exists
        .map(doc => ({
          id: doc.id,
          name: doc.data().displayName,
          totalScore: doc.data().totalScore || 0,
          highestLevel: doc.data().highestLevel || 1,
          wins: doc.data().wins || 0,
          losses: doc.data().losses || 0,
          totalCoinsEarned: doc.data().totalCoinsEarned || 0,
        }));
      callback(leaderboardList);
    },
    error => {
      console.error('Error fetching real-time leaderboard: ', error);
    }
  );

  return unsubscribe; // Return the unsubscribe function
}

interface UserStats {
  userId: string;
  level: number;
  score: number;
  didWin: boolean;
  coins: number;
  difficultyRating: number;
}

export async function updateUserStats(stats: UserStats): Promise<void> {
  if (!stats.userId) {
    console.warn('User ID is missing, cannot update stats.');
    return;
  }

  const userRef = doc(db, 'users', stats.userId);

  try {
    await runTransaction(db, async transaction => {
      const userDoc = await transaction.get(userRef);
      const currentData = userDoc.exists() ? userDoc.data() : null;

      if (!currentData?.displayName) {
          // Don't update stats for users without a display name, prevents anonymous data issues
          return;
      }
        
      const newTotalScore = (currentData.totalScore || 0) + stats.score;
      let newCoins = currentData.coins || 0;
      let newTotalCoinsEarned = currentData.totalCoinsEarned || 0;

      if (stats.didWin) {
          newCoins += stats.coins;
          newTotalCoinsEarned += stats.coins;
      } else {
          // On loss, reset the coin balance.
          newCoins = 0; 
      }

      const updateData: any = {
        totalScore: newTotalScore,
        highestLevel: Math.max(currentData.highestLevel || 1, stats.level),
        wins: (currentData.wins || 0) + (stats.didWin ? 1 : 0),
        losses: (currentData.losses || 0) + (stats.didWin ? 0 : 1),
        difficultyRating: stats.difficultyRating || 1.0,
        coins: newCoins,
        totalCoinsEarned: newTotalCoinsEarned,
      };

      transaction.update(userRef, updateData);
    });
  } catch (error) {
    console.error('Error updating user stats: ', error);
    throw new Error('Could not update user stats.');
  }
}


export async function setUserDisplayName(
  userId: string,
  displayName: string
): Promise<void> {
  if (!userId || !displayName) {
    throw new Error('User ID and display name are required.');
  }
  const userRef = doc(db, 'users', userId);
  try {
    // Set or update the user document with the display name.
    // Also initializes stats if they don't exist
    await setDoc(userRef, { 
        displayName: displayName,
        totalScore: 0,
        highestLevel: 1,
        wins: 0,
        losses: 0,
        coins: 0,
        totalCoinsEarned: 0,
        difficultyRating: 1.0
    }, { merge: true });
  } catch (error) {
    console.error('Error setting display name: ', error);
    throw new Error('Could not set display name.');
  }
}

export async function getUserData(userId: string): Promise<{coins: number, difficultyRating: number, totalScore: number}> {
    if (!userId) return { coins: 0, difficultyRating: 1.0, totalScore: 0 };
    const userRef = doc(db, 'users', userId);
    try {
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          coins: data.coins || 0,
          difficultyRating: data.difficultyRating || 1.0,
          totalScore: data.totalScore || 0,
        };
      }
      return { coins: 0, difficultyRating: 1.0, totalScore: 0 };
    } catch (error) {
      console.error('Error getting user data:', error);
      return { coins: 0, difficultyRating: 1.0, totalScore: 0 };
    }
  }

// Function to save the entire game state to Firestore
export async function saveGameState(userId: string, state: Omit<GameStateDocument, 'flatBoard'> & { board: Board } | null): Promise<void> {
  if (!userId) return;
  const gameStateRef = doc(db, 'gameState', userId);
  try {
    if (state === null) {
      // If state is null, it means we want to clear the saved game
      await setDoc(gameStateRef, { empty: true });
    } else {
      const { board, ...restOfState } = state;
      const flatBoard = board.flat();
      await setDoc(gameStateRef, { ...restOfState, flatBoard });
    }
  } catch (error) {
    console.error("Error saving game state:", error);
  }
}

// Function to load the game state from Firestore
export async function loadGameState(userId: string): Promise<(Omit<GameStateDocument, 'flatBoard'> & { board: Board }) | null> {
  if (!userId) return null;
  const gameStateRef = doc(db, 'gameState', userId);
  try {
    const docSnap = await getDoc(gameStateRef);
    if (docSnap.exists() && !docSnap.data().empty) {
      // Basic validation to ensure it looks like a game state
      const data = docSnap.data() as GameStateDocument;
      if (data.flatBoard && typeof data.level === 'number') {
        const { flatBoard, ...restOfState } = data;
        
        // Un-flatten the board
        const board: Board = [];
        for (let i = 0; i < BOARD_SIZE; i++) {
          board.push(flatBoard.slice(i * BOARD_SIZE, (i + 1) * BOARD_SIZE));
        }

        return { ...restOfState, board };
      }
    }
    return null;
  } catch (error) {
    console.error("Error loading game state:", error);
    return null;
  }
}
