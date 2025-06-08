
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import GameLogo from '@/components/game-logo';
import useLocalStorage from '@/hooks/use-local-storage';
import { useToast } from "@/hooks/use-toast";
import type { GameMode, Player, ActiveGameData } from '@/lib/gameTypes'; // Updated import
import { CODE_LENGTH, generateSecretCode } from '@/lib/gameLogic';

export default function EnterCodePage() {
  const [secretCodeInput, setSecretCodeInput] = useState('');
  const [username] = useLocalStorage<string>('locked-codes-username', '');
  const [activeGameData, setActiveGameData] = useLocalStorage<ActiveGameData | null>('locked-codes-active-game', null);
  
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!username) {
      router.push('/');
      return;
    }
    if (!activeGameData || activeGameData.gameMode !== 'computer') {
      // This page is now primarily for 'vs Computer' mode. 
      // Multiplayer modes handle code entry in their respective lobbies.
      // If somehow routed here for MP, redirect.
      toast({title:"Info", description: "Setting up multiplayer game..."});
      router.push('/select-mode'); 
    }
  }, [username, activeGameData, router, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^\d*$/.test(val) && val.length <= CODE_LENGTH) {
      setSecretCodeInput(val);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (secretCodeInput.length === CODE_LENGTH && /^\d{4}$/.test(secretCodeInput) && username && activeGameData) {
      const humanPlayer: Player = {
        id: username,
        name: username,
        secretCode: secretCodeInput,
        guesses: [],
        score: 0,
        isHost: true, // For computer mode, human is effectively the 'host' of their side
        isReady: true,
      };
      const computerPlayer: Player = {
        id: "computer",
        name: "Computer",
        secretCode: generateSecretCode(),
        guesses: [],
        score: 0,
        isComputer: true,
        isReady: true, // Computer is always ready
      };

      setActiveGameData({
        ...activeGameData,
        players: [humanPlayer, computerPlayer],
        gameStatus: 'playing', // Game starts immediately for vs Computer
      });
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
    if (activeGameData?.gameMode === "computer") {
      return `Hi ${username}! Enter a ${CODE_LENGTH}-digit secret code. The computer will try to guess it.`;
    }
    return "Set up your game."; // Generic fallback
  };

  if (!username || !activeGameData || activeGameData.gameMode !== 'computer') {
    // Render minimal UI or loading state if not 'computer' mode or data is missing
    return <div className="min-h-screen flex items-center justify-center"><p>Loading setup...</p></div>;
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
