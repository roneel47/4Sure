
"use client";
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { Socket as ClientSocket } from 'socket.io-client';
import { io } from 'socket.io-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import PlayerPanel from '@/components/game/PlayerPanel';
import TurnIndicator from '@/components/game/TurnIndicator';
import TimerDisplay from '@/components/game/TimerDisplay'; // Import TimerDisplay
import { Button } from '@/components/ui/button';
import type { Guess, PlayerData as ServerPlayerData, GameRoom as ServerGameRoom, TurnUpdateData } from '@/types/game'; 
import { CODE_LENGTH } from '@/lib/gameLogic';
import { Award, Hourglass, Loader2, LogOut } from 'lucide-react';

const INITIAL_TIME_LIMIT_MULTIPLAYER = 30; // Must match server

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
  timeLeft: number;
  isTimerActive: boolean;
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
    gameStatus: 'LOADING', 
    winner: null,
    targetMap: null,
    timeLeft: INITIAL_TIME_LIMIT_MULTIPLAYER,
    isTimerActive: false,
  });
  const [isSubmittingGuess, setIsSubmittingGuess] = useState(false);

  useEffect(() => {
    if (!gameId) {
      toast({ title: "Error", description: "No Game ID found.", variant: "destructive" });
      router.push('/mode-select');
      return;
    }
    console.log(`[MultiplayerPlay] Game ${gameId}: Page loaded. Attempting to retrieve player ID and secret.`);

    const storedPlayerId = localStorage.getItem('myPlayerId_activeGame');
    const gameIdForStoredPlayer = storedPlayerId ? localStorage.getItem(`activeGameId_${storedPlayerId}`) : null;

    if (!storedPlayerId || gameIdForStoredPlayer !== gameId) {
        toast({ title: "Error", description: "Player identity mismatch or session expired for play page.", variant: "destructive" });
        if (storedPlayerId) localStorage.removeItem(`activeGameId_${storedPlayerId}`);
        localStorage.removeItem('myPlayerId_activeGame'); 
        router.push(`/multiplayer-setup`); 
        return;
    }
    console.log(`[MultiplayerPlay] Game ${gameId}: Found storedPlayerId: ${storedPlayerId}`);
    
    const mySecretFromStorage = localStorage.getItem(`mySecret_${gameId}_${storedPlayerId}`);
    if (!mySecretFromStorage) {
        toast({ title: "Error", description: "Your secret code for this game was not found. Please setup again.", variant: "destructive" });
        router.push(`/multiplayer-secret-setup?gameId=${gameId}&playerCount=${playerCountParam}`);
        return;
    }
    console.log(`[MultiplayerPlay] Game ${gameId}: Found secret for ${storedPlayerId}`);

    setGameState(prev => ({
        ...prev,
        myPlayerId: storedPlayerId,
        mySecret: JSON.parse(mySecretFromStorage), 
    }));
    
    const newSocket = io({ path: '/api/socketio_c', addTrailingSlash: false, transports: ['websocket'] }); 
    setSocket(newSocket);
    console.log(`[MultiplayerPlay] Game ${gameId}: Socket instance created ${newSocket.id}. Joining with storedPlayerId: ${storedPlayerId}`);

    newSocket.on('connect', () => {
        console.log(`[MultiplayerPlay] Game ${gameId}: Connected with socket ID ${newSocket.id}. Emitting 'join-game' for storedPlayerId: ${storedPlayerId}`);
        newSocket.emit('join-game', { gameId, playerCount: playerCountParam || "duo", rejoiningPlayerId: storedPlayerId });
    });
    
    newSocket.on('game-state-update', (serverRoomState: ServerGameRoom) => {
         console.log(`[MultiplayerPlay] Game ${gameId}: Received 'game-state-update':`, JSON.stringify(serverRoomState));
         if (serverRoomState.gameId === gameId) {
            const newPlayersData: MultiplayerGameState['playersData'] = {};
            if (serverRoomState.players) {
                Object.keys(serverRoomState.players).forEach(pid => {
                    const serverPlayer = serverRoomState.players[pid];
                    if (serverPlayer.socketId || pid === storedPlayerId) { // Ensure current player's data is always included
                        newPlayersData[pid] = {
                            socketId: serverPlayer.socketId,
                            guessesMade: serverPlayer.guessesMade || [], 
                            guessesAgainst: serverPlayer.guessesAgainst || [],
                            displayName: pid, // TODO: Get actual display name if stored
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
                currentStatus = 'WAITING_FOR_GAME_START';
            }

            setGameState(prev => ({
                ...prev,
                currentTurnPlayerId: serverRoomState.turn || null,
                playersData: newPlayersData,
                gameStatus: currentStatus,
                winner: serverRoomState.winner || null,
                targetMap: serverRoomState.targetMap || null,
                // Timer related state is updated based on 'turn-update' or if game is active
                isTimerActive: currentStatus === 'IN_PROGRESS' && !!serverRoomState.turn && !serverRoomState.winner,
            }));
         }
    });

    newSocket.on('game-start', (data: { gameId: string; startingPlayer: string; targetMap: { [playerId: string]: string } }) => {
        if (data.gameId === gameId) {
            console.log(`[MultiplayerPlay] Game ${gameId}: 'game-start' event received`, data);
            setGameState(prev => {
                const initialPlayersData = { ...prev.playersData };
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
                    gameStatus: 'IN_PROGRESS',
                    playersData: initialPlayersData,
                    timeLeft: INITIAL_TIME_LIMIT_MULTIPLAYER,
                    isTimerActive: true,
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
                if (!newPlayersData[data.guessingPlayerId]) newPlayersData[data.guessingPlayerId] = { displayName: data.guessingPlayerId, guessesMade: [], guessesAgainst: [] };
                newPlayersData[data.guessingPlayerId].guessesMade = [...(newPlayersData[data.guessingPlayerId].guessesMade || []), data.guess];
                
                if (!newPlayersData[data.targetPlayerId]) newPlayersData[data.targetPlayerId] = { displayName: data.targetPlayerId, guessesMade: [], guessesAgainst: [] };
                newPlayersData[data.targetPlayerId].guessesAgainst = [...(newPlayersData[data.targetPlayerId].guessesAgainst || []), data.guess];
                
                return { ...prev, playersData: newPlayersData };
            });
            setIsSubmittingGuess(false);
        }
    });

    newSocket.on('turn-update', (data: TurnUpdateData) => {
        if (data.gameId === gameId) {
            console.log(`[MultiplayerPlay] Game ${gameId}: Turn Update event received`, data);
            setGameState(prev => ({ 
                ...prev, 
                currentTurnPlayerId: data.nextPlayerId,
                timeLeft: INITIAL_TIME_LIMIT_MULTIPLAYER, // Reset timer
                isTimerActive: prev.gameStatus === 'IN_PROGRESS' && !prev.winner, // Keep timer active if game is ongoing
            }));
            if (storedPlayerId && data.nextPlayerId) { 
                 toast({description: `It's ${data.nextPlayerId === storedPlayerId ? 'Your' : (gameState.playersData[data.nextPlayerId]?.displayName || data.nextPlayerId) + "'s"} turn.${data.reason === 'timeout' ? ' (Opponent timed out)' : ''}`})
            }
        }
    });

    newSocket.on('game-over', (data: { gameId: string; winner: string }) => {
        if (data.gameId === gameId) {
            console.log(`[MultiplayerPlay] Game ${gameId}: Game Over event received`, data);
            setGameState(prev => ({ ...prev, gameStatus: 'GAME_OVER', winner: data.winner, isTimerActive: false }));
            if (storedPlayerId && data.winner) { 
                toast({title: "Game Over!", description: `${data.winner === storedPlayerId ? 'You are' : (gameState.playersData[data.winner]?.displayName || data.winner) + ' is'} the winner!`, duration: 5000});
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
      setGameState(prev => ({ ...prev, gameStatus: 'LOADING', isTimerActive: false })); 
    });

    newSocket.on('connect_error', (err) => {
      console.error(`[MultiplayerPlay] Game ${gameId}: Socket connection error: ${err.message}`);
      toast({ title: "Connection Error", description: "Could not connect to the game server.", variant: "destructive"});
       setGameState(prev => ({ ...prev, gameStatus: 'LOADING', isTimerActive: false })); 
    });

    return () => {
        console.log(`[MultiplayerPlay] Game ${gameId}: Cleanup - Disconnecting socket ${newSocket.id}`);
        newSocket.disconnect();
        setSocket(null);
    };
  }, [gameId, router, toast, playerCountParam]); // Removed gameState.myPlayerId from deps

  // Client-side timer countdown effect
  useEffect(() => {
    let timerInterval: NodeJS.Timeout | undefined;
    if (gameState.isTimerActive && gameState.timeLeft > 0 && gameState.gameStatus === 'IN_PROGRESS' && !gameState.winner) {
      timerInterval = setInterval(() => {
        setGameState(prev => ({ ...prev, timeLeft: Math.max(0, prev.timeLeft - 1) }));
      }, 1000);
    } else if (gameState.timeLeft === 0 && gameState.isTimerActive) {
        // Client-side timer reached 0, server will handle the timeout and emit 'turn-update'
        setGameState(prev => ({...prev, isTimerActive: false})); // Stop local countdown
    }
    return () => clearInterval(timerInterval);
  }, [gameState.isTimerActive, gameState.timeLeft, gameState.gameStatus, gameState.winner]);


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
    if(socket && gameId && gameState.myPlayerId) {
        socket.emit('player-exit', { gameId, playerId: gameState.myPlayerId });
    }
    localStorage.removeItem('myPlayerId_activeGame');
    if (gameState.myPlayerId && gameId) {
      localStorage.removeItem(`mySecret_${gameId}_${gameState.myPlayerId}`);
      localStorage.removeItem(`activeGameId_${gameState.myPlayerId}`);
    }
    if(socket) socket.disconnect();
    router.push('/mode-select');
  };
  
  const handlePlayAgain = () => {
    localStorage.removeItem('myPlayerId_activeGame');
    if (gameState.myPlayerId && gameId) {
      localStorage.removeItem(`mySecret_${gameId}_${gameState.myPlayerId}`);
      localStorage.removeItem(`activeGameId_${gameState.myPlayerId}`);
    }
    if(socket) socket.disconnect();
    router.push('/multiplayer-setup'); 
  }

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
  const activePlayersInRoom = Object.values(gameState.playersData).filter(p => p.socketId).length;
  
  if (gameState.gameStatus === 'WAITING_FOR_GAME_START' && 
      (!gameState.targetMap || activePlayersInRoom < expectedPlayerCount )) {
     console.log(`[MultiplayerPlay] Waiting screen shown. targetMap: ${!!gameState.targetMap}, playersData keys: ${Object.keys(gameState.playersData).length}, active in room: ${activePlayersInRoom}, expected: ${expectedPlayerCount}`);
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Hourglass className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg">Waiting for all players and game to start...</p>
        <p className="text-sm text-muted-foreground">Game ID: {gameId}</p>
         <p className="text-xs">My ID: {gameState.myPlayerId}, Players in room: {activePlayersInRoom}/{expectedPlayerCount}</p>
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

  if (gameState.gameStatus === 'IN_PROGRESS' && (!myPlayerData || !opponentPlayerData || !opponentId || !gameState.currentTurnPlayerId)) {
     console.log(`[MultiplayerPlay] IN_PROGRESS but missing crucial data. myPlayerData: ${!!myPlayerData}, opponentPlayerData: ${!!opponentPlayerData}, opponentId: ${opponentId}, currentTurn: ${gameState.currentTurnPlayerId}`);
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
       <div className={`text-center py-3 mb-4 rounded-lg bg-card shadow-md flex flex-col items-center ${gameState.currentTurnPlayerId === gameState.myPlayerId ? 'border-2 border-primary ring-2 ring-primary/50' : 'border border-border'}`}>
        {gameState.currentTurnPlayerId && gameState.playersData[gameState.currentTurnPlayerId] && (
            <TurnIndicator 
              currentPlayerName={gameState.playersData[gameState.currentTurnPlayerId]?.displayName || gameState.currentTurnPlayerId} 
              isPlayerTurn={gameState.currentTurnPlayerId === gameState.myPlayerId} 
            />
        )}
        {gameState.gameStatus === 'IN_PROGRESS' && !gameState.winner && (
             <TimerDisplay timeLeft={gameState.timeLeft} isTimerActive={gameState.isTimerActive && gameState.currentTurnPlayerId === gameState.myPlayerId} />
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
       <Button onClick={handleExitGame} variant="outline" className="mt-6">
         <LogOut className="mr-2 h-4 w-4" /> Exit Game
       </Button>
    </div>
  );
}
