'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Header from '@/components/header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, PawPrint } from 'lucide-react';
import { setUserDisplayName } from '@/lib/firestore';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const handleAuthAction = async () => {
    if (isSignUp && !displayName) {
      setError('Display name is required for sign up.');
      toast({
        title: 'Display Name Required',
        description: 'Please enter a name to display on the leaderboard.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        await updateProfile(userCredential.user, { displayName });
        await setUserDisplayName(userCredential.user.uid, displayName);
        toast({
          title: 'Account Created!',
          description: "You've been successfully signed up.",
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({
          title: 'Signed In!',
          description: 'Welcome back to DoggyCrush.',
        });
      }
      router.push('/');
    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Authentication Error',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || user) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <PawPrint className="w-8 h-8 text-primary" />
              {isSignUp ? 'Create Your Player Account' : 'Player Login'}
            </CardTitle>
            <CardDescription>
              {isSignUp
                ? 'Sign up to save your progress and compete!'
                : 'Log in to continue your journey.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="YourPlayerName"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="player@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            {error && (
              <p className="text-sm text-center text-destructive">{error}</p>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              className="w-full"
              onClick={handleAuthAction}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="animate-spin" />
              ) : isSignUp ? (
                'Sign Up'
              ) : (
                'Login'
              )}
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => setIsSignUp(!isSignUp)}
              disabled={isLoading}
            >
              {isSignUp
                ? 'Already have an account? Login'
                : "Don't have an account? Sign Up"}
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}