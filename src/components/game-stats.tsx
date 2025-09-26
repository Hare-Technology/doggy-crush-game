import { Card, CardContent } from '@/components/ui/card';
import { Target, Star, Footprints } from 'lucide-react';

interface GameStatsProps {
  level: number;
  score: number;
  scoreNeeded: number;
  movesLeft: number;
  targetScore: number;
}

const StatDisplay = ({
  icon: Icon,
  label,
  value,
  secondaryValue,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  secondaryValue?: string;
}) => (
  <div className="flex items-center gap-2 text-lg font-semibold">
    <Icon className="h-6 w-6 text-primary" />
    <div className="flex flex-col items-start">
      <span className="text-foreground leading-none">{value}</span>
      {secondaryValue && (
        <span className="text-xs text-muted-foreground leading-none">{secondaryValue}</span>
      )}
    </div>
    <span className="sr-only">{label}</span>
  </div>
);

export default function GameStats({
  level,
  score,
  scoreNeeded,
  movesLeft,
  targetScore,
}: GameStatsProps) {
  return (
    <div className="container mx-auto px-4 py-2">
      <Card className="p-2">
        <CardContent className="flex items-center justify-around gap-4 p-0">
          <StatDisplay icon={Star} label="Level" value={level} />
          <StatDisplay icon={Footprints} label="Moves Left" value={movesLeft} />
          <StatDisplay
            icon={Target}
            label="Score"
            value={score.toLocaleString()}
            secondaryValue={`/ ${targetScore.toLocaleString()}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
