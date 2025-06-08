
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import GameLogo from '@/components/game-logo';
import useLocalStorage from '@/hooks/use-local-storage';
import PlayerPanel from './components/PlayerPanel';
import GuessInput from './components/GuessInput';
import GameEndDialog from './components/GameEndDialog';
import type { Guess, Player, ActiveGameData } from '@/lib/gameTypes';
import { CODE_LENGTH, calculateFeedback, checkWin, generateComputerGuess, calculatePlayerScore, generateSecretCode } from '@/lib/gameLogic';
import { LogOut } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

const REVEAL_DELAY_MS = 3000;

export default function GamePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [username] = useLocalStorage<string>('locked-codes-username', '');
  const [activeGameData, setActiveGameData] = useLocalStorage<ActiveGameData | null>('locked-codes-active-game', null);
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [currentTargetIndex, setCurrentTargetIndex] = useState<number>(0);
  
  const [winner, setWinner] = useState<Player | null>(null);
  const [isGameEndDialogOpen, setIsGameEndDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [revealCodes, setRevealCodes] = useState<boolean>(false);

  // Refs for values needed in callbacks that shouldn't cause callback re-creation
  const playersRef = useRef(players);
  const winnerRef = useRef(winner);
  const gameModeRef = useRef(activeGameData?.gameMode);
  const numPlayersRef = useRef(activeGameData?.players?.length);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    winnerRef.current = winner;
  }, [winner]);

  useEffect(() => {
    gameModeRef.current = activeGameData?.gameMode;
    numPlayersRef.current = activeGameData?.players?.length;
  }, [activeGameData?.gameMode, activeGameData?.players?.length]);


  const initializeGame = useCallback(() => {
    setIsLoading(true);
    if (!username || !activeGameData || !activeGameData.players || activeGameData.players.length === 0 || activeGameData.gameStatus !== 'playing') {
      toast({ title: "Error", description: "Game data not found, incomplete, or not started. Redirecting...", variant: "destructive" });
      router.push('/');
      return;
    }
    
    setPlayers(activeGameData.players);
    setCurrentPlayerIndex(0); 

    if (activeGameData.players.length > 1) {
      if (activeGameData.gameMode === 'computer') {
        setCurrentTargetIndex(1); 
      } else {
        setCurrentTargetIndex(1 % activeGameData.players.length);
      }
    } else {
      setCurrentTargetIndex(0); 
    }
    
    setWinner(null);
    setIsGameEndDialogOpen(false);
    setRevealCodes(false);
    setIsLoading(false);

  }, [username, activeGameData, router, toast]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);
  
  useEffect(() => {
    if (winner && !isGameEndDialogOpen) { 
      const timer = setTimeout(() => {
        setIsGameEndDialogOpen(true);
      }, REVEAL_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [winner, isGameEndDialogOpen]);

  const updatePlayerInGameDataFunctional = useCallback((playerId: string, updatedData: {guesses: Guess[], score: number}) => {
    setActiveGameData(prevActiveGameData => {
      if (!prevActiveGameData || !prevActiveGameData.players) return prevActiveGameData;

      const updatedPlayersArray = prevActiveGameData.players.map(p =>
        p.id === playerId ? { ...p, ...updatedData } : p
      );
      const newActiveGameData = { ...prevActiveGameData, players: updatedPlayersArray };

      if (newActiveGameData.gameId) {
        const allGames = JSON.parse(localStorage.getItem('locked-codes-all-games') || '{}') as Record<string, ActiveGameData>;
        if (allGames[newActiveGameData.gameId]) {
          allGames[newActiveGameData.gameId] = newActiveGameData;
          localStorage.setItem('locked-codes-all-games', JSON.stringify(allGames));
        }
      }
      return newActiveGameData;
    });
  }, [setActiveGameData]);


  const advanceTurn = useCallback(() => {
    const currentNumPlayers = numPlayersRef.current;
    const currentGameMode = gameModeRef.current;

    if (!currentGameMode || !currentNumPlayers || currentNumPlayers <= 1) return;

    setCurrentPlayerIndex(prevPlayerIndex => {
      const nextPlayerIdx = (prevPlayerIndex + 1) % currentNumPlayers;
      
      if (currentGameMode === 'computer') {
        setCurrentTargetIndex(nextPlayerIdx === 0 ? 1 : 0); 
      } else {
        let nextTargetIdxVal = (nextPlayerIdx + 1) % currentNumPlayers;
        if (nextTargetIdxVal === nextPlayerIdx && currentNumPlayers > 1) { 
          nextTargetIdxVal = (nextTargetIdxVal + 1) % currentNumPlayers;
        }
        setCurrentTargetIndex(nextTargetIdxVal);
      }
      return nextPlayerIdx;
    });
  }, [setCurrentPlayerIndex, setCurrentTargetIndex]); 


  const handlePlayerGuess = (guessValue: string) => {
    const currentPlayer = playersRef.current[currentPlayerIndex];
    const targetPlayer = playersRef.current[currentTargetIndex];

    if (winnerRef.current || !currentPlayer || currentPlayer.isComputer || !targetPlayer || !targetPlayer.secretCode) return;

    if (guessValue.length !== CODE_LENGTH || !/^\d+$/.test(guessValue)) {
      toast({ title: "Invalid Guess", description: `Guess must be ${CODE_LENGTH} digits.`, variant: "destructive" });
      return;
    }
    
    const feedback = calculateFeedback(guessValue, targetPlayer.secretCode);
    const newGuess: Guess = { 
      id: `${currentPlayer.id}-vs-${targetPlayer.id}-${Date.now()}`, 
      guesserId: currentPlayer.id, 
      targetId: targetPlayer.id,
      value: guessValue, 
      feedback, 
      isPlayer: !currentPlayer.isComputer 
    };
    
    const updatedPlayerGuesses = [...currentPlayer.guesses, newGuess];
    const updatedPlayerScore = calculatePlayerScore(updatedPlayerGuesses); 

    setPlayers(prev => prev.map(p => 
      p.id === currentPlayer.id ? { ...p, guesses: updatedPlayerGuesses, score: updatedPlayerScore } : p
    ));
    updatePlayerInGameDataFunctional(currentPlayer.id, {guesses: updatedPlayerGuesses, score: updatedPlayerScore});

    if (checkWin(feedback)) {
      setWinner(currentPlayer);
      setRevealCodes(true); 
    } else {
      advanceTurn();
    }
  };
  
  const makeComputerGuess = useCallback(() => {
    const currentPlayersDirect = playersRef.current; 
    const gameWinnerDirect = winnerRef.current; 
    const currentGameModeDirect = gameModeRef.current; 

    if (gameWinnerDirect || !currentPlayersDirect || currentPlayersDirect.length < 2 || currentGameModeDirect !== 'computer') {
      return;
    }

    // currentPlayerIndex is the computer's index when this is called
    const computerPlayer = currentPlayersDirect[currentPlayerIndex]; 
    // In 'vs Computer', human is index 0, computer is index 1. If computer is current (1), target is (0).
    const humanPlayer = currentPlayersDirect[currentPlayerIndex === 0 ? 1 : 0]; 

    if (!computerPlayer || !computerPlayer.isComputer || !humanPlayer || !humanPlayer.secretCode) {
      return;
    }
    
    const previousComputerGuessValues = computerPlayer.guesses.map(g => g.value);
    const computerGuessValue = generateComputerGuess(previousComputerGuessValues);
    const feedback = calculateFeedback(computerGuessValue, humanPlayer.secretCode);
    
    const newGuess: Guess = { 
      id: `comp-vs-${humanPlayer.id}-${Date.now()}`, 
      guesserId: computerPlayer.id,
      targetId: humanPlayer.id,
      value: computerGuessValue, 
      feedback, 
      isPlayer: false 
    };
    
    const updatedComputerGuesses = [...computerPlayer.guesses, newGuess];
    const updatedComputerScore = calculatePlayerScore(updatedComputerGuesses);

    setPlayers(prev => prev.map(p =>
        p.id === computerPlayer.id ? { ...p, guesses: updatedComputerGuesses, score: updatedComputerScore } : p
    ));
    updatePlayerInGameDataFunctional(computerPlayer.id, {guesses: updatedComputerGuesses, score: updatedComputerScore});

    toast({
      title: `${computerPlayer.name} Guessed!`,
      description: `${computerPlayer.name} guessed: ${computerGuessValue} against ${humanPlayer.name}`,
    });

    if (checkWin(feedback)) {
      setWinner(computerPlayer);
      setRevealCodes(true);
    } else {
      advanceTurn();
    }
  }, [currentPlayerIndex, toast, updatePlayerInGameDataFunctional, advanceTurn, setPlayers, setWinner, setRevealCodes ]); 
  
  useEffect(() => {
    const currentPlayerEntity = players[currentPlayerIndex];
    
    if (!isLoading && currentPlayerEntity?.isComputer && !winner) {
      const timer = setTimeout(() => {
        makeComputerGuess();
      }, 1500); 
      return () => clearTimeout(timer);
    }
  }, [isLoading, players, currentPlayerIndex, winner, makeComputerGuess]);


  const handlePlayAgain = () => {
    setIsGameEndDialogOpen(false);
    setWinner(null);
    setRevealCodes(false);
    
    if (activeGameData) {
        const isMultiplayer = activeGameData.gameId && (activeGameData.gameMode === 'duo' || activeGameData.gameMode === 'trio' || activeGameData.gameMode === 'quads');
        
        if (isMultiplayer) {
            const resetPlayers = activeGameData.players.map(p => ({
              ...p, 
              guesses:[], 
              score:0, 
              isReady: p.isHost ? true : false, 
              secretCode: p.isComputer ? generateSecretCode() : (p.isHost ? p.secretCode : '') 
            }));

            const newGameData = {
              ...activeGameData, 
              gameStatus: 'lobby' as const, 
              players: resetPlayers
            };
             
            setActiveGameData(newGameData);
             
            if(localStorage.getItem('locked-codes-all-games')){
                 const allGames = JSON.parse(localStorage.getItem('locked-codes-all-games')!) as Record<string, ActiveGameData>;
                 if(activeGameData.gameId!){ 
                     allGames[activeGameData.gameId!] = newGameData;
                     localStorage.setItem('locked-codes-all-games', JSON.stringify(allGames));
                 }
            }

            if(activeGameData.multiplayerRole === 'host'){
                router.push(`/host-lobby/${activeGameData.gameId}`);
            } else if (activeGameData.multiplayerRole === 'join') { 
                 router.push(`/player-lobby/${activeGameData.gameId}`);
            } else { 
                router.push('/select-mode');
            }
        } else { 
             router.push('/enter-code');
        }
    } else { 
        router.push('/select-mode'); 
    }
  };

  const handleExitGame = () => {
    setActiveGameData(null); 
    if (activeGameData && activeGameData.gameId && activeGameData.multiplayerRole) {
        const allGamesStored = localStorage.getItem('locked-codes-all-games');
        if (allGamesStored) {
            const allGames = JSON.parse(allGamesStored) as Record<string, ActiveGameData>;
            if (allGames[activeGameData.gameId]) {
                allGames[activeGameData.gameId].players = allGames[activeGameData.gameId].players.filter(p => p.id !== username);
                if (allGames[activeGameData.gameId].players.length === 0 && activeGameData.multiplayerRole === 'host') { // Only host can effectively "delete" the game by being last one out or explicitly
                     delete allGames[activeGameData.gameId];
                } else if (allGames[activeGameData.gameId].players.length === 0) { // If a joiner is last, game might still persist if host is expected
                     delete allGames[activeGameData.gameId]; // Or mark as abandoned
                }
                localStorage.setItem('locked-codes-all-games', JSON.stringify(allGames));
            }
        }
    }
    router.push('/');
  };
  
  const leaderboardData = players.map(p => ({ name: p.name, score: p.score })).sort((a,b) => b.score - a.score);

  if (isLoading || players.length === 0 || !activeGameData) {
    const skeletonPlayerCount = activeGameData?.numberOfPlayers || 2;
    return (
      <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 bg-background">
        <header className="w-full max-w-4xl flex justify-between items-center mb-4">
          <Skeleton className="h-10 w-28" /> 
          <Skeleton className="h-9 w-24" /> 
        </header>
        <Skeleton className="my-4 sm:my-6 p-3 h-12 w-full max-w-md" /> 
        <main className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
          {[...Array(Math.min(skeletonPlayerCount, 4))].map((_, i) => ( 
            <Card key={i} className="w-full">
              <CardHeader>
                <Skeleton className="h-7 w-1/2 mb-1" /> 
                <Skeleton className="h-4 w-3/4" /> 
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/3 mb-2" /> 
                <div className="space-y-3 h-48 sm:h-64 pr-3 overflow-hidden">
                  {[...Array(3)].map((_, j) => (
                     <Skeleton key={j} className="h-10 sm:h-12 w-full" /> 
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </main>
        <Skeleton className="h-12 w-full max-w-xs sm:max-w-sm" /> 
      </div>
    );
  }
  
  const activePlayerToGuess = players[currentPlayerIndex]; 
  const playerBeingGuessed = players[currentTargetIndex]; 

  const isMyTurnToGuess = activePlayerToGuess && activePlayerToGuess.id === username && !activePlayerToGuess.isComputer && !winner;

  const turnIndicatorPlayerName = activePlayerToGuess ? activePlayerToGuess.name : "Someone";
  const turnIndicatorTargetName = playerBeingGuessed ? playerBeingGuessed.name : "Someone";
  
  let turnIndicatorText = `Waiting for ${turnIndicatorPlayerName}...`;
  if(winner){
    turnIndicatorText = winner.id === username ? "You cracked the code!" : `${winner.name} cracked the code!`;
  } else if(isMyTurnToGuess && playerBeingGuessed){
    turnIndicatorText = `Your Turn, ${turnIndicatorPlayerName}! Guess ${turnIndicatorTargetName}'s code.`;
  } else if (activePlayerToGuess && playerBeingGuessed && activePlayerToGuess.isComputer) {
    turnIndicatorText = `${turnIndicatorPlayerName} is thinking...`;
  } else if (activePlayerToGuess && playerBeingGuessed) { // Other player's turn (multiplayer)
    turnIndicatorText = `${turnIndicatorPlayerName} is guessing ${turnIndicatorTargetName}'s code...`;
  }


  const getDynamicGridClasses = () => {
    const num = players.length;
    if (num === 1) return "md:grid-cols-1 lg:grid-cols-1 xl:grid-cols-1";
    if (num === 2) return "md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2";
    if (num === 3) return "md:grid-cols-1 lg:grid-cols-3 xl:grid-cols-3"; // 3 cols on large, 1 on md to prevent squishing
    if (num >= 4) return "md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4"; // 2 on md/lg, 4 on xl
    return "md:grid-cols-2"; // Default
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 bg-background">
      <header className="w-full max-w-5xl flex justify-between items-center mb-4">
        <GameLogo size="small" />
        <Button variant="destructive" onClick={handleExitGame} size="sm">
          <LogOut className="w-4 h-4 mr-2" />
          Exit Game
        </Button>
      </header>

      {activePlayerToGuess && ( 
        <div className="my-4 sm:my-6 p-3 rounded-md bg-card border border-border shadow-md w-full max-w-lg text-center">
            <p className={`text-lg sm:text-xl font-semibold ${isMyTurnToGuess ? 'text-primary' : 'text-muted-foreground'}`}>
                {turnIndicatorText}
            </p>
        </div>
      )}

      <main className={`w-full max-w-5xl grid grid-cols-1 ${getDynamicGridClasses()} gap-4 sm:gap-6 mb-6 auto-rows-fr`}>
        {players.map((player) => (
            <PlayerPanel
                key={player.id}
                playerName={player.name + (player.id === username ? " (You)" : "")}
                guesses={player.guesses} 
                isCurrentTurn={player.id === activePlayerToGuess?.id && !winner}
                secretCodeToDisplay={revealCodes || player.id === username || (winner && player.isComputer) ? player.secretCode : "****"} 
            />
        ))}
      </main>

      {isMyTurnToGuess && playerBeingGuessed && ( 
        <GuessInput onSubmitGuess={handlePlayerGuess} disabled={!isMyTurnToGuess || revealCodes || !!winner} />
      )}
      
      <GameEndDialog
        isOpen={isGameEndDialogOpen}
        winnerName={winner ? winner.name : null}
        leaderboardData={leaderboardData}
        onPlayAgain={handlePlayAgain}
        onExitGame={handleExitGame}
        onClose={() => setIsGameEndDialogOpen(false)} 
      />
    </div>
  );
}
        
        
        
      
