
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import GameLogo from '@/components/game-logo';
import useLocalStorage from '@/hooks/use-local-storage';
import type { GameMode, MultiplayerRole, Player, ActiveGameData } from '@/lib/gameTypes';
import { Users, Bot, User, Users2, Home, LogIn, ArrowLeft } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

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
  // This will store all game sessions, keyed by gameId.
  // Useful for allowing players to join existing games by code.
  const [allGames, setAllGames] = useLocalStorage<Record<string, ActiveGameData>>('locked-codes-all-games', {});

  const [expandedMode, setExpandedMode] = useState<GameMode | null>(null);

  React.useEffect(() => {
    if (!username) {
      router.push('/');
    }
    // Clear any previous active game data when returning to select mode
    setActiveGameData(null);
    // The lines for gameMode, numberOfPlayers, multiplayerRole that were previously here
    // are now handled by activeGameData.
  }, [username, router, setActiveGameData]);

  const handleModeButtonClick = (config: ModeConfig) => {
    if (!username) {
      toast({ title: "Error", description: "Username not set.", variant: "destructive" });
      router.push('/');
      return;
    }

    if (!config.isMultiplayer) {
      const gameData: ActiveGameData = {
        gameId: null, // No gameId for vs Computer directly
        gameMode: config.mode,
        numberOfPlayers: config.players,
        multiplayerRole: null,
        players: [], // Will be set up in enter-code page for computer mode
        gameStatus: 'lobby',
      };
      setActiveGameData(gameData);
      router.push('/enter-code'); // For 'vs Computer', user still enters their code
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
        secretCode: '', // Host will set this in the lobby
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
      // Set basic info, actual joining logic is on the join page
      setActiveGameData({
        gameId: null, // Will be set on join page
        gameMode: mode, // For context, though gameId's data will be primary
        numberOfPlayers: numPlayers,
        multiplayerRole: 'join',
        players: [],
        gameStatus: 'lobby',
      });
      router.push('/join-game');
    }
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
