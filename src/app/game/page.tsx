
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import GameLogo from '@/components/game-logo';
import useLocalStorage from '@/hooks/use-local-storage';
import PlayerPanel from './components/PlayerPanel';
import GuessInput from './components/GuessInput';
import TurnIndicator from './components/TurnIndicator';
import GameEndDialog from './components/GameEndDialog';
import type { Guess, Player, ActiveGameData } from '@/lib/gameTypes';
import { CODE_LENGTH, calculateFeedback, checkWin, generateComputerGuess, calculatePlayerScore } from '@/lib/gameLogic';
import { LogOut } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const REVEAL_DELAY_MS = 3000;

export default function GamePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [username] = useLocalStorage<string>('locked-codes-username', '');
  const [activeGameData, setActiveGameData] = useLocalStorage<ActiveGameData | null>('locked-codes-active-game', null);
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0); // Player whose turn it is to guess
  const [currentTargetIndex, setCurrentTargetIndex] = useState<number>(0); // Player being guessed against by currentPlayerIndex
  
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

    // Determine initial target for player 0
    if (activeGameData.players.length > 1) {
      if (activeGameData.gameMode === 'computer') {
        setCurrentTargetIndex(1); // Human (idx 0) targets Computer (idx 1)
      } else {
        // For multiplayer, player 0 targets player 1 initially.
        // This will cycle.
        setCurrentTargetIndex(1 % activeGameData.players.length);
      }
    } else {
      setCurrentTargetIndex(0); // Should not happen in a valid game
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


  const getCurrentPlayer = (): Player | undefined => players[currentPlayerIndex];
  const getTargetPlayer = (): Player | undefined => players[currentTargetIndex];


  const updatePlayerInGameData = (playerId: string, updatedData: {guesses: Guess[], score: number}) => {
    if(activeGameData && activeGameData.players){
        const updatedPlayers = activeGameData.players.map(p => 
            p.id === playerId ? {...p, guesses: updatedData.guesses, score: updatedData.score } : p
        );
        
        const newActiveGameData = {...activeGameData, players: updatedPlayers};
        setActiveGameData(newActiveGameData);

        if(activeGameData.gameId){ // Multiplayer game, update allGames
            const allGames = JSON.parse(localStorage.getItem('locked-codes-all-games') || '{}') as Record<string, ActiveGameData>;
            if(allGames[activeGameData.gameId]){
                allGames[activeGameData.gameId] = newActiveGameData; // Update with the full new state including players
                localStorage.setItem('locked-codes-all-games', JSON.stringify(allGames));
            }
        }
    }
  }

  const advanceTurn = () => {
    if (!activeGameData || !activeGameData.players) return;
    const numPlayers = activeGameData.players.length;
    if (numPlayers <= 1) return; // No turn to advance

    let nextPlayerIndex = (currentPlayerIndex + 1) % numPlayers;
    let nextTargetIndex;

    if (activeGameData.gameMode === 'computer') {
      // Player 0 (Human) targets Player 1 (Computer)
      // Player 1 (Computer) targets Player 0 (Human)
      nextTargetIndex = currentPlayerIndex; // The one who just guessed becomes the target
    } else { // Multiplayer (Duo, Trio, Quads)
      // Current player becomes next player
      // Next player targets the player after them (cyclical, skipping self)
      nextTargetIndex = (nextPlayerIndex + 1) % numPlayers;
      if (nextTargetIndex === nextPlayerIndex) { // Avoid self-targeting in 2-player
        nextTargetIndex = (nextTargetIndex + 1) % numPlayers;
      }
    }
    setCurrentPlayerIndex(nextPlayerIndex);
    setCurrentTargetIndex(nextTargetIndex);
  };


  const handlePlayerGuess = (guessValue: string) => {
    const currentPlayer = getCurrentPlayer();
    const targetPlayer = getTargetPlayer();

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
    
    // Store guess against the target player's profile OR a general game log?
    // For PlayerPanel, it's simpler if guesses are on the guesser.
    // Let's keep guesses on the player who made them.
    const updatedPlayerGuesses = [...currentPlayer.guesses, newGuess];
    const updatedPlayerScore = calculatePlayerScore(updatedPlayerGuesses); // Score is based on best guess

    setPlayers(prevPlayers => prevPlayers.map(p => {
      if (p.id === currentPlayer.id) {
        return { ...p, guesses: updatedPlayerGuesses, score: updatedPlayerScore };
      }
      return p;
    }));
    updatePlayerInGameData(currentPlayer.id, {guesses: updatedPlayerGuesses, score: updatedPlayerScore});


    if (checkWin(feedback)) {
      setWinner(currentPlayer);
      setRevealCodes(true); 
    } else {
      advanceTurn();
    }
  };

  const makeComputerGuess = useCallback(() => {
    const computerPlayer = getCurrentPlayer(); // This should be the computer
    const targetHumanPlayer = getTargetPlayer(); // This should be the human

    if (winner || !computerPlayer || !computerPlayer.isComputer || !targetHumanPlayer || !targetHumanPlayer.secretCode) return;
    
    // Computer's previous guesses against *this specific target*
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

    setPlayers(prevPlayers => prevPlayers.map(p => {
      if (p.id === computerPlayer.id) {
        return { ...p, guesses: updatedComputerGuesses, score: updatedComputerScore };
      }
      return p;
    }));
    updatePlayerInGameData(computerPlayer.id, {guesses: updatedComputerGuesses, score: updatedComputerScore});

    toast({
      title: `${computerPlayer.name} Guessed!`,
      description: `${computerPlayer.name} guessed: ${computerGuessValue} against ${targetHumanPlayer.name}`,
    });

    if (checkWin(feedback)) {
      setWinner(computerPlayer);
      setRevealCodes(true);
    } else {
      advanceTurn();
    }
  }, [players, currentPlayerIndex, currentTargetIndex, toast, winner, setActiveGameData, activeGameData, advanceTurn]); // Added advanceTurn

  useEffect(() => {
    if (isLoading || players.length === 0 || !activeGameData) return;
    
    const currentPlayer = players[currentPlayerIndex];
    if (currentPlayer?.isComputer && !winner) {
      const timer = setTimeout(() => {
        makeComputerGuess();
      }, 1500); 
      return () => clearTimeout(timer);
    }
  }, [currentPlayerIndex, players, winner, makeComputerGuess, isLoading, activeGameData]);

  const handlePlayAgain = () => {
    setIsGameEndDialogOpen(false);
    setWinner(null);
    setRevealCodes(false);
    
    if (activeGameData && activeGameData.gameId) { 
        const resetPlayers = activeGameData.players.map(p => ({
          ...p, 
          guesses:[], 
          score:0, 
          isReady: p.isHost ? true : false, 
          secretCode: (p.isHost || p.isComputer) ? p.secretCode : '' // Host and computer keep their code for now or re-randomize computer? For now, keep. Player resets.
          // If computer, re-generate secret code?
          // secretCode: p.isComputer ? generateSecretCode() : (p.isHost ? p.secretCode : '') 
        }));

        const newGameData = {
          ...activeGameData, 
          gameStatus: 'lobby' as const, 
          players: resetPlayers
        };
         
        setActiveGameData(newGameData);
         
        if(localStorage.getItem('locked-codes-all-games')){
             const allGames = JSON.parse(localStorage.getItem('locked-codes-all-games')!) as Record<string, ActiveGameData>;
             if(allGames[activeGameData.gameId]){
                 allGames[activeGameData.gameId] = newGameData;
                 localStorage.setItem('locked-codes-all-games', JSON.stringify(allGames));
             }
        }

        if(activeGameData.multiplayerRole === 'host'){
            router.push(`/host-lobby/${activeGameData.gameId}`);
        } else { // Player or 'vs Computer' that somehow had a gameId
             router.push(`/player-lobby/${activeGameData.gameId}`);
        }

    } else { 
        router.push('/select-mode'); 
    }
  };

  const handleExitGame = () => {
    if (activeGameData && activeGameData.gameId) {
        const allGames = JSON.parse(localStorage.getItem('locked-codes-all-games') || '{}') as Record<string, ActiveGameData>;
        // If current user is host, consider deleting the game from allGames or marking as abandoned
        // For now, just clearing active game for this user
        // delete allGames[activeGameData.gameId];
        // localStorage.setItem('locked-codes-all-games', JSON.stringify(allGames));
    }
    setActiveGameData(null);
    router.push('/');
  };
  
  const leaderboardData = players.map(p => ({ name: p.name, score: p.score })).sort((a,b) => b.score - a.score);

  if (isLoading || players.length === 0 || !activeGameData) {
    return (
      <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 bg-background">
        <header className="w-full max-w-4xl flex justify-between items-center mb-4">
          <Skeleton className="h-10 w-28" /> {/* GameLogo placeholder */}
          <Skeleton className="h-9 w-24" /> {/* Exit Button placeholder */}
        </header>
        <Skeleton className="my-4 sm:my-6 p-3 h-12 w-full max-w-md" /> {/* TurnIndicator placeholder */}
        <main className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
          {[...Array(Math.min(players.length || 2, 2))].map((_, i) => ( // Show 2 player panel skeletons
            <Card key={i} className="w-full">
              <CardHeader>
                <Skeleton className="h-7 w-1/2 mb-1" /> {/* PlayerName */}
                <Skeleton className="h-4 w-3/4" /> {/* Secret Code */}
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/3 mb-2" /> {/* Guess History Title */}
                <div className="space-y-3 h-48 sm:h-64 pr-3 overflow-hidden">
                  {[...Array(3)].map((_, j) => (
                     <Skeleton key={j} className="h-10 sm:h-12 w-full" /> /* GuessDisplay placeholder */
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </main>
        <Skeleton className="h-12 w-full max-w-xs sm:max-w-sm" /> {/* GuessInput placeholder */}
      </div>
    );
  }
  
  const activePlayerToGuess = players[currentPlayerIndex]; // The player whose turn it is
  const playerBeingGuessed = players[currentTargetIndex]; // The player whose code is being guessed

  // Determine if it's the current browser user's turn to make a guess
  const isMyTurnToGuess = activePlayerToGuess && activePlayerToGuess.id === username && !activePlayerToGuess.isComputer && !winner;

  // Display names for TurnIndicator
  const turnIndicatorPlayerName = activePlayerToGuess ? activePlayerToGuess.name : "Someone";
  const turnIndicatorTargetName = playerBeingGuessed ? playerBeingGuessed.name : "Someone";
  
  let turnIndicatorText = `Waiting for ${turnIndicatorPlayerName}...`;
  if(isMyTurnToGuess && playerBeingGuessed){
    turnIndicatorText = `Your Turn, ${turnIndicatorPlayerName}! Guess ${turnIndicatorTargetName}'s code.`;
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

      <main className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
        {players.map((player, index) => {
            // Guesses made *by this player* against *their current target* (or any target for general display)
            const guessesByThisPlayer = player.guesses.filter(g => g.guesserId === player.id);
            // For multiplayer, each player panel shows their own guesses. 
            // The secret code shown is their own.
            return (
              <PlayerPanel
                key={player.id}
                playerName={player.name + (player.id === username ? " (You)" : "")}
                guesses={guessesByThisPlayer} // Show guesses made BY this player
                isCurrentTurn={index === currentPlayerIndex && !winner}
                // Reveal own code, or if game over, or if it's computer player
                secretCodeToDisplay={revealCodes || player.id === username || (winner && player.isComputer) ? player.secretCode : "****"} 
              />
            );
        })}
      </main>

      {isMyTurnToGuess && playerBeingGuessed && ( // Only show input if it's my turn and there's a target
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

