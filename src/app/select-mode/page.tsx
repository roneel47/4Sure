
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import GameLogo from '@/components/game-logo';
import useLocalStorage from '@/hooks/use-local-storage';
import type { GameMode, MultiplayerRole, Player, ActiveGameData } from '@/lib/gameTypes';
import { Users, Bot, User, Users2, Home, LogIn, ArrowLeft } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';

interface ModeConfig {
  mode: GameMode;
  label: string;
  players: number;
  icon: React.ElementType;
  isMultiplayer: boolean;
}

const MODE_CONFIGS: ModeConfig[] = [
  { mode: "computer", label: "Versus Computer", players: 2, icon: Bot, isMultiplayer: false },
  { mode: "duo", label: "Duo (2 Players)", players: 2, icon: User, isMultiplayer: true },
  { mode: "trio", label: "Trio (3 Players)", players: 3, icon: Users2, isMultiplayer: true },
  { mode: "quads", label: "Quads (4 Players)", players: 4, icon: Users, isMultiplayer: true },
];

function generateGameId(): string {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

export default function SelectModePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [username] = useLocalStorage<string>('locked-codes-username', '');
  const [activeGameData, setActiveGameData] = useLocalStorage<ActiveGameData | null>('locked-codes-active-game', null);
  const [allGames, setAllGames] = useLocalStorage<Record<string, ActiveGameData>>('locked-codes-all-games', {});

  const [expandedMode, setExpandedMode] = useState<GameMode | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!username) {
      router.push('/');
      return;
    }
    setActiveGameData(null);
    setIsLoading(false);
  }, [username, router, setActiveGameData]);

  const handleModeButtonClick = (config: ModeConfig) => {
    if (!username) {
      toast({ title: "Error", description: "Username not set.", variant: "destructive" });
      router.push('/');
      return;
    }

    if (!config.isMultiplayer) {
      const gameData: ActiveGameData = {
        gameId: null,
        gameMode: config.mode,
        numberOfPlayers: config.players,
        multiplayerRole: null,
        players: [],
        gameStatus: 'lobby',
      };
      setActiveGameData(gameData);
      router.push('/enter-code');
    } else {
      setExpandedMode(prev => prev === config.mode ? null : config.mode);
    }
  };

  const handleMultiplayerOptionSelect = (mode: GameMode, numPlayers: number, role: MultiplayerRole) => {
    if (!username) {
      toast({ title: "Error", description: "Username not set.", variant: "destructive" });
      router.push('/');
      return;
    }
    
    if (role === 'host') {
      const gameId = generateGameId();
      const hostPlayer: Player = {
        id: username,
        name: username,
        secretCode: '',
        guesses: [],
        score: 0,
        isHost: true,
        isReady: false,
      };
      const newGame: ActiveGameData = {
        gameId: gameId,
        gameMode: mode,
        numberOfPlayers: numPlayers,
        multiplayerRole: 'host',
        players: [hostPlayer],
        gameStatus: 'lobby',
      };
      setAllGames(prev => ({ ...prev, [gameId]: newGame }));
      setActiveGameData(newGame);
      router.push(`/host-lobby/${gameId}`);
    } else if (role === 'join') {
      setActiveGameData({
        gameId: null,
        gameMode: mode,
        numberOfPlayers: numPlayers,
        multiplayerRole: 'join',
        players: [],
        gameStatus: 'lobby',
      });
      router.push('/join-game');
    }
  };

  if (isLoading || !username) { // Keep loading if username somehow still false
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <Skeleton className="h-[100px] w-[180px] mb-8 sm:mb-12" /> {/* GameLogo placeholder */}
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mx-auto mb-2" /> {/* CardTitle placeholder */}
            <Skeleton className="h-4 w-full mx-auto" /> {/* CardDescription placeholder */}
          </CardHeader>
          <CardContent className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" /> /* Button placeholder */
            ))}
          </CardContent>
        </Card>
        <Skeleton className="h-6 w-1/3 mt-4" /> {/* Back button placeholder */}
      </div>
    );
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
        <CardContent className="space-y-3">
          {MODE_CONFIGS.map((config) => (
            <div key={config.mode}>
              <Button
                onClick={() => handleModeButtonClick(config)}
                className="w-full text-lg py-3"
                variant={config.mode === "computer" ? "default": "secondary"}
                size="lg"
              >
                <config.icon className="mr-2 h-5 w-5" /> {config.label}
              </Button>
              {config.isMultiplayer && expandedMode === config.mode && (
                <div className="mt-2 ml-4 pl-4 border-l border-border space-y-2 py-2">
                  <Button
                    onClick={() => handleMultiplayerOptionSelect(config.mode, config.players, 'host')}
                    className="w-full text-md justify-start"
                    variant="ghost"
                  >
                    <Home className="mr-2 h-4 w-4 text-primary" /> Host Game
                  </Button>
                  <Button
                    onClick={() => handleMultiplayerOptionSelect(config.mode, config.players, 'join')}
                    className="w-full text-md justify-start"
                    variant="ghost"
                  >
                    <LogIn className="mr-2 h-4 w-4 text-primary" /> Join Game
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
      <Button variant="link" onClick={() => router.push('/')} className="mt-4 text-sm text-muted-foreground">
         <ArrowLeft className="mr-2 h-4 w-4" /> Change Username
      </Button>
    </div>
  );
}
