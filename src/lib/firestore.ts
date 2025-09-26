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
} from 'firebase/firestore';
import { db } from './firebase';

export interface LeaderboardEntry {
  id: string;
  name: string;
  totalScore: number;
  highestLevel: number;
  wins: number;
  losses: number;
}

// This function now queries the 'users' collection
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const usersCol = collection(db, 'users');
    const q = query(usersCol, orderBy('totalScore', 'desc'), limit(10));
    const querySnapshot = await getDocs(q);
    const leaderboardList = querySnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().displayName || 'Anonymous',
      totalScore: doc.data().totalScore || 0,
      highestLevel: doc.data().highestLevel || 1,
      wins: doc.data().wins || 0,
      losses: doc.data().losses || 0,
    }));
    return leaderboardList;
  } catch (error) {
    console.error('Error fetching leaderboard: ', error);
    return [];
  }
}

interface UserStats {
  userId: string;
  level: number;
  score: number;
  didWin: boolean;
}

export async function updateUserStats(stats: UserStats): Promise<void> {
  if (!stats.userId) {
    throw new Error('User ID is required.');
  }

  const userRef = doc(db, 'users', stats.userId);

  try {
    await runTransaction(db, async transaction => {
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists()) {
        // If user document doesn't exist, we can't get their displayName,
        // so we'll have to rely on it being set at signup.
        // This transaction will just create the user with their game stats.
        transaction.set(userRef, {
          totalScore: stats.score,
          highestLevel: stats.level,
          wins: stats.didWin ? 1 : 0,
          losses: stats.didWin ? 0 : 1,
        });
      } else {
        const currentData = userDoc.data();
        transaction.update(userRef, {
          totalScore: increment(stats.score),
          highestLevel: Math.max(currentData.highestLevel || 1, stats.level),
          wins: increment(stats.didWin ? 1 : 0),
          losses: increment(stats.didWin ? 0 : 1),
        });
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
    await setDoc(userRef, { displayName }, { merge: true });
  } catch (error) {
    console.error('Error setting display name: ', error);
    throw new Error('Could not set display name.');
  }
}
