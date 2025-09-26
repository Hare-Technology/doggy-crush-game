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
  // SIMULATED DATA: We'll use this until we implement full player stats tracking.
  const sampleData: Omit<LeaderboardEntry, 'id'>[] = [
    { name: 'AlphaDog', totalScore: 125000, highestLevel: 15, wins: 14, losses: 2 },
    { name: 'BetaCat', totalScore: 110000, highestLevel: 12, wins: 11, losses: 1 },
    { name: 'CharliePup', totalScore: 98000, highestLevel: 10, wins: 9, losses: 3 },
    { name: 'DeltaHound', totalScore: 85000, highestLevel: 9, wins: 8, losses: 0 },
    { name: 'EchoPaws', totalScore: 72000, highestLevel: 8, wins: 7, losses: 4 },
    { name: 'FoxtrotFetch', totalScore: 61000, highestLevel: 7, wins: 6, losses: 1 },
    { name: 'GolfBark', totalScore: 55000, highestLevel: 6, wins: 5, losses: 2 },
    { name: 'HotelSnout', totalScore: 48000, highestLevel: 5, wins: 4, losses: 1 },
    { name: 'IndiaWoof', totalScore: 32000, highestLevel: 4, wins: 3, losses: 0 },
    { name: 'JuliettK9', totalScore: 15000, highestLevel: 2, wins: 1, losses: 1 },
  ];

  const leaderboardList = sampleData.map((player, index) => ({
    id: `sample-${index}`,
    ...player
  }));

  return leaderboardList;
  
  /*
  // REAL FIRESTORE LOGIC (to be used later)
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
  */
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
