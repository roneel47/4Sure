
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import GameLogo from '@/components/game-logo';
import useLocalStorage from '@/hooks/use-local-storage';
import type { GameMode } from '@/lib/gameTypes';
import { Users, Bot, User, Users2, Users3 } from 'lucide-react';

export default function SelectModePage() {
  const router = useRouter();
  const [, setGameMode] = useLocalStorage<GameMode | null>('locked-codes-gamemode', null);
  const [, setNumberOfPlayers] = useLocalStorage<number | null>('locked-codes-numplayers', null);
  const [username] = useLocalStorage<string>('locked-codes-username', '');

  React.useEffect(() => {
    if (!username) {
      router.push('/'); // Redirect to username page if not set
    }
  }, [username, router]);

  const handleModeSelect = (mode: GameMode, numPlayers: number) => {
    setGameMode(mode);
    setNumberOfPlayers(numPlayers);
    router.push('/enter-code');
  };

  if (!username) {
    return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <GameLogo />
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center text-primary">Select Game Mode</CardTitle>
          <CardDescription className="text-center">
            Hi {username}! How do you want to play?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => handleModeSelect("computer", 2)}
            className="w-full text-lg py-3 bg-primary hover:bg-primary/90 text-primary-foreground"
            size="lg"
          >
            <Bot className="mr-2 h-5 w-5" /> Versus Computer
          </Button>
          <Button
            onClick={() => handleModeSelect("duo", 2)}
            className="w-full text-lg py-3"
            variant="secondary"
            size="lg"
          >
            <User className="mr-2 h-5 w-5" /> Duo (2 Players)
          </Button>
          <Button
            onClick={() => handleModeSelect("trio", 3)}
            className="w-full text-lg py-3"
            variant="secondary"
            size="lg"
          >
            <Users2 className="mr-2 h-5 w-5" /> Trio (3 Players)
          </Button>
          <Button
            onClick={() => handleModeSelect("quads", 4)}
            className="w-full text-lg py-3"
            variant="secondary"
            size="lg"
          >
            <Users3 className="mr-2 h-5 w-5" /> Quads (4 Players)
          </Button>
        </CardContent>
      </Card>
      <Button variant="link" onClick={() => router.push('/')} className="mt-4 text-sm text-muted-foreground">
        Change Username
      </Button>
    </div>
  );
}
