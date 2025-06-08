
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
import { ArrowLeft, CheckCircle, Circle, Copy, Users, Edit3 } from 'lucide-react';
import { CODE_LENGTH } from '@/lib/gameLogic';
import { Skeleton } from '@/components/ui/skeleton';

export default function HostLobbyPage() {
  const params = useParams();
  const gameId = typeof params.gameId === 'string' ? params.gameId.toUpperCase() : null;
  const router = useRouter();
  const { toast } = useToast();

  const [username] = useLocalStorage<string>('locked-codes-username', '');
  const [activeGameData, setActiveGameData] = useLocalStorage<ActiveGameData | null>('locked-codes-active-game', null);
  const [allGames, setAllGames] = useLocalStorage<Record<string, ActiveGameData>>('locked-codes-all-games', {});
  
  const [hostSecretCode, setHostSecretCode] = useState('');
  const [isCodeSet, setIsCodeSet] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const currentGameData = gameId ? allGames[gameId] : null;
  const hostPlayer = currentGameData?.players.find(p => p.id === username && p.isHost);

  const updateHostData = useCallback((updatedPlayer: Partial<Player>) => {
    if (gameId && username && allGames[gameId]) {
      const updatedPlayers = allGames[gameId].players.map(p => 
        p.id === username && p.isHost ? { ...p, ...updatedPlayer } : p
      );
      const updatedGame = { ...allGames[gameId], players: updatedPlayers };
      setAllGames(prev => ({ ...prev, [gameId]: updatedGame }));
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
    if (!allGames[gameId]) { // Check if game exists in allGames first
        toast({ title: "Error", description: "Game session not found.", variant: "destructive" });
        router.push('/select-mode');
        return;
    }
    const currentHostPlayer = allGames[gameId].players.find(p => p.id === username && p.isHost);
    if (!currentHostPlayer) { // If user is not the host of this game
        toast({ title: "Access Denied", description: "You are not the host of this game.", variant: "destructive" });
        router.push('/select-mode');
        return;
    }

    if (currentHostPlayer.secretCode) {
        setHostSecretCode(currentHostPlayer.secretCode);
        setIsCodeSet(true);
    }
    if (currentHostPlayer.isReady) {
        setIsCodeSet(true); 
    }
    // Ensure activeGameData is synced if it wasn't or if it's for a different game
    if(!activeGameData || activeGameData.gameId !== gameId || activeGameData.multiplayerRole !== 'host') {
        setActiveGameData(allGames[gameId]);
    }

    setIsLoading(false);

  }, [username, gameId, router, allGames, toast, activeGameData, setActiveGameData]);

  useEffect(() => {
    if (!gameId || isLoading) return; // Don't poll if loading or no gameId
    const interval = setInterval(() => {
      const latestGames = JSON.parse(localStorage.getItem('locked-codes-all-games') || '{}') as Record<string, ActiveGameData>;
      if (latestGames[gameId]) {
        if (JSON.stringify(latestGames[gameId]) !== JSON.stringify(allGames[gameId])) {
          setAllGames(prev => ({...prev, [gameId]: latestGames[gameId]}));
        }
        if(activeGameData && activeGameData.gameId === gameId && JSON.stringify(latestGames[gameId]) !== JSON.stringify(activeGameData)) {
            setActiveGameData(latestGames[gameId]);
        }
        if(latestGames[gameId]?.gameStatus === 'playing'){
          // Ensure activeGameData is updated before navigating
          if(JSON.stringify(latestGames[gameId]) !== JSON.stringify(activeGameData)) {
            setActiveGameData(latestGames[gameId]);
          }
          router.push('/game');
        }
      } else if(currentGameData){ // Game disappeared from allGames
          toast({ title: "Lobby Closed", description: "This game lobby no longer exists.", variant: "destructive" });
          setActiveGameData(null);
          router.push('/select-mode');
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [gameId, allGames, setAllGames, activeGameData, setActiveGameData, router, isLoading, currentGameData, toast]);


  const handleCodeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^\d*$/.test(val) && val.length <= CODE_LENGTH) {
      setHostSecretCode(val);
    }
  };

  const handleSetCodeAndReady = () => {
    if (hostSecretCode.length === CODE_LENGTH && /^\d{4}$/.test(hostSecretCode)) {
      updateHostData({ secretCode: hostSecretCode, isReady: true });
      setIsCodeSet(true);
      toast({ title: "Code Set & Ready!", description: "You are ready. Waiting for other players." });
    } else {
      toast({ title: "Invalid Code", description: `Please enter exactly ${CODE_LENGTH} digits.`, variant: "destructive" });
    }
  };
  
  const handleEditCode = () => {
      updateHostData({ isReady: false }); // Secret code remains, just not ready
      setIsCodeSet(false);
  };

  const handleStartGame = () => {
    if (!currentGameData || !gameId) return;

    const requiredPlayers = currentGameData.numberOfPlayers || 0;
    const readyPlayersCount = currentGameData.players.filter(p => p.isReady).length;

    if (currentGameData.players.length < requiredPlayers) {
       toast({ title: "Not Enough Players", description: `Need ${requiredPlayers} players to start. Currently ${currentGameData.players.length}.`, variant: "destructive" });
       return;
    }
    if (readyPlayersCount < currentGameData.players.length) { // Check if ALL joined players are ready
      toast({ title: "Waiting for Players", description: "Not all players are ready yet.", variant: "destructive" });
      return;
    }

    const updatedGame = { ...currentGameData, gameStatus: 'playing' as const };
    setAllGames(prev => ({ ...prev, [gameId]: updatedGame }));
    setActiveGameData(updatedGame); // Ensure local active game is also updated
    router.push('/game'); 
  };

  const copyGameCode = () => {
    if (gameId) {
      navigator.clipboard.writeText(gameId)
        .then(() => toast({ title: "Game Code Copied!", description: gameId }))
        .catch(() => toast({ title: "Failed to copy", variant: "destructive" }));
    }
  };

  if (isLoading || !currentGameData || !username || !hostPlayer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <Skeleton className="h-[100px] w-[180px] mb-8 sm:mb-12" />
        <Card className="w-full max-w-lg shadow-2xl">
          <CardHeader>
            <Skeleton className="h-8 w-1/2 mx-auto" /> {/* Title */}
            <div className="text-center space-y-2 my-2">
              <Skeleton className="h-4 w-3/4 mx-auto" /> {/* Description */}
              <div className="flex items-center justify-center space-x-2">
                <Skeleton className="h-10 w-32" /> {/* Game ID */}
                <Skeleton className="h-10 w-10" /> {/* Copy button */}
              </div>
              <Skeleton className="h-4 w-1/2 mx-auto" /> {/* Game mode desc */}
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
            <Skeleton className="h-12 w-full" /> {/* Start Game Button */}
          </CardContent>
        </Card>
        <Skeleton className="h-6 w-1/3 mt-4" /> {/* Back button */}
      </div>
    );
  }
  
  const canStartGame = currentGameData.players.length >= (currentGameData.numberOfPlayers || 2) && 
                        currentGameData.players.every(p => p.isReady);


  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <GameLogo />
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center text-primary">Host Lobby</CardTitle>
          <div className="text-center">
            <CardDescription>Share this code with your friends:</CardDescription>
            <div className="flex items-center justify-center space-x-2 my-2">
              <span className="text-2xl font-mono tracking-widest p-2 border rounded bg-muted text-primary">{gameId}</span>
              <Button onClick={copyGameCode} variant="outline" size="icon"><Copy className="h-5 w-5" /></Button>
            </div>
            <CardDescription>Game Mode: {currentGameData.gameMode} ({currentGameData.numberOfPlayers} players)</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2 text-center">Your Setup ({hostPlayer.name})</h3>
            {!isCodeSet || !hostPlayer.isReady ? (
              <div className="space-y-2">
                <Input
                  type="text"
                  value={hostSecretCode}
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
                <p className="font-mono text-xl tracking-widest">Code: {hostSecretCode}</p>
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
          
          <Button 
            onClick={handleStartGame} 
            disabled={!canStartGame} 
            className="w-full text-lg py-3 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Start Game
          </Button>
        </CardContent>
      </Card>
      <Button variant="link" onClick={() => {
          if (gameId && allGames[gameId]) {
            // Mark game as abandoned or remove it
            const updatedGames = { ...allGames };
            delete updatedGames[gameId];
            setAllGames(updatedGames);
          }
          setActiveGameData(null); 
          router.push('/select-mode');
        }} 
        className="mt-4 text-sm text-muted-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Select Mode & Close Lobby
      </Button>
       <p className="text-xs text-muted-foreground mt-4 text-center">
        Note: Player list updates may have a slight delay. This lobby uses browser storage for simulation.
      </p>
    </div>
  );
}
