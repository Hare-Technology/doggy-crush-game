import { Card, CardContent } from '@/components/ui/card';

interface GameStatsProps {
  level: number;
  score: number;
  scoreNeeded: number;
  movesLeft: number;
  targetScore: number;
}

const StatDisplay = ({
  label,
  value,
  secondaryValue,
}: {
  label: string;
  value: string | number;
  secondaryValue?: string;
}) => (
  <div className="flex flex-col items-center text-center">
    <span className="text-sm text-muted-foreground">{label}</span>
    <div className="flex items-baseline gap-1">
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
  scoreNeeded,
  movesLeft,
  targetScore,
}: GameStatsProps) {
  return (
    <div className="container mx-auto px-4 py-2">
      <Card>
        <CardContent className="flex items-center justify-around gap-4 p-3">
          <StatDisplay label="Level" value={level} />
          <StatDisplay label="Moves" value={movesLeft} />
          <StatDisplay
            label="Score"
            value={score.toLocaleString()}
            secondaryValue={`/ ${targetScore.toLocaleString()}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
