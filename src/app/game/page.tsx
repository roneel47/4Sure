
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
const COMPUTER_THINK_DELAY_MS = 1500;

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

  const gameModeRef = useRef(activeGameData?.gameMode);
  const numPlayersRef = useRef(activeGameData?.players?.length);
  const playersRef = useRef(players);
  const currentPlayerIndexRef = useRef(currentPlayerIndex);
  const currentTargetIndexRef = useRef(currentTargetIndex);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    currentPlayerIndexRef.current = currentPlayerIndex;
  }, [currentPlayerIndex]);

  useEffect(() => {
    currentTargetIndexRef.current = currentTargetIndex;
  }, [currentTargetIndex]);

  useEffect(() => {
    gameModeRef.current = activeGameData?.gameMode;
    numPlayersRef.current = activeGameData?.players?.length;
  }, [activeGameData?.gameMode, activeGameData?.players?.length]);


  const initializeGame = useCallback(() => {
    setIsLoading(true);
    if (!username || !activeGameData || !activeGameData.players || activeGameData.players.length === 0 || activeGameData.gameStatus !== 'playing') {
      toast({ title: "Error", description: "Game data not found or not ready. Redirecting...", variant: "destructive" });
      router.push(activeGameData?.gameMode === 'computer' ? '/enter-code' : '/select-mode');
      return;
    }
    
    setPlayers(activeGameData.players);
    setCurrentPlayerIndex(0); 

    if (activeGameData.gameMode === 'computer') {
      setCurrentTargetIndex(1); 
    } else if (activeGameData.players.length > 1) {
      setCurrentTargetIndex(1 % activeGameData.players.length);
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

  const updatePlayerInGameDataFunctional = useCallback((playerId: string, updatedPlayerData: Partial<Player>) => {
    setActiveGameData(prevActiveGameData => {
      if (!prevActiveGameData || !prevActiveGameData.players) return prevActiveGameData;

      const updatedPlayersArray = prevActiveGameData.players.map(p =>
        p.id === playerId ? { ...p, ...updatedPlayerData } : p
      );
      const newActiveGameData = { ...prevActiveGameData, players: updatedPlayersArray };

      if (newActiveGameData.gameId) { 
        const allGamesRaw = localStorage.getItem('locked-codes-all-games');
        if (allGamesRaw) {
          try {
            const allGames = JSON.parse(allGamesRaw) as Record<string, ActiveGameData>;
            if (allGames[newActiveGameData.gameId]) {
              allGames[newActiveGameData.gameId] = newActiveGameData;
              localStorage.setItem('locked-codes-all-games', JSON.stringify(allGames));
            }
          } catch (e) {
            console.error("Failed to parse or update allGames in localStorage", e);
          }
        }
      }
      return newActiveGameData;
    });
  }, [setActiveGameData]);


  const advanceTurn = useCallback(() => {
    const currentNumPlayers = numPlayersRef.current;
    const currentGameMode = gameModeRef.current;
  
    if (!currentGameMode || typeof currentNumPlayers !== 'number' || currentNumPlayers <= 0) {
      console.error("Cannot advance turn: invalid game state", { currentGameMode, currentNumPlayers });
      return;
    }
  
    setCurrentPlayerIndex(prevPlayerIndex => {
      const nextPlayerIdx = (prevPlayerIndex + 1) % currentNumPlayers;
  
      if (currentGameMode === 'computer') {
        setCurrentTargetIndex(nextPlayerIdx === 0 ? 1 : 0);
      } else { 
        if (currentNumPlayers === 1) { 
          setCurrentTargetIndex(0);
        } else {
            let targetOffset = 1;
            let nextTargetIdxVal = (nextPlayerIdx + targetOffset) % currentNumPlayers;
            while(nextTargetIdxVal === nextPlayerIdx && currentNumPlayers > 1) {
                targetOffset++;
                nextTargetIdxVal = (nextPlayerIdx + targetOffset) % currentNumPlayers;
                if (targetOffset > currentNumPlayers * 2) break; 
            }
             setCurrentTargetIndex(nextTargetIdxVal);
          }
        }
      return nextPlayerIdx;
    });
  }, [setCurrentPlayerIndex, setCurrentTargetIndex]);


  const handlePlayerGuess = useCallback((guessValue: string) => {
    if (winner || playersRef.current.length === 0) return;

    const currentPlayer = playersRef.current[currentPlayerIndexRef.current];
    const targetPlayer = playersRef.current[currentTargetIndexRef.current];

    if (!currentPlayer || currentPlayer.isComputer || !targetPlayer || !targetPlayer.secretCode) {
      console.error("Invalid state for player guess", { currentPlayer, targetPlayer, winner });
      return;
    }

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
    
    setPlayers(prevPlayers => {
        const updatedPlayers = prevPlayers.map(p => {
            if (p.id === currentPlayer.id) {
                const updatedGuesses = [...p.guesses, newGuess];
                const updatedScore = calculatePlayerScore(updatedGuesses);
                return { ...p, guesses: updatedGuesses, score: updatedScore };
            }
            return p;
        });
        // Persist this specific update to localStorage
        const playerToUpdate = updatedPlayers.find(p => p.id === currentPlayer.id);
        if(playerToUpdate) {
            updatePlayerInGameDataFunctional(currentPlayer.id, { guesses: playerToUpdate.guesses, score: playerToUpdate.score });
        }
        return updatedPlayers;
    });


    if (checkWin(feedback)) {
      setWinner(currentPlayer);
      setRevealCodes(true); 
    } else {
      advanceTurn();
    }
  }, [winner, toast, updatePlayerInGameDataFunctional, advanceTurn, setWinner, setRevealCodes]);
  

  const makeComputerGuess = useCallback(() => {
    if (winner || playersRef.current.length === 0 || gameModeRef.current !== 'computer') {
      return;
    }
  
    const computerPlayer = playersRef.current.find(p => p.isComputer);
    const humanPlayer = playersRef.current.find(p => !p.isComputer);
  
    if (!computerPlayer || !humanPlayer || !computerPlayer.isComputer || !humanPlayer.secretCode) {
      console.error("Computer or human player not found for computer's guess.", { computerPlayer, humanPlayer });
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
    
    setPlayers(prevPlayers => {
      const updatedPlayers = prevPlayers.map(p => {
        if (p.id === computerPlayer.id) {
          const updatedGuesses = [...p.guesses, newGuess];
          const updatedScore = calculatePlayerScore(updatedGuesses);
          return { ...p, guesses: updatedGuesses, score: updatedScore };
        }
        return p;
      });
      // Persist this specific update to localStorage
      const playerToUpdate = updatedPlayers.find(p => p.id === computerPlayer.id);
      if(playerToUpdate){
          updatePlayerInGameDataFunctional(computerPlayer.id, { guesses: playerToUpdate.guesses, score: playerToUpdate.score });
      }
      return updatedPlayers;
    });
  
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
  }, [winner, toast, updatePlayerInGameDataFunctional, advanceTurn, setWinner, setRevealCodes]); 
  
  
  useEffect(() => {
    if (isLoading || winner) return;

    const currentPlayerEntity = playersRef.current[currentPlayerIndexRef.current];
    const currentMode = gameModeRef.current;
    
    if (currentPlayerEntity?.isComputer && currentMode === 'computer') {
      const timer = setTimeout(() => {
        makeComputerGuess();
      }, COMPUTER_THINK_DELAY_MS); 
      return () => clearTimeout(timer);
    }
  }, [isLoading, currentPlayerIndex, winner, makeComputerGuess]);


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

            const newGameData: ActiveGameData = {
              ...activeGameData, 
              gameStatus: 'lobby' as const, 
              players: resetPlayers
            };
             
            setActiveGameData(newGameData);
             
            const allGamesRaw = localStorage.getItem('locked-codes-all-games');
            if(allGamesRaw && activeGameData.gameId){
                 try {
                    const allGames = JSON.parse(allGamesRaw) as Record<string, ActiveGameData>;
                    allGames[activeGameData.gameId] = newGameData;
                    localStorage.setItem('locked-codes-all-games', JSON.stringify(allGames));
                 } catch(e) { console.error("Failed to update allGames on play again", e); }
            }

            if(activeGameData.multiplayerRole === 'host'){
                router.push(`/host-lobby/${activeGameData.gameId}`);
            } else if (activeGameData.multiplayerRole === 'join') { 
                 router.push(`/player-lobby/${activeGameData.gameId}`);
            } else { 
                router.push('/select-mode');
            }
        } else { 
             setActiveGameData(prev => prev ? ({...prev, gameStatus: 'lobby', players: []}) : null); // Reset for enter-code
             router.push('/enter-code'); 
        }
    } else { 
        router.push('/select-mode'); 
    }
  };

  const handleExitGame = () => {
    const gameIdToClean = activeGameData?.gameId;
    const role = activeGameData?.multiplayerRole;
    
    setActiveGameData(null); 

    if (gameIdToClean && role) { 
        const allGamesStored = localStorage.getItem('locked-codes-all-games');
        if (allGamesStored) {
            try {
                let allGames = JSON.parse(allGamesStored) as Record<string, ActiveGameData>;
                if (allGames[gameIdToClean]) {
                    if (role === 'host') {
                        delete allGames[gameIdToClean];
                    } else if (role === 'join') {
                        allGames[gameIdToClean].players = allGames[gameIdToClean].players.filter(p => p.id !== username);
                        if (allGames[gameIdToClean].players.filter(p => !p.isComputer).length === 0) {
                            delete allGames[gameIdToClean];
                        }
                    }
                    localStorage.setItem('locked-codes-all-games', JSON.stringify(allGames));
                }
            } catch (e) { console.error("Failed to update allGames on exit", e); }
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
  
  const activePlayerEntity = players[currentPlayerIndex]; 
  const targetPlayerEntity = players[currentTargetIndex];

  const isMyTurnToGuess = activePlayerEntity && activePlayerEntity.id === username && !activePlayerEntity.isComputer && !winner;

  let turnIndicatorText = "Loading turn...";
  if(winner){
    turnIndicatorText = winner.id === username ? "You cracked the code!" : `${winner.name} cracked the code!`;
  } else if (activePlayerEntity && targetPlayerEntity) {
    if (isMyTurnToGuess) {
      turnIndicatorText = `Your Turn, ${activePlayerEntity.name}! Guess ${targetPlayerEntity.name}'s code.`;
    } else if (activePlayerEntity.isComputer) {
      turnIndicatorText = `${activePlayerEntity.name} is thinking...`;
    } else { 
      turnIndicatorText = `${activePlayerEntity.name} is guessing ${targetPlayerEntity.name}'s code...`;
    }
  }


  const getDynamicGridClasses = () => {
    const num = players.length;
    if (num <= 0) return "md:grid-cols-1"; 
    if (num === 1) return "md:grid-cols-1"; // For single player vs computer, could span more later
    if (num === 2) return "md:grid-cols-2";
    if (num === 3) return "md:grid-cols-1 lg:grid-cols-3"; 
    if (num >= 4) return "md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4"; 
    return "md:grid-cols-2"; 
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

      {activePlayerEntity && ( 
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
                isCurrentTurn={player.id === activePlayerEntity?.id && !winner}
                secretCodeToDisplay={revealCodes || player.id === username || (winner && player.isComputer && player.secretCode) ? player.secretCode : "****"} 
            />
        ))}
      </main>

      {isMyTurnToGuess && targetPlayerEntity && ( 
        <GuessInput 
          onSubmitGuess={handlePlayerGuess} 
          disabled={!isMyTurnToGuess || revealCodes || !!winner} 
        />
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
    
