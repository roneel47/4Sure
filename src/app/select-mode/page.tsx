
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import GameLogo from '@/components/game-logo';
import useLocalStorage from '@/hooks/use-local-storage';
import type { GameMode, MultiplayerRole } from '@/lib/gameTypes';
import { Users, Bot, User, Users2, Home, LogIn } from 'lucide-react';
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

export default function SelectModePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [, setGameMode] = useLocalStorage<GameMode | null>('locked-codes-gamemode', null);
  const [, setNumberOfPlayers] = useLocalStorage<number | null>('locked-codes-numplayers', null);
  const [username] = useLocalStorage<string>('locked-codes-username', '');
  const [, setMultiplayerRole] = useLocalStorage<MultiplayerRole | null>('locked-codes-multiplayer-role', null);
  
  const [expandedMode, setExpandedMode] = useState<GameMode | null>(null);

  React.useEffect(() => {
    if (!username) {
      router.push('/'); 
    }
  }, [username, router]);

  const handleModeButtonClick = (config: ModeConfig) => {
    if (!config.isMultiplayer) {
      setGameMode(config.mode);
      setNumberOfPlayers(config.players);
      setMultiplayerRole(null); // Not a multiplayer role like host/join
      router.push('/enter-code');
    } else {
      setExpandedMode(prev => prev === config.mode ? null : config.mode);
    }
  };

  const handleMultiplayerOptionSelect = (mode: GameMode, numPlayers: number, role: MultiplayerRole) => {
    setGameMode(mode);
    setNumberOfPlayers(numPlayers);
    setMultiplayerRole(role);
    if (role === 'host') {
      router.push('/enter-code');
    } else { // 'join'
      toast({
        title: "Joining Game",
        description: "Functionality to join a game is coming soon!",
      });
      setExpandedMode(null); // Collapse after selection
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
        Change Username
      </Button>
    </div>
  );
}
