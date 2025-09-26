import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) => (
  <div className="flex items-center gap-2 text-lg font-semibold">
    <Icon className="h-6 w-6 text-primary" />
    <span className="text-foreground">{value}</span>
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
  const progressPercentage = targetScore > 0 ? (score / targetScore) * 100 : 0;

  return (
    <div className="container mx-auto px-4 py-2">
      <Card className="p-2">
        <CardContent className="flex items-center justify-between gap-4 p-0">
          <div className="flex items-center gap-4">
            <StatDisplay icon={Star} label="Level" value={level} />
            <StatDisplay icon={Footprints} label="Moves Left" value={movesLeft} />
          </div>
          <div className="flex-grow flex items-center gap-3">
            <Target className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="w-full">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-lg font-bold text-foreground">{score.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">
                  Target: {targetScore.toLocaleString()}
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
