
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import GameLogo from '@/components/game-logo';
import useLocalStorage from '@/hooks/use-local-storage';
import type { ActiveGameData, Player } from '@/lib/gameTypes';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CheckCircle, Circle, Edit3, Users } from 'lucide-react';
import { CODE_LENGTH } from '@/lib/gameLogic';
import { Skeleton } from '@/components/ui/skeleton';

export default function PlayerLobbyPage() {
  const params = useParams();
  const gameId = typeof params.gameId === 'string' ? params.gameId.toUpperCase() : null;
  const router = useRouter();
  const { toast } = useToast();

  const [username] = useLocalStorage<string>('locked-codes-username', '');
  const [activeGameData, setActiveGameData] = useLocalStorage<ActiveGameData | null>('locked-codes-active-game', null);
  const [allGames, setAllGames] = useLocalStorage<Record<string, ActiveGameData>>('locked-codes-all-games', {});

  const [playerSecretCode, setPlayerSecretCode] = useState('');
  const [isCodeSetAndReady, setIsCodeSetAndReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const currentGameData = gameId ? allGames[gameId] : null;
  const currentPlayerInLobby = currentGameData?.players.find(p => p.id === username);

  const updatePlayerData = useCallback((updatedPlayer: Partial<Player>) => {
     if (gameId && username && allGames[gameId]) {
      const updatedPlayers = allGames[gameId].players.map(p => 
        p.id === username ? { ...p, ...updatedPlayer } : p
      );
      const updatedGame = { ...allGames[gameId], players: updatedPlayers };
      setAllGames(prev => ({ ...prev, [gameId]: updatedGame }));
      // Update activeGameData if it's the current game
      if(activeGameData && activeGameData.gameId === gameId) {
         setActiveGameData(prev => prev ? {...prev, players: updatedPlayers} : null);
      }
    }
  }, [gameId, username, allGames, setAllGames, activeGameData, setActiveGameData]);


  useEffect(() => {
    if (!username || !gameId) {
      router.push('/');
      return;
    }
    const gameSession = allGames[gameId];
    if (!gameSession) {
        toast({ title: "Error", description: "Game session not found.", variant: "destructive" });
        router.push('/select-mode');
        return;
    }
    const playerInSession = gameSession.players.find(p => p.id === username);
    if (!playerInSession) {
        toast({ title: "Error", description: "You are not part of this game session.", variant: "destructive" });
        setActiveGameData(null); // Clear potentially stale active game
        router.push('/join-game'); // Redirect to join game or select mode
        return;
    }
    
    // Sync activeGameData if not already synced or for a different game
    if (!activeGameData || activeGameData.gameId !== gameId || activeGameData.multiplayerRole !== 'join') {
        setActiveGameData(gameSession);
    }


    if (playerInSession.secretCode) {
        setPlayerSecretCode(playerInSession.secretCode);
    }
    if (playerInSession.isReady) {
        setIsCodeSetAndReady(true);
    }
    setIsLoading(false);
  }, [username, gameId, router, allGames, toast, activeGameData, setActiveGameData]);

  useEffect(() => {
    if (!gameId || isLoading) return;
    const interval = setInterval(() => {
      const latestGames = JSON.parse(localStorage.getItem('locked-codes-all-games') || '{}') as Record<string, ActiveGameData>;
      if (latestGames[gameId]) {
        if (JSON.stringify(latestGames[gameId]) !== JSON.stringify(allGames[gameId])) {
            setAllGames(prev => ({...prev, [gameId]: latestGames[gameId]}));
        }
        if(activeGameData && activeGameData.gameId === gameId && JSON.stringify(latestGames[gameId]) !== JSON.stringify(activeGameData)) {
            setActiveGameData(latestGames[gameId]);
        }
        if (latestGames[gameId]?.gameStatus === 'playing') {
          // Ensure activeGameData is updated before navigating
          if(JSON.stringify(latestGames[gameId]) !== JSON.stringify(activeGameData)) {
            setActiveGameData(latestGames[gameId]);
          }
          router.push('/game');
        }
      } else if(currentGameData) { // Game disappeared
        toast({ title: "Lobby Closed", description: "The host may have closed the lobby.", variant: "destructive" });
        setActiveGameData(null);
        router.push('/select-mode');
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [gameId, allGames, setAllGames, router, activeGameData, setActiveGameData, isLoading, currentGameData, toast]);


  const handleCodeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^\d*$/.test(val) && val.length <= CODE_LENGTH) {
      setPlayerSecretCode(val);
    }
  };

  const handleSetCodeAndReady = () => {
    if (playerSecretCode.length === CODE_LENGTH && /^\d{4}$/.test(playerSecretCode)) {
      updatePlayerData({ secretCode: playerSecretCode, isReady: true });
      setIsCodeSetAndReady(true);
      toast({ title: "Code Set & Ready!", description: "Waiting for the host to start the game." });
    } else {
      toast({ title: "Invalid Code", description: `Please enter exactly ${CODE_LENGTH} digits.`, variant: "destructive" });
    }
  };
  
  const handleEditCode = () => {
      updatePlayerData({ isReady: false }); // Code remains, just not ready
      setIsCodeSetAndReady(false);
  };

  const handleLeaveLobby = () => {
    if (gameId && username && allGames[gameId]) {
      const updatedPlayers = allGames[gameId].players.filter(p => p.id !== username);
      const updatedGame = { ...allGames[gameId], players: updatedPlayers };
      
      if (updatedPlayers.length === 0) { // If last player leaves, delete game
        const newAllGames = {...allGames};
        delete newAllGames[gameId];
        setAllGames(newAllGames);
      } else {
        setAllGames(prev => ({ ...prev, [gameId]: updatedGame }));
      }
    }
    setActiveGameData(null);
    router.push('/select-mode');
  };


  if (isLoading || !currentGameData || !username || !currentPlayerInLobby) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <Skeleton className="h-[100px] w-[180px] mb-8 sm:mb-12" />
        <Card className="w-full max-w-lg shadow-2xl">
          <CardHeader>
            <Skeleton className="h-8 w-1/2 mx-auto" /> {/* Title */}
            <div className="text-center space-y-1 my-2">
              <Skeleton className="h-4 w-3/4 mx-auto" /> {/* Game Code Desc */}
              <Skeleton className="h-4 w-1/2 mx-auto" /> {/* Game Mode Desc */}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Skeleton className="h-6 w-1/3 mx-auto mb-2" /> {/* Your Setup Title */}
              <Skeleton className="h-10 w-full mb-2" /> {/* Input */}
              <Skeleton className="h-10 w-full" /> {/* Button */}
            </div>
            <div>
              <Skeleton className="h-6 w-1/2 mx-auto mb-2" /> {/* Players Title */}
              <div className="space-y-2 max-h-48 p-1">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" /> /* Player item */
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        <Skeleton className="h-6 w-1/3 mt-4" /> {/* Back button */}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <GameLogo />
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center text-primary">Player Lobby</CardTitle>
          <CardDescription className="text-center">
            Game Code: <span className="font-mono tracking-widest text-primary">{gameId}</span>
          </CardDescription>
          <CardDescription className="text-center">Game Mode: {currentGameData.gameMode} ({currentGameData.numberOfPlayers} players)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2 text-center">Your Setup ({currentPlayerInLobby.name})</h3>
            {!isCodeSetAndReady ? (
              <div className="space-y-2">
                <Input
                  type="text"
                  value={playerSecretCode}
                  onChange={handleCodeInputChange}
                  placeholder={`Enter Your ${CODE_LENGTH}-Digit Code`}
                  maxLength={CODE_LENGTH}
                  className="text-center text-xl font-mono tracking-[0.3em]"
                  pattern="\d{4}"
                  inputMode="numeric"
                />
                <Button onClick={handleSetCodeAndReady} className="w-full bg-green-600 hover:bg-green-700">Set Code & Ready Up</Button>
              </div>
            ) : (
              <div className="text-center p-3 border rounded bg-muted/50">
                <p className="text-green-400"><CheckCircle className="inline mr-2 h-5 w-5" /> You are Ready!</p>
                 <p className="font-mono text-xl tracking-widest">Code: {playerSecretCode}</p>
                <p className="text-sm text-muted-foreground">Waiting for host to start...</p>
                 <Button onClick={handleEditCode} variant="outline" size="sm" className="mt-1">
                    <Edit3 className="inline mr-1 h-4 w-4" /> Edit Code
                </Button>
              </div>
            )}
          </div>

           <div>
            <h3 className="text-lg font-semibold mb-2 text-center flex items-center justify-center"><Users className="mr-2 h-5 w-5"/>Players ({currentGameData.players.length} / {currentGameData.numberOfPlayers})</h3>
            <ul className="space-y-2 max-h-48 overflow-y-auto p-1">
              {currentGameData.players.map(player => (
                <li key={player.id} className="flex justify-between items-center p-3 border rounded bg-card">
                  <span className="font-medium">{player.name} {player.isHost ? "(Host)" : ""}</span>
                  {player.isReady ? (
                    <span className="text-green-400 flex items-center"><CheckCircle className="mr-1 h-5 w-5" /> Ready</span>
                  ) : (
                    <span className="text-yellow-400 flex items-center"><Circle className="mr-1 h-5 w-5" /> Not Ready</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
      <Button variant="link" onClick={handleLeaveLobby} className="mt-4 text-sm text-muted-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" /> Leave Lobby
      </Button>
      <p className="text-xs text-muted-foreground mt-4 text-center">
        Note: Player list updates may have a slight delay. This lobby uses browser storage for simulation.
      </p>
    </div>
  );
}
