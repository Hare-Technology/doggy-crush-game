import Header from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PawPrint } from 'lucide-react';

export default function AuthPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto p-4 flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
              <PawPrint className="w-8 h-8 text-primary" />
              Signup / Login
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">This feature is coming soon. Get ready to save your progress and compete with friends!</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
