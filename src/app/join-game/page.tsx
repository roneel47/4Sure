
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import GameLogo from '@/components/game-logo';
import useLocalStorage from '@/hooks/use-local-storage';
import type { ActiveGameData, Player, GameMode } from '@/lib/gameTypes';
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from 'lucide-react';

export default function JoinGamePage() {
  const [gameCode, setGameCode] = useState('');
  const router = useRouter();
  const { toast } = useToast();
  const [username] = useLocalStorage<string>('locked-codes-username', '');
  const [activeGameData, setActiveGameData] = useLocalStorage<ActiveGameData | null>('locked-codes-active-game', null);
  const [allGames, setAllGames] = useLocalStorage<Record<string, ActiveGameData>>('locked-codes-all-games', {});


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const codeToJoin = gameCode.trim().toUpperCase();
    if (!username) {
      toast({ title: "Error", description: "Username not set. Please go back to the start.", variant: "destructive" });
      router.push('/');
      return;
    }
    if (!codeToJoin) {
      toast({ title: "Error", description: "Please enter a game code.", variant: "destructive" });
      return;
    }

    const gameToJoin = allGames[codeToJoin];

    if (gameToJoin && gameToJoin.numberOfPlayers) {
      if (gameToJoin.players.length >= gameToJoin.numberOfPlayers) {
        toast({ title: "Game Full", description: "This game session is already full.", variant: "destructive" });
        return;
      }
      if (gameToJoin.players.find(p => p.id === username)) {
         toast({ title: "Already Joined", description: "You are already in this game session.", variant: "destructive" });
         // Allow re-entry to lobby if already part of the game
      } else {
        const newPlayer: Player = {
          id: username,
          name: username,
          secretCode: '', // To be set in lobby
          guesses: [],
          score: 0,
          isReady: false,
          isHost: false,
        };
        gameToJoin.players.push(newPlayer);
      }
      
      setAllGames(prev => ({ ...prev, [codeToJoin]: gameToJoin }));
      setActiveGameData({ 
        ...gameToJoin, 
        gameId: codeToJoin, 
        multiplayerRole: 'join',
      });
      router.push(`/player-lobby/${codeToJoin}`);

    } else {
      toast({ title: "Invalid Code", description: "Game code not found. Please check and try again.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <GameLogo />
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center text-primary">Join Game</CardTitle>
          <CardDescription className="text-center">
            Enter the game code provided by the host.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              type="text"
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value)}
              placeholder="Enter Game Code"
              className="text-center text-2xl tracking-wider"
              maxLength={10}
            />
            <Button type="submit" className="w-full text-lg py-3 bg-primary hover:bg-primary/90 text-primary-foreground">
              Join
            </Button>
          </form>
        </CardContent>
      </Card>
      <Button variant="link" onClick={() => router.push('/select-mode')} className="mt-4 text-sm text-muted-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Select Mode
      </Button>
    </div>
  );
}
