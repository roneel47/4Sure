
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import GameLogo from '@/components/game-logo';
import useLocalStorage from '@/hooks/use-local-storage';
import { useToast } from "@/hooks/use-toast";
import type { GameMode } from '@/lib/gameTypes';

const CODE_LENGTH = 4;

interface PlayerSetupInfo {
  name: string;
  secretCode: string;
}

export default function EnterCodePage() {
  const [secretCodeInput, setSecretCodeInput] = useState('');
  const [username] = useLocalStorage<string>('locked-codes-username', '');
  const [gameMode] = useLocalStorage<GameMode | null>('locked-codes-gamemode', null);
  // For multiplayer, this will eventually hold all player codes. For now, just Player 1.
  const [, setPlayersSetup] = useLocalStorage<PlayerSetupInfo[]>('locked-codes-players-setup', []); 
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!username) {
      router.push('/');
    }
    if (!gameMode) {
      router.push('/select-mode');
    }
  }, [username, gameMode, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^\d*$/.test(val) && val.length <= CODE_LENGTH) {
      setSecretCodeInput(val);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (secretCodeInput.length === CODE_LENGTH && /^\d{4}$/.test(secretCodeInput)) {
      // For now, we only set up the first player (the current user)
      // Multiplayer setup will need to be expanded here or on the game page
      if (username) {
        setPlayersSetup([{ name: username, secretCode: secretCodeInput }]);
      }
      // Keep the old single user secret code for compatibility if needed, or remove if fully migrating
      localStorage.setItem('locked-codes-secret-code', JSON.stringify(secretCodeInput)); 


      router.push('/game');
    } else {
      toast({
        title: "Invalid Code",
        description: `Please enter exactly ${CODE_LENGTH} digits.`,
        variant: "destructive",
      });
    }
  };

  const getPageDescription = () => {
    if (gameMode === "computer") {
      return `Hi ${username}! Enter a ${CODE_LENGTH}-digit secret code. The computer will try to guess it.`;
    }
    // For multiplayer, this is Player 1. Further player entries would be handled next.
    return `Player 1 (${username}), set your ${CODE_LENGTH}-digit secret code.`;
  };

  if (!username || !gameMode) {
    return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <GameLogo />
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center text-primary">Set Your Secret Code</CardTitle>
          <CardDescription className="text-center">
            {getPageDescription()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="secretCode" className="text-sm font-medium">
                Your {CODE_LENGTH}-Digit Code
              </label>
              <Input
                id="secretCode"
                type="text"
                value={secretCodeInput}
                onChange={handleInputChange}
                placeholder="E.g., 1234"
                maxLength={CODE_LENGTH}
                required
                className="text-center text-3xl tracking-[0.5em] font-mono"
                pattern="\d{4}"
                inputMode="numeric"
              />
            </div>
            <Button type="submit" className="w-full text-lg py-3 bg-primary hover:bg-primary/90 text-primary-foreground">
              Start Game
            </Button>
          </form>
        </CardContent>
      </Card>
       <Button variant="link" onClick={() => router.push('/select-mode')} className="mt-4 text-sm text-muted-foreground">
        Change Game Mode
      </Button>
    </div>
  );
}
