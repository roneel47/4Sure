
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import GameLogo from '@/components/game-logo';
import useLocalStorage from '@/hooks/use-local-storage';
import type { GameMode, MultiplayerRole, Player, ActiveGameData } from '@/lib/gameTypes';
import { Users, Bot, User, Users2, Home, LogIn, ArrowLeft, Computer, Play } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';

interface ModeConfig {
  mode: GameMode;
  label: string;
  players: number;
  icon: React.ElementType;
}

const MULTIPLAYER_MODES: ModeConfig[] = [
  { mode: "duo", label: "Duo (2 Players)", players: 2, icon: User },
  { mode: "trio", label: "Trio (3 Players)", players: 3, icon: Users2 },
  { mode: "quads", label: "Quads (4 Players)", players: 4, icon: Users },
];

function generateGameId(): string {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

type SelectionStage = 'initial' | 'multiplayer_options';

export default function SelectModePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [username] = useLocalStorage<string>('locked-codes-username', '');
  const [, setActiveGameData] = useLocalStorage<ActiveGameData | null>('locked-codes-active-game', null);
  const [, setAllGames] = useLocalStorage<Record<string, ActiveGameData>>('locked-codes-all-games', {});

  const [selectionStage, setSelectionStage] = useState<SelectionStage>('initial');
  const [expandedMultiplayerMode, setExpandedMultiplayerMode] = useState<GameMode | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!username) {
      router.push('/');
      return;
    }
    // Clear any previous active game when reaching this page
    setActiveGameData(null); 
    setIsLoading(false);
  }, [username, router, setActiveGameData]);

  const handleSinglePlayerSelect = () => {
    if (!username) {
      toast({ title: "Error", description: "Username not set.", variant: "destructive" });
      router.push('/');
      return;
    }
    const gameData: ActiveGameData = {
      gameId: null,
      gameMode: 'computer',
      numberOfPlayers: 2,
      multiplayerRole: null,
      players: [], // Will be populated on the enter-code page
      gameStatus: 'lobby',
    };
    setActiveGameData(gameData);
    router.push('/enter-code');
  };

  const handleMultiplayerMainSelect = () => {
    setSelectionStage('multiplayer_options');
  };

  const handleMultiplayerModeSelect = (config: ModeConfig) => {
    setExpandedMultiplayerMode(prev => prev === config.mode ? null : config.mode);
  };

  const handleMultiplayerRoleSelect = (mode: GameMode, numPlayers: number, role: MultiplayerRole) => {
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
        isReady: false, // Host sets code and readies in lobby
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
      // For join, we don't set activeGameData until a game is actually joined.
      // The join-game page will handle finding and setting the active game.
      router.push('/join-game');
    }
  };

  if (isLoading || !username) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <Skeleton className="h-[100px] w-[180px] mb-8 sm:mb-12" />
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mx-auto mb-2" />
            <Skeleton className="h-4 w-full mx-auto" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
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
          <CardTitle className="text-3xl font-bold text-center text-primary">Select Game Type</CardTitle>
          <CardDescription className="text-center">
            Hi {username}! How do you want to play?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {selectionStage === 'initial' && (
            <>
              <Button
                onClick={handleSinglePlayerSelect}
                className="w-full text-lg py-3"
                variant="default"
                size="lg"
              >
                <Computer className="mr-2 h-5 w-5" /> Single Player (vs Computer)
              </Button>
              <Button
                onClick={handleMultiplayerMainSelect}
                className="w-full text-lg py-3"
                variant="secondary"
                size="lg"
              >
                <Users className="mr-2 h-5 w-5" /> Multiplayer
              </Button>
            </>
          )}

          {selectionStage === 'multiplayer_options' && (
            <>
              {MULTIPLAYER_MODES.map((config) => (
                <div key={config.mode}>
                  <Button
                    onClick={() => handleMultiplayerModeSelect(config)}
                    className="w-full text-lg py-3"
                    variant="secondary"
                    size="lg"
                  >
                    <config.icon className="mr-2 h-5 w-5" /> {config.label}
                  </Button>
                  {expandedMultiplayerMode === config.mode && (
                    <div className="mt-2 ml-4 pl-4 border-l border-border space-y-2 py-2">
                      <Button
                        onClick={() => handleMultiplayerRoleSelect(config.mode, config.players, 'host')}
                        className="w-full text-md justify-start"
                        variant="ghost"
                      >
                        <Home className="mr-2 h-4 w-4 text-primary" /> Host Game
                      </Button>
                      <Button
                        onClick={() => handleMultiplayerRoleSelect(config.mode, config.players, 'join')}
                        className="w-full text-md justify-start"
                        variant="ghost"
                      >
                        <LogIn className="mr-2 h-4 w-4 text-primary" /> Join Game
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => {
                  setSelectionStage('initial');
                  setExpandedMultiplayerMode(null);
                }}
                className="w-full mt-4"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            </>
          )}
        </CardContent>
      </Card>
      <Button variant="link" onClick={() => router.push('/')} className="mt-4 text-sm text-muted-foreground">
         <ArrowLeft className="mr-2 h-4 w-4" /> Change Username
      </Button>
    </div>
  );
}

    