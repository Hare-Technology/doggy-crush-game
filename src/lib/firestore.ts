import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';

export interface LeaderboardEntry {
    id: string;
    name: string;
    score: number;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const leaderboardCol = collection(db, 'leaderboard');
    const q = query(leaderboardCol, orderBy('score', 'desc'), limit(10));
    const leaderboardSnapshot = await getDocs(q);
    const leaderboardList = leaderboardSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name || 'Anonymous',
      score: doc.data().score || 0,
    }));
    return leaderboardList;
  } catch (error) {
    console.error("Error fetching leaderboard: ", error);
    // In case of error, return an empty array or handle it as needed
    return [];
  }
}
