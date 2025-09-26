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
import { Trophy } from 'lucide-react';

const leaderboardData = [
  { rank: 1, name: 'PawsomePlayer', score: 125000 },
  { rank: 2, name: 'GoodBoyGamer', score: 110250 },
  { rank: 3, name: 'TheCorgiConqueror', score: 98500 },
  { rank: 4, name: 'SaltySamoyed', score: 85200 },
  { rank: 5, name: 'BeagleBoss', score: 76400 },
  { rank: 6, name: 'RetrieverPro', score: 68900 },
  { rank: 7, name: 'PoodlePower', score: 61200 },
  { rank: 8, name: 'DachshundDash', score: 55000 },
  { rank: 9, name: 'ShibaInuSan', score: 49800 },
  { rank: 10, name: 'LabraLegend', score: 45100 },
];

export default function LeaderboardPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto p-4">
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
              <Trophy className="w-8 h-8 text-yellow-400" />
              Top Players
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px] text-center">Rank</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboardData.map((player) => (
                  <TableRow key={player.rank}>
                    <TableCell className="font-medium text-center">{player.rank}</TableCell>
                    <TableCell>{player.name}</TableCell>
                    <TableCell className="text-right">{player.score.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
