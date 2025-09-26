'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getLeaderboard, LeaderboardEntry } from '@/lib/firestore';
import { Trophy, Coins, Loader2 } from 'lucide-react';

export default function LeaderboardPage() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      const data = await getLeaderboard();
      setLeaderboardData(data);
      setLoading(false);
    };
    fetchLeaderboard();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto p-4">
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
              <Trophy className="w-8 h-8 text-yellow-400" />
              Top 10 Players
              <Trophy className="w-8 h-8 text-yellow-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
              </div>
            ) : leaderboardData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px] text-center">Rank</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-right">Total Score</TableHead>
                    <TableHead className="text-right">Coins</TableHead>
                    <TableHead className="text-center">Highest Level</TableHead>
                    <TableHead className="text-center">Wins</TableHead>
                    <TableHead className="text-center">Losses</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboardData.map((player, index) => (
                    <TableRow key={player.id}>
                      <TableCell className="font-medium text-center">
                        {index + 1}
                      </TableCell>
                      <TableCell>{player.name}</TableCell>
                      <TableCell className="text-right">
                        {player.totalScore.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right flex items-center justify-end gap-1">
                        {player.coins.toLocaleString()}
                        <Coins className="w-4 h-4 text-yellow-500" />
                      </TableCell>
                      <TableCell className="text-center">
                        {player.highestLevel}
                      </TableCell>
                      <TableCell className="text-center text-green-500">
                        {player.wins}
                      </TableCell>
                      <TableCell className="text-center text-red-500">
                        {player.losses}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground">
                No scores yet. Be the first to get on the leaderboard!
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
