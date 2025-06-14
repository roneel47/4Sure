
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import GameLogo from '@/components/game-logo';
import useLocalStorage from '@/hooks/use-local-storage';
import { useToast } from "@/hooks/use-toast";
import type { Player, ActiveGameData } from '@/lib/gameTypes';
import { CODE_LENGTH, generateSecretCode } from '@/lib/gameLogic';
import { Skeleton } from '@/components/ui/skeleton';

export default function EnterCodePage() {
  const [secretCodeInput, setSecretCodeInput] = useState('');
  const [username] = useLocalStorage<string>('locked-codes-username', '');
  const [activeGameData, setActiveGameData] = useLocalStorage<ActiveGameData | null>('locked-codes-active-game', null);
  const [isLoading, setIsLoading] = useState(true);
  
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!username) {
      router.push('/');
      return;
    }
    // This page is now primarily for 'computer' mode setup after selecting "Single Player"
    if (!activeGameData || activeGameData.gameMode !== 'computer') {
      // If here without proper activeGameData setup for computer mode, redirect.
      // This might happen if user navigates directly or activeGameData is cleared.
      toast({title:"Info", description: "Please select a game mode first.", variant: "default"});
      router.push('/select-mode'); 
      return; 
    }
    setIsLoading(false);
  }, [username, activeGameData, router, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^\d*$/.test(val) && val.length <= CODE_LENGTH) {
      setSecretCodeInput(val);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (secretCodeInput.length === CODE_LENGTH && /^\d{4}$/.test(secretCodeInput) && username && activeGameData && activeGameData.gameMode === 'computer') {
      // Set localStorage items for the user-provided game-computer/page.tsx
      localStorage.setItem('locked-codes-secret-code', JSON.stringify(secretCodeInput));
      localStorage.setItem('locked-codes-gamemode', JSON.stringify('computer'));
      // Set a simple playersSetup for the user's code to potentially pick up
      const playerSetup = [{ name: username, secretCode: secretCodeInput }];
      localStorage.setItem('locked-codes-players-setup', JSON.stringify(playerSetup));


      // Continue setting activeGameData as it might be useful for other things or future refactoring
      const humanPlayer: Player = {
        id: username,
        name: username,
        secretCode: secretCodeInput,
        guesses: [],
        score: 0,
        isHost: true, 
        isReady: true,
      };
      const computerPlayer: Player = {
        id: "computer",
        name: "Computer",
        secretCode: generateSecretCode(),
        guesses: [],
        score: 0,
        isComputer: true,
        isReady: true,
      };

      setActiveGameData({
        ...activeGameData,
        players: [humanPlayer, computerPlayer],
        gameStatus: 'playing',
      });
      router.push('/game-computer'); // Navigate to the dedicated computer game page
    } else {
      toast({
        title: "Invalid Code",
        description: `Please enter exactly ${CODE_LENGTH} digits.`,
        variant: "destructive",
      });
    }
  };

  const getPageDescription = () => {
    if (activeGameData?.gameMode === "computer") {
      return `Hi ${username}! Enter a ${CODE_LENGTH}-digit secret code. The computer will try to guess it.`;
    }
    return "Set up your game."; 
  };

  if (isLoading || !username || !activeGameData || activeGameData.gameMode !== 'computer') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <Skeleton className="h-[100px] w-[180px] mb-8 sm:mb-12" /> 
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mx-auto mb-2" />
            <Skeleton className="h-4 w-full mx-auto" /> 
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-16 w-full" /> 
            </div>
            <Skeleton className="h-12 w-full" /> 
          </CardContent>
        </Card>
        <Skeleton className="h-6 w-1/3 mt-4" /> 
      </div>
    );
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
