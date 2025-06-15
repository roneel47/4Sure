
"use client";
import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import DigitInput from '@/components/game/DigitInput';
import { CODE_LENGTH, isValidDigitSequence } from '@/lib/gameLogic';
import { useToast } from '@/hooks/use-toast';
import { LockKeyhole, Users, Loader2, UserCheck, Hourglass, Play, ShieldCheck, ShieldAlert } from 'lucide-react';
import type { Socket as ClientSocket } from 'socket.io-client';
import { io } from 'socket.io-client';
import type { GameRoom, PlayerData as ServerPlayerData, MultiplayerGameStatus } from '@/types/game';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

export default function MultiplayerSecretSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { username } = useAuth(); // Get username

  const gameId = searchParams ? searchParams.get('gameId') : null;
  const playerCountParam = searchParams ? searchParams.get('playerCount') : null;
  const isHostParam = searchParams ? searchParams.get('isHost') === 'true' : false;
  
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [currentDigits, setCurrentDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [isSubmittingSecret, setIsSubmittingSecret] = useState(false);
  const socketRef = useRef<ClientSocket | null>(null); 
  const [gameRoomState, setGameRoomState] = useState<GameRoom | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "failed" | "room_full" | "error">("connecting");

  const expectedPlayerCount = playerCountParam === "duo" ? 2 : playerCountParam === "trio" ? 3 : 4;

  useEffect(() => {
    if (!gameId || !playerCountParam) {
        toast({title: "Error", description: "Missing game ID or player count.", variant: "destructive"});
        router.push('/mode-select');
        return;
    }

    if (socketRef.current) return; 

    console.log(`[MultiplayerSecretSetup] Game ${gameId}: Initializing socket. IsHost: ${isHostParam}, Username: ${username}`);

    const newSocket = io({ path: '/api/socketio_c', addTrailingSlash: false, transports: ['websocket'] }); 
    socketRef.current = newSocket;
    console.log(`[MultiplayerSecretSetup] Game ${gameId}: New socket instance created with provisional ID: ${newSocket.id}.`);

    newSocket.on('connect', () => {
      console.log(`[MultiplayerSecretSetup] Game ${gameId}: Socket connected: ${newSocket.id}. Emitting 'join-game'.`);
      setConnectionStatus("connected");
      
      const rejoiningPlayerIdFromStorage = localStorage.getItem('myPlayerId_activeGame');
      const gameIdForRejoiningPlayer = rejoiningPlayerIdFromStorage ? localStorage.getItem(`activeGameId_${rejoiningPlayerIdFromStorage}`) : null;
      const validRejoiningId = (rejoiningPlayerIdFromStorage && gameIdForRejoiningPlayer === gameId) ? rejoiningPlayerIdFromStorage : undefined;
      
      console.log(`[MultiplayerSecretSetup] Emitting join-game. GameID: ${gameId}, PlayerCount: ${playerCountParam}, IsHost: ${isHostParam}, RejoiningAs: ${validRejoiningId || 'N/A'}, Username: ${username}`);
      newSocket.emit('join-game', { 
        gameId, 
        playerCount: playerCountParam, 
        isHost: isHostParam, 
        rejoiningPlayerId: validRejoiningId,
        username: username || undefined // Send username
      });
    });

    newSocket.on('player-assigned', (data: { playerId: string; gameId: string }) => {
      if (data.gameId === gameId) {
        console.log(`[MultiplayerSecretSetup] Game ${gameId}: Received 'player-assigned'. Server assigned PlayerID: ${data.playerId}. Storing to localStorage.`);
        setMyPlayerId(data.playerId); 
        localStorage.setItem('myPlayerId_activeGame', data.playerId); 
        localStorage.setItem(`activeGameId_${data.playerId}`, gameId); 
        
        const storedSecret = localStorage.getItem(`mySecret_${gameId}_${data.playerId}`);
        if(storedSecret) {
            console.log(`[MultiplayerSecretSetup] Found stored secret for ${data.playerId}, applying.`);
            setCurrentDigits(JSON.parse(storedSecret));
        }
        // Toast for player assignment will be handled by displaying name from gameRoomState
      }
    });
    
    newSocket.on('game-state-update', (serverGameState: GameRoom) => { 
        if (serverGameState.gameId === gameId) {
            console.log(`[MultiplayerSecretSetup] Game ${gameId}: Received 'game-state-update':`, JSON.stringify(serverGameState, null, 2));
            setGameRoomState(serverGameState);
            setIsSubmittingSecret(false); // Reset submitting state on any game state update

            if(myPlayerId && serverGameState.players && serverGameState.players[myPlayerId] && serverGameState.players[myPlayerId]?.displayName !== username) {
                // This might be too noisy if server display name logic is robust
                // toast({ title: `You are ${serverGameState.players[myPlayerId]?.displayName || myPlayerId}`, description: `Joined game: ${gameId}` });
            }

            if(serverGameState.status === 'IN_PROGRESS' || serverGameState.status === 'GAME_OVER') {
                console.log(`[MultiplayerSecretSetup] Game ${gameId}: Status is ${serverGameState.status}, navigating to play page or mode select.`);
                if (serverGameState.status === 'IN_PROGRESS') {
                    router.push(`/multiplayer-play?gameId=${gameId}&playerCount=${playerCountParam}`);
                } else if (serverGameState.status === 'GAME_OVER') {
                    toast({title: "Game Over", description: "This game has concluded or was exited.", variant: "destructive"});
                    handleBackToModeSelect(false); // Don't emit player-exit if already game over
                }
            }
        }
    });

    newSocket.on('game-start', (data: { gameId: string; startingPlayer: string; targetMap: any }) => {
      if (data.gameId === gameId) {
        console.log(`[MultiplayerSecretSetup] Game ${gameId}: Received 'game-start'. Starting player: ${data.startingPlayer}. Navigating to play page.`);
        const startingPlayerName = gameRoomState?.players[data.startingPlayer]?.displayName || data.startingPlayer;
        toast({ title: "Game Starting!", description: `${startingPlayerName} will go first.` });
        router.push(`/multiplayer-play?gameId=${gameId}&playerCount=${playerCountParam}`);
      }
    });
    
    newSocket.on('error-event', (data: { message: string }) => {
        console.error(`[MultiplayerSecretSetup] Game ${gameId}: Received 'error-event': ${data.message}`);
        toast({ title: "Error", description: data.message, variant: "destructive" });
        if (data.message.toLowerCase().includes("full") || data.message.toLowerCase().includes("slot already active") || data.message.toLowerCase().includes("failed to assign player") || data.message.toLowerCase().includes("room not found") ) {
            setConnectionStatus("room_full"); 
            localStorage.removeItem('myPlayerId_activeGame');
            if (myPlayerId) localStorage.removeItem(`activeGameId_${myPlayerId}`); 
        } else {
            setConnectionStatus("error");
        }
    });

    newSocket.on('disconnect', (reason) => {
      console.log(`[MultiplayerSecretSetup] Game ${gameId}: Socket disconnected. Reason: ${reason}`);
      setConnectionStatus("failed");
    });

    newSocket.on('connect_error', (err) => {
      console.error(`[MultiplayerSecretSetup] Game ${gameId}: Socket connection error: ${err.message}`);
      setConnectionStatus("failed");
      toast({ title: "Connection Error", description: "Could not connect to the game server.", variant: "destructive"});
    });
    
    return () => {
      if (socketRef.current) {
        console.log(`[MultiplayerSecretSetup] Game ${gameId}: Cleanup - Disconnecting socket ${socketRef.current.id}.`);
        // Do not emit player-exit here automatically, only on explicit button click
        socketRef.current.disconnect();
        socketRef.current = null; 
      }
    };
  }, [gameId, playerCountParam, router, toast, isHostParam, username]); // Added username

  const handleBackToModeSelect = (emitExitEvent = true) => {
    if (emitExitEvent && socketRef.current && gameId && myPlayerId) {
        console.log(`[MultiplayerSecretSetup] Emitting 'player-exit' for ${myPlayerId} in game ${gameId} from lobby.`);
        socketRef.current.emit('player-exit', { gameId, playerId: myPlayerId });
    }
    if (socketRef.current) {
        socketRef.current.disconnect(); 
        socketRef.current = null;
    }
    localStorage.removeItem('myPlayerId_activeGame');
    if (myPlayerId && gameId) {
      localStorage.removeItem(`mySecret_${gameId}_${myPlayerId}`);
      localStorage.removeItem(`activeGameId_${myPlayerId}`);
    }
    router.push('/mode-select');
  };

  const handleSecretSubmit = async () => {
    if (!socketRef.current || !myPlayerId || !gameId) {
      toast({ title: "Error", description: "Not connected or player ID not assigned.", variant: "destructive" });
      return;
    }
    if (currentDigits.some(digit => digit === '') || currentDigits.length !== CODE_LENGTH) {
      toast({ title: "Invalid Secret", description: `Please enter all ${CODE_LENGTH} digits.`, variant: "destructive" });
      return;
    }
    if (!isValidDigitSequence(currentDigits)) {
      toast({ title: "Invalid Secret Pattern", description: `Code cannot have 3 or 4 identical consecutive digits.`, variant: "destructive" });
      return;
    }

    setIsSubmittingSecret(true);
    console.log(`[MultiplayerSecretSetup] Game ${gameId}: Emitting 'send-secret'. PlayerID: ${myPlayerId}, Secret: ${currentDigits.join('')}`);
    socketRef.current.emit('send-secret', { gameId, playerId: myPlayerId, secret: currentDigits });
    localStorage.setItem(`mySecret_${gameId}_${myPlayerId}`, JSON.stringify(currentDigits)); 
  };

  const handleStartGame = () => {
    if (!socketRef.current || !myPlayerId || myPlayerId !== "player1" || !gameId || !gameRoomState || gameRoomState.status !== 'READY_TO_START') {
      toast({ title: "Cannot Start Game", description: "Not host or game not ready.", variant: "destructive" });
      return;
    }
    console.log(`[MultiplayerSecretSetup] Game ${gameId}: Emitting 'request-start-game'. PlayerID (Host): ${myPlayerId}`);
    socketRef.current.emit('request-start-game', { gameId });
  };


  if (!gameId || !playerCountParam ) { 
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] py-8">
        <Card className="w-full max-w-md text-center"><CardHeader><CardTitle>Error</CardTitle></CardHeader><CardContent><p>Invalid game setup parameters.</p><Button onClick={() => handleBackToModeSelect(false)} className="mt-4">Back</Button></CardContent></Card>
      </div>
    );
  }
  
  if (connectionStatus === "connecting" || (connectionStatus === "connected" && !myPlayerId && (!gameRoomState || gameRoomState.status === 'WAITING_FOR_PLAYERS')) ) {
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] py-8">
        <Card className="w-full max-w-lg mx-auto shadow-xl"><CardHeader className="text-center">
            <CardTitle className="text-3xl text-primary flex items-center justify-center"><Loader2 className="mr-3 h-8 w-8 animate-spin" /> 
              {connectionStatus === "connecting" && "Connecting..."}
              {connectionStatus === "connected" && !myPlayerId && "Joining Room..."}
              {connectionStatus === "connected" && myPlayerId && !gameRoomState && "Loading Game..."}
            </CardTitle>
            <CardDescription className="pt-2">Attempting to connect to Game ID: {gameId}</CardDescription>
        </CardHeader></Card>
      </div>);
  }

  if (connectionStatus === "failed" || connectionStatus === "error" || connectionStatus === "room_full") {
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] py-8">
        <Card className="w-full max-w-lg mx-auto shadow-xl"><CardHeader className="text-center">
            <CardTitle className="text-3xl text-destructive">
              {connectionStatus === "room_full" ? "Game Unavailable" : "Connection Problem"}
            </CardTitle>
            <CardDescription className="pt-2">
              {connectionStatus === "failed" && "Could not connect to the game server."}
              {connectionStatus === "error" && "An error occurred while trying to join."}
              {connectionStatus === "room_full" && "This game room is full or an invalid session was detected."}
            </CardDescription></CardHeader>
          <CardFooter><Button onClick={() => handleBackToModeSelect(false)} className="w-full">Back to Mode Select</Button></CardFooter></Card>
      </div>);
  }

  if (!gameRoomState) {
    return (
         <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] py-8">
            <Card className="w-full max-w-lg mx-auto shadow-xl"><CardHeader className="text-center">
                <CardTitle className="text-3xl text-primary flex items-center justify-center"><Loader2 className="mr-3 h-8 w-8 animate-spin" /> Initializing Room...</CardTitle>
                <CardDescription className="pt-2">My ID: {myPlayerId || "Assigning..."} ({username || "Guest"})</CardDescription>
            </CardHeader></Card>
          </div>);
  }

  const localPlayerServerData = myPlayerId && gameRoomState.players ? gameRoomState.players[myPlayerId] : null;
  const localPlayerIsReady = !!(localPlayerServerData && localPlayerServerData.isReady); 
  const localPlayerHasSetSecret = !!(localPlayerServerData && localPlayerServerData.hasSetSecret); 

  const numberOfActivePlayers = gameRoomState.players ? Object.values(gameRoomState.players).filter(p => p.socketId).length : 0;
  const myDisplayName = localPlayerServerData?.displayName || username || myPlayerId || "You";

  const getWaitingMessage = () => {
    if (!gameRoomState) return "Loading...";
    switch(gameRoomState.status) {
      case 'WAITING_FOR_PLAYERS':
        return `Waiting for players... (${numberOfActivePlayers}/${expectedPlayerCount})`;
      case 'WAITING_FOR_READY':
        const readyCount = gameRoomState.players ? Object.values(gameRoomState.players).filter(p => p.isReady && p.socketId).length : 0;
        return `Waiting for secrets... (${readyCount}/${expectedPlayerCount} ready)`;
      case 'READY_TO_START':
        return myPlayerId === "player1" ? "All ready. Start the game!" : `Waiting for ${gameRoomState.players['player1']?.displayName || 'Host'} to start.`;
      default:
        return `Status: ${gameRoomState.status}`;
    }
  };

  const canSetSecret = myPlayerId && localPlayerServerData && !localPlayerServerData.isReady && !localPlayerServerData.hasSetSecret &&
                       (gameRoomState.status === 'WAITING_FOR_READY' || 
                        (gameRoomState.status === 'WAITING_FOR_PLAYERS' && numberOfActivePlayers === expectedPlayerCount) ||
                        (gameRoomState.status === 'READY_TO_START' && !localPlayerServerData.isReady) 
                       );
  
  const showSubmittingLoader = isSubmittingSecret && !localPlayerHasSetSecret;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] py-8">
      <Card className="w-full max-w-lg mx-auto shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl text-primary flex items-center justify-center">
            {myPlayerId ? <UserCheck className="mr-3 h-8 w-8" /> : <LockKeyhole className="mr-3 h-8 w-8" />}
            {myPlayerId ? `Welcome, ${myDisplayName}` : "Joining..."}
          </CardTitle>
          <CardDescription className="pt-2">
            Game ID: <span className="font-mono text-sm text-accent">{gameId}</span> ({playerCountParam}) <br/>
            {canSetSecret && `Enter your ${CODE_LENGTH}-digit secret.`}
            <span className="flex items-center justify-center mt-2">
                {(gameRoomState.status === 'WAITING_FOR_PLAYERS' || gameRoomState.status === 'WAITING_FOR_READY') && <Hourglass className="mr-2 h-4 w-4 animate-spin" />}
                {getWaitingMessage()}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canSetSecret && (
            <div className="space-y-6">
              <DigitInput count={CODE_LENGTH} values={currentDigits} onChange={setCurrentDigits} disabled={showSubmittingLoader} ariaLabel={`Secret digit for ${myDisplayName}`}/>
              <Button onClick={handleSecretSubmit} className="w-full" disabled={showSubmittingLoader} size="lg">
                {showSubmittingLoader ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : `Confirm Secret & Ready Up`}
              </Button>
            </div>
          )}
          {localPlayerHasSetSecret && (<p className="text-center text-lg text-green-500">Your secret is set! You are ready.</p>)}

          <div className="mt-6 border-t pt-4">
            <h4 className="text-lg font-semibold mb-2 text-center">Players ({numberOfActivePlayers}/{expectedPlayerCount})</h4>
            <ul className="space-y-2">
              {gameRoomState.players && Object.entries(gameRoomState.players).map(([pId, playerData]) => {
                if (!playerData.socketId && pId !== myPlayerId && !playerData.isReady) return null; 
                const displayName = playerData.displayName || pId;
                return (
                  <li key={pId} className={`flex justify-between items-center p-3 rounded-md ${playerData.socketId ? 'bg-card' : 'bg-muted/50 opacity-60'}`}>
                    <span className="font-semibold">{pId === myPlayerId ? `${displayName} (You)` : displayName}</span>
                    {playerData.socketId ? (
                        playerData.isReady ? 
                        <span className="text-green-400 flex items-center"><ShieldCheck className="mr-1 h-5 w-5"/>Ready</span> : 
                        <span className="text-yellow-400 flex items-center"><ShieldAlert className="mr-1 h-5 w-5"/>Setting Secret...</span>
                    ) : (
                        playerData.isReady ? 
                        <span className="text-orange-400 flex items-center"><ShieldCheck className="mr-1 h-5 w-5"/>Ready (DC)</span> :
                        <span className="text-red-500">Disconnected</span>
                    )}
                  </li>);
              })}
            </ul>
          </div>

          {myPlayerId === "player1" && gameRoomState.status === 'READY_TO_START' && (
            <Button onClick={handleStartGame} className="w-full mt-6" size="lg">
              <Play className="mr-2 h-5 w-5" /> Start Game
            </Button>
          )}

        </CardContent>
         <CardFooter className="flex flex-col items-center">
            <p className="text-xs text-muted-foreground">Room Status: {gameRoomState.status || "Loading..."}</p>
            <Button variant="link" size="sm" onClick={() => handleBackToModeSelect()} className="mt-2">Exit Game</Button>
         </CardFooter>
      </Card>
    </div>
  );
}

