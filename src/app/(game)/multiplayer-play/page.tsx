
"use client";
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { Socket as ClientSocket } from 'socket.io-client';
import { io } from 'socket.io-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import PlayerPanel from '@/components/game/PlayerPanel';
import TurnIndicator from '@/components/game/TurnIndicator';
import { Button } from '@/components/ui/button';
import type { Guess, PlayerData as ServerPlayerData, GameRoom as ServerGameRoom } from '@/types/game'; 
import { CODE_LENGTH } from '@/lib/gameLogic';
import { Award, Hourglass, Loader2 } from 'lucide-react';

interface ClientPlayerData extends Partial<ServerPlayerData> {
  displayName: string; 
  guessesMade?: Guess[];
  guessesAgainst?: Guess[];
}


interface MultiplayerGameState {
  myPlayerId: string | null;
  mySecret: string[]; 
  currentTurnPlayerId: string | null;
  playersData: { [playerId: string]: ClientPlayerData }; 
  gameStatus: 'LOADING' | 'WAITING_FOR_GAME_START' | 'IN_PROGRESS' | 'GAME_OVER';
  winner: string | null;
  targetMap: { [playerId: string]: string } | null; 
}

export default function MultiplayerPlayPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const gameId = searchParams ? searchParams.get('gameId') : null;
  const playerCountParam = searchParams ? searchParams.get('playerCount') : "duo"; 

  const [socket, setSocket] = useState<ClientSocket | null>(null);
  const [gameState, setGameState] = useState<MultiplayerGameState>({
    myPlayerId: null,
    mySecret: [],
    currentTurnPlayerId: null,
    playersData: {},
    gameStatus: 'LOADING', // Start with LOADING
    winner: null,
    targetMap: null,
  });
  const [isSubmittingGuess, setIsSubmittingGuess] = useState(false);

  useEffect(() => {
    if (!gameId) {
      toast({ title: "Error", description: "No Game ID found.", variant: "destructive" });
      router.push('/mode-select');
      return;
    }
    console.log(`[MultiplayerPlay] Game ${gameId}: Page loaded. Initial gameState.myPlayerId: ${gameState.myPlayerId}`);

    // Read player ID and game ID from localStorage to ensure continuity
    const storedPlayerId = localStorage.getItem('myPlayerId_activeGame');
    const gameIdForStoredPlayer = storedPlayerId ? localStorage.getItem(`activeGameId_${storedPlayerId}`) : null;

    if (!storedPlayerId || gameIdForStoredPlayer !== gameId) {
        toast({ title: "Error", description: "Player identity mismatch or session expired for play page.", variant: "destructive" });
        if (storedPlayerId) localStorage.removeItem(`activeGameId_${storedPlayerId}`);
        localStorage.removeItem('myPlayerId_activeGame'); // Clear potentially stale ID
        router.push(`/multiplayer-setup`); 
        return;
    }
    console.log(`[MultiplayerPlay] Game ${gameId}: Found storedPlayerId: ${storedPlayerId}`);
    
    const mySecretFromStorage = localStorage.getItem(`mySecret_${gameId}_${storedPlayerId}`);
    if (!mySecretFromStorage) {
        toast({ title: "Error", description: "Your secret code for this game was not found for play page. Please setup again.", variant: "destructive" });
        router.push(`/multiplayer-secret-setup?gameId=${gameId}&playerCount=${playerCountParam}`);
        return;
    }
    console.log(`[MultiplayerPlay] Game ${gameId}: Found secret for ${storedPlayerId}`);

    // Set myPlayerId and mySecret from storage immediately
    // gameStatus remains LOADING until socket events confirm further details.
    setGameState(prev => ({
        ...prev,
        myPlayerId: storedPlayerId,
        mySecret: JSON.parse(mySecretFromStorage), 
    }));

    // Socket initialization should happen after myPlayerId is confirmed from localStorage
    // This effect depends on gameState.myPlayerId to ensure it runs *after* it's set from storage.
    // However, to prevent loops if socket events modify gameState which includes myPlayerId,
    // we will use storedPlayerId directly for the join-game emit.
    
    // Initialize socket connection
    // The fetch call to /api/socketio is already done on /multiplayer-setup.
    const newSocket = io({ path: '/api/socketio_c', addTrailingSlash: false, transports: ['websocket'] }); 
    setSocket(newSocket);
    console.log(`[MultiplayerPlay] Game ${gameId}: Socket instance created ${newSocket.id}. storedPlayerId for join: ${storedPlayerId}`);


    newSocket.on('connect', () => {
        console.log(`[MultiplayerPlay] Game ${gameId}: Connected with socket ID ${newSocket.id}. Emitting 'join-game' for storedPlayerId: ${storedPlayerId}`);
        // Emit join-game with rejoiningPlayerId to re-establish session on server for this play page
        newSocket.emit('join-game', { gameId, playerCount: playerCountParam || "duo", rejoiningPlayerId: storedPlayerId });
        // Toast can be removed or made conditional after debugging
        // toast({title: "Connected to Game Server", description: `Game ID: ${gameId}. Player: ${storedPlayerId}`});
    });
    
    newSocket.on('game-state-update', (serverRoomState: ServerGameRoom) => {
         console.log(`[MultiplayerPlay] Game ${gameId}: Received 'game-state-update':`, JSON.stringify(serverRoomState));
         if (serverRoomState.gameId === gameId) {
            const newPlayersData: MultiplayerGameState['playersData'] = {};
            if (serverRoomState.players) {
                Object.keys(serverRoomState.players).forEach(pid => {
                    const serverPlayer = serverRoomState.players[pid];
                    // Only include players with an active socketId or the current player
                    if (serverPlayer.socketId || pid === gameState.myPlayerId) { 
                        newPlayersData[pid] = {
                            socketId: serverPlayer.socketId,
                            guessesMade: serverPlayer.guessesMade || [], 
                            guessesAgainst: serverPlayer.guessesAgainst || [],
                            displayName: pid, 
                            isReady: serverPlayer.isReady,
                            hasSetSecret: serverPlayer.hasSetSecret,
                        };
                    }
                });
            }
            
            let currentStatus : MultiplayerGameState['gameStatus'] = 'LOADING';
            if (serverRoomState.status === 'IN_PROGRESS') currentStatus = 'IN_PROGRESS';
            else if (serverRoomState.status === 'GAME_OVER') currentStatus = 'GAME_OVER';
            else if (serverRoomState.status === 'READY_TO_START' || serverRoomState.status === 'WAITING_FOR_READY' || serverRoomState.status === 'WAITING_FOR_PLAYERS') {
                currentStatus = 'WAITING_FOR_GAME_START'; // Simplified state for pre-game on play page
            }


            setGameState(prev => ({
                ...prev,
                // myPlayerId is set from localStorage, should not change via game-state-update here
                // mySecret is also set from localStorage
                currentTurnPlayerId: serverRoomState.turn || null,
                playersData: newPlayersData,
                gameStatus: currentStatus,
                winner: serverRoomState.winner || null,
                targetMap: serverRoomState.targetMap || null,
            }));
         }
    });

    // Game start event is usually for clients on secret-setup, but play page might receive it if it connects fast enough
    // or if a game-state-update also implies game start.
    newSocket.on('game-start', (data: { gameId: string; startingPlayer: string; targetMap: { [playerId: string]: string } }) => {
        if (data.gameId === gameId) {
            console.log(`[MultiplayerPlay] Game ${gameId}: 'game-start' event received`, data);
            setGameState(prev => {
                const initialPlayersData = { ...prev.playersData };
                // Ensure playersData stubs exist for all players in targetMap
                if (data.targetMap) {
                    Object.keys(data.targetMap).forEach(pid => {
                        if (!initialPlayersData[pid]) { 
                            initialPlayersData[pid] = { displayName: pid, guessesMade: [], guessesAgainst: [] };
                        }
                    });
                }
                return {
                    ...prev,
                    currentTurnPlayerId: data.startingPlayer,
                    targetMap: data.targetMap,
                    gameStatus: 'IN_PROGRESS', // Explicitly set to IN_PROGRESS
                    playersData: initialPlayersData, // Ensure playersData is at least stubbed
                };
            });
            toast({title: "Game Started!", description: `${data.startingPlayer}'s turn.`});
        }
    });

    newSocket.on('guess-feedback', (data: { gameId: string; guessingPlayerId: string; targetPlayerId: string; guess: Guess }) => {
        if (data.gameId === gameId) {
            console.log(`[MultiplayerPlay] Game ${gameId}: Guess Feedback event received`, data);
            setGameState(prev => {
                const newPlayersData = { ...prev.playersData };
                
                if (newPlayersData[data.guessingPlayerId]) {
                    newPlayersData[data.guessingPlayerId].guessesMade = [
                        ...(newPlayersData[data.guessingPlayerId].guessesMade || []), 
                        data.guess
                    ];
                } else { 
                    newPlayersData[data.guessingPlayerId] = { displayName: data.guessingPlayerId, guessesMade: [data.guess], guessesAgainst: []};
                }

                 if (newPlayersData[data.targetPlayerId]) {
                    newPlayersData[data.targetPlayerId].guessesAgainst = [
                        ...(newPlayersData[data.targetPlayerId].guessesAgainst || []), 
                        data.guess
                    ];
                } else {
                    newPlayersData[data.targetPlayerId] = { displayName: data.targetPlayerId, guessesMade: [], guessesAgainst: [data.guess]};
                }
                return { ...prev, playersData: newPlayersData };
            });
            setIsSubmittingGuess(false);
        }
    });

    newSocket.on('turn-update', (data: { gameId: string; nextPlayerId: string }) => {
        if (data.gameId === gameId) {
            console.log(`[MultiplayerPlay] Game ${gameId}: Turn Update event received`, data);
            setGameState(prev => ({ ...prev, currentTurnPlayerId: data.nextPlayerId }));
            if (gameState.myPlayerId && data.nextPlayerId) { 
                 toast({description: `It's ${data.nextPlayerId === gameState.myPlayerId ? 'Your' : (gameState.playersData[data.nextPlayerId]?.displayName || data.nextPlayerId) + "'s"} turn.`})
            }
        }
    });

    newSocket.on('game-over', (data: { gameId: string; winner: string }) => {
        if (data.gameId === gameId) {
            console.log(`[MultiplayerPlay] Game ${gameId}: Game Over event received`, data);
            setGameState(prev => ({ ...prev, gameStatus: 'GAME_OVER', winner: data.winner }));
            if (gameState.myPlayerId && data.winner) { 
                toast({title: "Game Over!", description: `${data.winner === gameState.myPlayerId ? 'You are' : (gameState.playersData[data.winner]?.displayName || data.winner) + ' is'} the winner!`, duration: 5000});
            }
        }
    });
    
    newSocket.on('error-event', (data: { message: string }) => {
        console.error(`[MultiplayerPlay] Game ${gameId}: Received 'error-event': ${data.message}`);
        toast({ title: "Error", description: data.message, variant: "destructive" });
        if (data.message.includes("full") || data.message.includes("No available player slot") || data.message.includes("slot already active")) {
             router.push('/mode-select');
        }
    });

    newSocket.on('disconnect', (reason) => {
      console.log(`[MultiplayerPlay] Game ${gameId}: Disconnected from socket server. Reason: ${reason}`);
      // Avoid aggressive toast on disconnects that might be due to navigation
      // toast({ title: "Disconnected", variant: "destructive", description: `Reason: ${reason}. Please refresh or try rejoining.` });
      setGameState(prev => ({ ...prev, gameStatus: 'LOADING' })); 
    });

    newSocket.on('connect_error', (err) => {
      console.error(`[MultiplayerPlay] Game ${gameId}: Socket connection error: ${err.message}`);
      toast({ title: "Connection Error", description: "Could not connect to the game server.", variant: "destructive"});
       setGameState(prev => ({ ...prev, gameStatus: 'LOADING' })); 
    });

    return () => {
        console.log(`[MultiplayerPlay] Game ${gameId}: Cleanup - Disconnecting socket ${newSocket.id}`);
        newSocket.disconnect();
        setSocket(null);
    };
  // gameState.myPlayerId is set from localStorage before this effect runs with `io()`.
  // Re-running this entire effect if gameState.myPlayerId changes (which it shouldn't after initial set) would be problematic.
  // The critical part is that `storedPlayerId` is used for the initial join.
  }, [gameId, router, toast, playerCountParam]); 

  const handleMakeGuess = (guessString: string) => {
    if (!socket || !gameId || !gameState.myPlayerId || gameState.currentTurnPlayerId !== gameState.myPlayerId || gameState.gameStatus !== 'IN_PROGRESS') {
      toast({ title: "Cannot make guess", description: "Not your turn or game not active.", variant: "destructive" });
      return;
    }
    setIsSubmittingGuess(true);
    const guessArray = guessString.split('');
    socket.emit('make-guess', { gameId, playerId: gameState.myPlayerId, guess: guessArray });
  };

  const handleExitGame = () => {
    // Clear all game-specific localStorage for this player
    localStorage.removeItem('myPlayerId_activeGame');
    if (gameState.myPlayerId && gameId) {
      localStorage.removeItem(`mySecret_${gameId}_${gameState.myPlayerId}`);
      localStorage.removeItem(`activeGameId_${gameState.myPlayerId}`);
    }
    router.push('/mode-select');
    if(socket) socket.disconnect();
  };
  
  const handlePlayAgain = () => {
    // Similar to exit, but routes to setup for a new game
    // For simplicity, using multiplayer-setup to allow choosing new game options.
    localStorage.removeItem('myPlayerId_activeGame');
    if (gameState.myPlayerId && gameId) {
      localStorage.removeItem(`mySecret_${gameId}_${gameState.myPlayerId}`);
      localStorage.removeItem(`activeGameId_${gameState.myPlayerId}`);
    }
    router.push('/multiplayer-setup'); 
    if(socket) socket.disconnect();
  }

  // Loading state while myPlayerId is not yet determined from localStorage or socket connection is pending
  if (gameState.gameStatus === 'LOADING' || !gameState.myPlayerId || !socket?.connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg">
          {gameState.myPlayerId ? "Connecting to game server..." : "Loading player data..."}
        </p>
        <p className="text-sm text-muted-foreground">Game ID: {gameId}</p>
      </div>
    );
  }
  
  const expectedPlayerCount = playerCountParam === "duo" ? 2 : (playerCountParam === "trio" ? 3 : (playerCountParam === "quads" ? 4 : 0));
  
  // This condition might be hit if the game hasn't officially started (e.g., server still says WAITING_FOR_READY)
  // or if playersData hasn't been populated yet by game-state-update or game-start event.
  if (gameState.gameStatus === 'WAITING_FOR_GAME_START' && 
      (!gameState.targetMap || Object.keys(gameState.playersData).length < expectedPlayerCount || 
       (Object.keys(gameState.playersData).length > 0 && !Object.values(gameState.playersData).some(p=>p.socketId)))) {
     console.log(`[MultiplayerPlay] Waiting screen shown. targetMap: ${!!gameState.targetMap}, playersData keys: ${Object.keys(gameState.playersData).length}, expected: ${expectedPlayerCount}`);
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Hourglass className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg">Waiting for all players and game to start...</p>
        <p className="text-sm text-muted-foreground">Game ID: {gameId}</p>
         <p className="text-xs">My ID: {gameState.myPlayerId}, Players in room: {Object.keys(gameState.playersData).filter(pid => gameState.playersData[pid].socketId).length}/{expectedPlayerCount}</p>
      </div>
    );
  }

  if (gameState.gameStatus === 'GAME_OVER' && gameState.winner) {
    return (
      <Card className="w-full max-w-md mx-auto text-center shadow-xl mt-10">
        <CardHeader>
          <Award className="mx-auto h-16 w-16 text-primary" />
          <CardTitle className="text-3xl mt-4">
            {gameState.winner === gameState.myPlayerId ? "You Win!" : `${gameState.playersData[gameState.winner]?.displayName || gameState.winner} Wins!`}
          </CardTitle>
          <CardDescription className="pt-2">
            Congratulations to {gameState.playersData[gameState.winner]?.displayName || gameState.winner}!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handlePlayAgain} className="w-full" size="lg">Play Again</Button>
          <Button onClick={handleExitGame} className="w-full" size="lg" variant="outline">Exit Game</Button>
        </CardContent>
      </Card>
    );
  }
  
  const opponentId = gameState.myPlayerId && gameState.targetMap ? gameState.targetMap[gameState.myPlayerId] : null;
  const myPlayerData = gameState.myPlayerId ? gameState.playersData[gameState.myPlayerId] : null;
  const opponentPlayerData = opponentId ? gameState.playersData[opponentId] : null;

  // If game is IN_PROGRESS but crucial data is missing, show a more specific loading/error.
  // This can happen briefly during transition or if an event was missed.
  if (gameState.gameStatus === 'IN_PROGRESS' && (!myPlayerData || !opponentPlayerData || !opponentId)) {
     console.log(`[MultiplayerPlay] IN_PROGRESS but missing data. myPlayerData: ${!!myPlayerData}, opponentPlayerData: ${!!opponentPlayerData}, opponentId: ${opponentId}`);
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg">Synchronizing game state...</p>
        <p className="text-sm text-muted-foreground">Game ID: {gameId}</p>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className={`text-center py-3 mb-4 rounded-lg bg-card shadow-md ${gameState.currentTurnPlayerId === gameState.myPlayerId ? 'border-2 border-primary ring-2 ring-primary/50' : 'border border-border'}`}>
        {gameState.currentTurnPlayerId && gameState.playersData[gameState.currentTurnPlayerId] && (
            <TurnIndicator 
              currentPlayerName={gameState.playersData[gameState.currentTurnPlayerId]?.displayName || gameState.currentTurnPlayerId} 
              isPlayerTurn={gameState.currentTurnPlayerId === gameState.myPlayerId} 
            />
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 sm:gap-6">
        {myPlayerData && (
          <PlayerPanel
            playerName={`${myPlayerData.displayName || gameState.myPlayerId} (You)`}
            isCurrentPlayer={true}
            isPlayerTurn={gameState.currentTurnPlayerId === gameState.myPlayerId}
            guesses={myPlayerData.guessesMade || []}
            onMakeGuess={handleMakeGuess}
            isSubmitting={isSubmittingGuess && gameState.currentTurnPlayerId === gameState.myPlayerId}
            secretForDisplay={gameState.mySecret} 
          />
        )}
        {opponentPlayerData && opponentId && ( 
          <PlayerPanel
            playerName={opponentPlayerData.displayName || opponentId}
            isCurrentPlayer={false}
            isPlayerTurn={gameState.currentTurnPlayerId === opponentId}
            guesses={opponentPlayerData.guessesMade || []} 
            onMakeGuess={() => {}} 
            isSubmitting={false} 
            secretForDisplay={undefined} 
          />
        )}
      </div>
       <Button onClick={handleExitGame} variant="outline" className="mt-6">Exit Game</Button>
    </div>
  );
}
      
