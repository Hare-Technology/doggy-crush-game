import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PawPrint, Target, Star, Footprints } from 'lucide-react';

interface GameSidebarProps {
  level: number;
  score: number;
  scoreNeeded: number;
  movesLeft: number;
  targetScore: number;
}

const StatCard = ({
  icon: Icon,
  title,
  value,
  description,
}: {
  icon: React.ElementType;
  title: string;
  value: string | number;
  description?: string;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </CardContent>
  </Card>
);

export default function GameSidebar({
  level,
  score,
  scoreNeeded,
  movesLeft,
  targetScore,
}: GameSidebarProps) {
  const progressPercentage = targetScore > 0 ? (score / targetScore) * 100 : 0;

  return (
    <aside className="w-full lg:w-72 flex-shrink-0">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-center flex items-center justify-center gap-2">
          <PawPrint className="w-7 h-7 text-primary" /> DoggyCrush <PawPrint className="w-7 h-7 text-primary" />
        </h2>

        <div className="grid grid-cols-2 gap-4">
            <StatCard icon={Star} title="Level" value={level} />
            <StatCard icon={Footprints} title="Moves Left" value={movesLeft} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Score</span>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">{score.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mb-2">
              {scoreNeeded.toLocaleString()} more to reach target
            </p>
            <Progress value={progressPercentage} className="h-2" />
             <p className="text-xs text-muted-foreground text-right mt-1">
              Target: {targetScore.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}
