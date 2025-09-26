'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gamepad2, Trophy, User, PawPrint } from 'lucide-react';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();

  // Determine active tab from pathname
  const activeTab = pathname.startsWith('/leaderboard')
    ? 'leaderboard'
    : pathname.startsWith('/auth')
    ? 'auth'
    : 'game';

  const onTabChange = (value: string) => {
    switch (value) {
      case 'game':
        router.push('/');
        break;
      case 'leaderboard':
        router.push('/leaderboard');
        break;
      case 'auth':
        router.push('/auth');
        break;
    }
  };

  return (
    <header className="flex flex-col items-center p-4 bg-background/80 backdrop-blur-sm sticky top-0 z-50 border-b">
      <h1 className="text-3xl font-bold flex items-center justify-center gap-2 mb-4">
        <PawPrint className="w-8 h-8 text-primary scale-x-[-1]" />
        DoggyCrush
        <PawPrint className="w-8 h-8 text-primary" />
      </h1>
      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList>
          <TabsTrigger value="game">
            <Gamepad2 className="w-4 h-4 mr-2" />
            Game
          </TabsTrigger>
          <TabsTrigger value="leaderboard">
            <Trophy className="w-4 h-4 mr-2" />
            Leaderboard
          </TabsTrigger>
          <TabsTrigger value="auth">
            <User className="w-4 h-4 mr-2" />
            Signup/Login
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </header>
  );
}
