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
  board: Board;
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
      where('displayName', '!=', null),
      orderBy('displayName'),
      orderBy('totalScore', 'desc'),
      limit(10)
    );
    const querySnapshot = await getDocs(q);
    const leaderboardList = querySnapshot.docs.map(doc => ({
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
    where('displayName', '!=', null),
    orderBy('displayName'),
    orderBy('totalScore', 'desc'),
    limit(10)
  );

  const unsubscribe = onSnapshot(
    q,
    querySnapshot => {
      const leaderboardList = querySnapshot.docs
        .filter(doc => doc.data().displayName) // Double-check to ensure displayName exists
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

      if (!userDoc.exists()) {
        // This case is less likely if user is created on signup, but good for safety
        transaction.set(userRef, {
          totalScore: stats.score,
          highestLevel: stats.level,
          wins: stats.didWin ? 1 : 0,
          losses: stats.didWin ? 0 : 1,
          coins: stats.didWin ? stats.coins : 0,
          totalCoinsEarned: stats.didWin ? stats.coins : 0,
          difficultyRating: stats.difficultyRating || 1.0,
        });
      } else {
        const currentData = userDoc.data();
        
        const newTotalScore = (currentData.totalScore || 0) + stats.score;
        const newCoins = stats.didWin ? (currentData.coins || 0) + stats.coins : 0;
        const newTotalCoinsEarned = stats.didWin ? (currentData.totalCoinsEarned || 0) + stats.coins : currentData.totalCoinsEarned || 0;

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
      }
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
export async function saveGameState(userId: string, state: GameStateDocument | null): Promise<void> {
  if (!userId) return;
  const gameStateRef = doc(db, 'gameState', userId);
  try {
    if (state === null) {
      // If state is null, it means we want to clear the saved game
      await setDoc(gameStateRef, { empty: true });
    } else {
      await setDoc(gameStateRef, state);
    }
  } catch (error) {
    console.error("Error saving game state:", error);
  }
}

// Function to load the game state from Firestore
export async function loadGameState(userId: string): Promise<GameStateDocument | null> {
  if (!userId) return null;
  const gameStateRef = doc(db, 'gameState', userId);
  try {
    const docSnap = await getDoc(gameStateRef);
    if (docSnap.exists() && !docSnap.data().empty) {
      // Basic validation to ensure it looks like a game state
      const data = docSnap.data();
      if (data.board && typeof data.level === 'number') {
        return data as GameStateDocument;
      }
    }
    return null;
  } catch (error) {
    console.error("Error loading game state:", error);
    return null;
  }
}
