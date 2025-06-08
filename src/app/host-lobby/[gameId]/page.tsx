
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

  const currentGameData = gameId ? allGames[gameId] : null;

  const updateHostData = useCallback((updatedPlayer: Partial<Player>) => {
    if (gameId && username && allGames[gameId]) {
      const updatedPlayers = allGames[gameId].players.map(p => 
        p.id === username && p.isHost ? { ...p, ...updatedPlayer } : p
      );
      const updatedGame = { ...allGames[gameId], players: updatedPlayers };
      setAllGames(prev => ({ ...prev, [gameId]: updatedGame }));
      setActiveGameData(prev => prev ? {...prev, players: updatedPlayers} : null);
    }
  }, [gameId, username, allGames, setAllGames, setActiveGameData]);

  useEffect(() => {
    if (!username || !gameId) {
      router.push('/');
      return;
    }
    if (!currentGameData) {
        toast({ title: "Error", description: "Game session not found.", variant: "destructive" });
        router.push('/select-mode');
        return;
    }
    if (currentGameData.players.find(p => p.id === username && p.isHost)?.secretCode) {
        setHostSecretCode(currentGameData.players.find(p => p.id === username && p.isHost)!.secretCode);
        setIsCodeSet(true);
    }
     if (currentGameData.players.find(p => p.id === username && p.isHost)?.isReady) {
        setIsCodeSet(true); // If already ready, assume code is set
    }

  }, [username, gameId, router, currentGameData, toast]);

   // Simulate real-time updates by polling localStorage (not ideal for production)
  useEffect(() => {
    if (!gameId) return;
    const interval = setInterval(() => {
      const latestGames = JSON.parse(localStorage.getItem('locked-codes-all-games') || '{}') as Record<string, ActiveGameData>;
      if (latestGames[gameId] && JSON.stringify(latestGames[gameId]) !== JSON.stringify(allGames[gameId])) {
        setAllGames(prev => ({...prev, [gameId]: latestGames[gameId]}));
        if (activeGameData && activeGameData.gameId === gameId) {
            setActiveGameData(latestGames[gameId]);
        }
      }
      // Check if game has started by another client (if host somehow got disconnected/reconnected)
      if(latestGames[gameId]?.gameStatus === 'playing'){
        router.push('/game');
      }
    }, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, [gameId, allGames, setAllGames, activeGameData, setActiveGameData, router]);


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
      updateHostData({ isReady: false });
      setIsCodeSet(false);
  };

  const handleStartGame = () => {
    if (!currentGameData || !gameId) return;
    const allPlayersReady = currentGameData.players.every(p => p.isReady);
    // Check if minimum number of players for the mode have joined and are ready
    const requiredPlayers = currentGameData.numberOfPlayers || 0;
    const readyPlayersCount = currentGameData.players.filter(p => p.isReady).length;

    if (readyPlayersCount < requiredPlayers) {
       toast({ title: "Not Enough Ready Players", description: `Need ${requiredPlayers} ready players to start. Currently ${readyPlayersCount}.`, variant: "destructive" });
       return;
    }
    if (!allPlayersReady) {
      toast({ title: "Waiting for Players", description: "Not all players are ready yet.", variant: "destructive" });
      return;
    }

    const updatedGame = { ...currentGameData, gameStatus: 'playing' as const };
    setAllGames(prev => ({ ...prev, [gameId]: updatedGame }));
    setActiveGameData(updatedGame);
    router.push('/game'); 
  };

  const copyGameCode = () => {
    if (gameId) {
      navigator.clipboard.writeText(gameId)
        .then(() => toast({ title: "Game Code Copied!", description: gameId }))
        .catch(() => toast({ title: "Failed to copy", variant: "destructive" }));
    }
  };

  if (!currentGameData || !username) {
    return <div className="min-h-screen flex items-center justify-center"><p>Loading lobby...</p></div>;
  }
  
  const hostPlayer = currentGameData.players.find(p => p.id === username && p.isHost);

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
            <h3 className="text-lg font-semibold mb-2 text-center">Your Setup ({username})</h3>
            {!isCodeSet || !hostPlayer?.isReady ? (
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
          // Consider cleanup logic here for the game session if host leaves
          setActiveGameData(null); // Clear active game for host
          // Optionally remove game from allGames if host abandons
          // const {[gameId]: _, ...remainingGames} = allGames;
          // setAllGames(remainingGames);
          router.push('/select-mode');
        }} 
        className="mt-4 text-sm text-muted-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Select Mode
      </Button>
       <p className="text-xs text-muted-foreground mt-4 text-center">
        Note: Player list updates may have a slight delay. This lobby uses browser storage for simulation.
      </p>
    </div>
  );
}
