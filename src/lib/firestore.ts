import { collection, getDocs, query, orderBy, limit, addDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface LeaderboardEntry {
    id: string;
    name: string;
    totalScore: number;
    highestLevel: number;
    wins: number;
    losses: number;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const leaderboardCol = collection(db, 'leaderboard');
    // Order by totalScore instead of score
    const q = query(leaderboardCol, orderBy('totalScore', 'desc'), limit(10));
    const leaderboardSnapshot = await getDocs(q);
    const leaderboardList = leaderboardSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name || 'Anonymous',
      totalScore: doc.data().totalScore || 0,
      highestLevel: doc.data().highestLevel || 1,
      wins: doc.data().wins || 0,
      losses: doc.data().losses || 0,
    }));
    return leaderboardList;
  } catch (error) {
    console.error("Error fetching leaderboard: ", error);
    return [];
  }
}

// Note: The addScore function will need to be replaced with a more comprehensive
// updateUserStats function once we have user accounts and full stat tracking.
export async function addScore(name: string, score: number): Promise<void> {
  if (!name || score === undefined) {
    throw new Error('Name and score are required.');
  }

  try {
    const leaderboardCol = collection(db, 'leaderboard');
    await addDoc(leaderboardCol, {
      name,
      totalScore: score, // This should be totalScore
      highestLevel: 1,   // Default/placeholder
      wins: 0,           // Default/placeholder
      losses: 0,         // Default/placeholder
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error adding score to leaderboard: ", error);
    throw new Error('Could not submit score.');
  }
}
