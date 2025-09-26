'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gamepad2, Trophy, User, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { PawIcon } from '@/components/dog-icons';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: 'Signed Out',
        description: 'You have been successfully signed out.',
      });
      router.push('/');
    } catch (error) {
      toast({
        title: 'Error Signing Out',
        description: 'Something went wrong.',
        variant: 'destructive',
      });
    }
  };

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
        <PawIcon className="w-8 h-8 text-primary scale-x-[-1]" />
        DoggyCrush
        <PawIcon className="w-8 h-8 text-primary" />
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
          {!loading &&
            (user ? (
              <TabsTrigger value="logout" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </TabsTrigger>
            ) : (
              <TabsTrigger value="auth">
                <User className="w-4 h-4 mr-2" />
                Signup/Login
              </TabsTrigger>
            ))}
        </TabsList>
      </Tabs>
    </header>
  );
}
