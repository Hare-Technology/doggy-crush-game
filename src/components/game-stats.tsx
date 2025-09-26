import { Card, CardContent } from '@/components/ui/card';
import { Coins } from 'lucide-react';

interface GameStatsProps {
  level: number;
  score: number;
  highScore: number;
  movesLeft: number;
  targetScore: number;
  coins: number;
}

const StatDisplay = ({
  label,
  value,
  secondaryValue,
  icon,
}: {
  label: string;
  value: string | number;
  secondaryValue?: string;
  icon?: React.ReactNode;
}) => (
  <div className="flex flex-col items-center text-center">
    <span className="text-sm text-muted-foreground">{label}</span>
    <div className="flex items-baseline gap-1">
      {icon}
      <span className="text-xl font-bold text-foreground">{value}</span>
      {secondaryValue && (
        <span className="text-sm text-muted-foreground">{secondaryValue}</span>
      )}
    </div>
  </div>
);

export default function GameStats({
  level,
  score,
  highScore,
  movesLeft,
  targetScore,
  coins,
}: GameStatsProps) {
  return (
    <div className="container mx-auto px-4 py-2">
      <Card>
        <CardContent className="grid grid-cols-3 sm:grid-cols-5 items-center justify-around gap-4 p-3">
          <StatDisplay label="Level" value={level} />
          <StatDisplay label="Moves" value={movesLeft} />
          <StatDisplay
            label="Score"
            value={score.toLocaleString()}
            secondaryValue={`/ ${targetScore.toLocaleString()}`}
          />
          <StatDisplay label="High Score" value={highScore.toLocaleString()} />
          <StatDisplay label="Coins" value={coins.toLocaleString()} icon={<Coins className="w-4 h-4 mr-1 text-yellow-500" />} />
        </CardContent>
      </Card>
    </div>
  );
}
