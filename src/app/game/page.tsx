
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
import { CODE_LENGTH, calculateFeedback, checkWin, generateComputerGuess, calculatePlayerScore } from '@/lib/gameLogic';
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
        // Initial target for multiplayer games (player 0 targets player 1)
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


  const gameModeForTurnLogic = activeGameData?.gameMode;
  const numPlayersForTurnLogic = activeGameData?.players?.length;

  const advanceTurn = useCallback(() => {
    if (!gameModeForTurnLogic || !numPlayersForTurnLogic || numPlayersForTurnLogic <= 1) return;

    setCurrentPlayerIndex(prevPlayerIndex => {
      const nextPlayerIdx = (prevPlayerIndex + 1) % numPlayersForTurnLogic;
      
      if (gameModeForTurnLogic === 'computer') {
        // Computer (player 1) targets human (player 0), human targets computer.
        // If prevPlayerIndex was human (0), next is computer (1). Target for computer is human (0 -> prevPlayerIndex).
        // If prevPlayerIndex was computer (1), next is human (0). Target for human is computer (1 -> prevPlayerIndex).
        setCurrentTargetIndex(prevPlayerIndex);
      } else {
        // Basic multiplayer turn logic: next player targets player after them (cyclical)
        let nextTargetIdxVal = (nextPlayerIdx + 1) % numPlayersForTurnLogic;
        // Ensure player doesn't target themselves if only 2 players and one is eliminated (not handled yet)
        // or in a 2 player game. For now, simple cycle.
        if (nextTargetIdxVal === nextPlayerIdx && numPlayersForTurnLogic > 1) { 
          nextTargetIdxVal = (nextTargetIdxVal + 1) % numPlayersForTurnLogic;
        }
        setCurrentTargetIndex(nextTargetIdxVal);
      }
      return nextPlayerIdx;
    });
  }, [gameModeForTurnLogic, numPlayersForTurnLogic]);


  const handlePlayerGuess = (guessValue: string) => {
    const currentPlayer = players[currentPlayerIndex];
    const targetPlayer = players[currentTargetIndex];

    if (winner || !currentPlayer || currentPlayer.isComputer || !targetPlayer || !targetPlayer.secretCode) return;

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

  // Refs to hold the latest state for use in makeComputerGuess callback
  const playersRef = useRef(players);
  const currentTargetIndexRef = useRef(currentTargetIndex);
  const winnerRef = useRef(winner);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);
  useEffect(() => {
    currentTargetIndexRef.current = currentTargetIndex;
  }, [currentTargetIndex]);
  useEffect(() => {
    winnerRef.current = winner;
  }, [winner]);


  const makeComputerGuess = useCallback(() => {
    const currentPlayers = playersRef.current;
    const currentTargetIdx = currentTargetIndexRef.current;
    const gameWinner = winnerRef.current; // Use ref for winner check inside timeout

    // currentPlayerIndex is from the useCallback's closure, which is stable for this call
    const computerPlayer = currentPlayers[currentPlayerIndex]; 
    const targetHumanPlayer = currentPlayers[currentTargetIdx];

    if (gameWinner || !computerPlayer || !computerPlayer.isComputer || !targetHumanPlayer || !targetHumanPlayer.secretCode) {
      return;
    }
    
    const previousComputerGuessValues = computerPlayer.guesses
        .filter(g => g.targetId === targetHumanPlayer.id)
        .map(g => g.value);

    const computerGuessValue = generateComputerGuess(previousComputerGuessValues);
    const feedback = calculateFeedback(computerGuessValue, targetHumanPlayer.secretCode);
    
    const newGuess: Guess = { 
      id: `comp-vs-${targetHumanPlayer.id}-${Date.now()}`, 
      guesserId: computerPlayer.id,
      targetId: targetHumanPlayer.id,
      value: computerGuessValue, 
      feedback, 
      isPlayer: false 
    };
    
    const updatedComputerGuesses = [...computerPlayer.guesses, newGuess];
    const updatedComputerScore = calculatePlayerScore(updatedComputerGuesses);

    setPlayers(prev => {
      const compPlayerId = prev[currentPlayerIndex]?.id; // Get ID from prevPlayers based on index
      if (!compPlayerId) return prev;
      return prev.map(p =>
        p.id === compPlayerId ? { ...p, guesses: updatedComputerGuesses, score: updatedComputerScore } : p
      );
    });
    updatePlayerInGameDataFunctional(computerPlayer.id, {guesses: updatedComputerGuesses, score: updatedComputerScore});

    toast({
      title: `${computerPlayer.name} Guessed!`,
      description: `${computerPlayer.name} guessed: ${computerGuessValue} against ${targetHumanPlayer.name}`,
    });

    if (checkWin(feedback)) {
      setWinner(computerPlayer); // This uses the 'computerPlayer' object from this function's scope
      setRevealCodes(true);
    } else {
      advanceTurn();
    }
  }, [ currentPlayerIndex, // To correctly identify the computer player in playersRef
       toast, updatePlayerInGameDataFunctional, setWinner, setRevealCodes, advanceTurn]);
  
  useEffect(() => {
    const currentPlayer = players[currentPlayerIndex]; // Read from current state for condition
    if (!isLoading && currentPlayer?.isComputer && !winner) {
      const timer = setTimeout(() => {
        makeComputerGuess();
      }, 1500); 
      return () => clearTimeout(timer);
    }
    // This useEffect re-runs if players, currentPlayerIndex, winner, or isLoading change.
    // `makeComputerGuess` is stable due to refs and careful dependencies.
    // If `players` changes (e.g. human guess), effect re-runs. If still computer's turn (unlikely after human guess), new timer.
    // If `currentPlayerIndex` changes to computer, timer is set.
    // If `winner` is set, no timer.
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
              secretCode: p.isComputer ? generateSecretCode() : (p.isHost ? p.secretCode : '') // Reset non-host codes, re-gen computer
            }));

            const newGameData = {
              ...activeGameData, 
              gameStatus: 'lobby' as const, 
              players: resetPlayers
            };
             
            setActiveGameData(newGameData);
             
            if(localStorage.getItem('locked-codes-all-games')){
                 const allGames = JSON.parse(localStorage.getItem('locked-codes-all-games')!) as Record<string, ActiveGameData>;
                 if(allGames[activeGameData.gameId!]){ // gameId must exist for multiplayer
                     allGames[activeGameData.gameId!] = newGameData;
                     localStorage.setItem('locked-codes-all-games', JSON.stringify(allGames));
                 }
            }

            if(activeGameData.multiplayerRole === 'host'){
                router.push(`/host-lobby/${activeGameData.gameId}`);
            } else if (activeGameData.multiplayerRole === 'join') { 
                 router.push(`/player-lobby/${activeGameData.gameId}`);
            } else { // Should not happen in multiplayer context, but as fallback
                router.push('/select-mode');
            }
        } else { // For 'computer' mode or others not fitting multiplayer reset
            router.push('/select-mode'); 
        }
    } else { 
        router.push('/select-mode'); 
    }
  };

  const handleExitGame = () => {
    // No need to modify allGames here for exit, only activeGameData for current user
    setActiveGameData(null);
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
  if(isMyTurnToGuess && playerBeingGuessed){
    turnIndicatorText = `Your Turn, ${turnIndicatorPlayerName}! Guess ${turnIndicatorTargetName}'s code.`;
  } else if (activePlayerToGuess && playerBeingGuessed && activePlayerToGuess.isComputer) {
    turnIndicatorText = `${turnIndicatorPlayerName} is thinking...`;
  } else if (activePlayerToGuess && playerBeingGuessed) {
    turnIndicatorText = `${turnIndicatorPlayerName} is guessing ${turnIndicatorTargetName}'s code...`;
  }


  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 bg-background">
      <header className="w-full max-w-4xl flex justify-between items-center mb-4">
        <GameLogo size="small" />
        <Button variant="destructive" onClick={handleExitGame} size="sm">
          <LogOut className="w-4 h-4 mr-2" />
          Exit Game
        </Button>
      </header>

      {activePlayerToGuess && playerBeingGuessed && (
        <div className="my-4 sm:my-6 p-3 rounded-md bg-card border border-border shadow-md w-full max-w-lg text-center">
            <p className={`text-lg sm:text-xl font-semibold ${isMyTurnToGuess ? 'text-primary' : 'text-muted-foreground'}`}>
                {turnIndicatorText}
            </p>
        </div>
      )}

      <main className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${players.length > 2 ? '2' : '2'} xl:grid-cols-${players.length > 2 ? (players.length === 3 ? 3 : 4) : (players.length === 1 ? 1 : 2)} gap-4 sm:gap-6 mb-6 auto-rows-fr`}>
        {players.map((player) => {
            const guessesByThisPlayerAgainstCurrentTarget = player.guesses.filter(g => {
                // For "vs Computer", computer guesses against human (index 0), human guesses against computer (index 1)
                if(activeGameData.gameMode === 'computer'){
                    return player.isComputer ? g.targetId === players[0]?.id : g.targetId === players[1]?.id;
                }
                // For multiplayer, show guesses made by this player (player.id) against playerBeingGuessed.id
                // This logic needs refinement for proper multiplayer views where each panel shows guesses against *that panel's owner*.
                // For now, we'll simplify: PlayerPanel shows guesses *BY* this player.
                return g.guesserId === player.id; 
            });
            return (
              <PlayerPanel
                key={player.id}
                playerName={player.name + (player.id === username ? " (You)" : "")}
                guesses={guessesByThisPlayerAgainstCurrentTarget} 
                isCurrentTurn={player.id === activePlayerToGuess?.id && !winner}
                secretCodeToDisplay={revealCodes || player.id === username || (winner && player.isComputer) ? player.secretCode : "****"} 
              />
            );
        })}
      </main>

      {isMyTurnToGuess && playerBeingGuessed && ( 
        <GuessInput onSubmitGuess={handlePlayerGuess} disabled={!isMyTurnToGuess || revealCodes} />
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
