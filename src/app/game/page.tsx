
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
import type { Guess, Player, GameMode } from '@/lib/gameTypes';
import { CODE_LENGTH, generateSecretCode, calculateFeedback, checkWin, generateComputerGuess, calculatePlayerScore } from '@/lib/gameLogic';
import { LogOut } from 'lucide-react';

const COMPUTER_PLAYER_NAME = "Computer";
const MAX_DISPLAY_GUESSES = 5; // This will be handled by PlayerPanel and state updates
const REVEAL_DELAY_MS = 3000;

interface PlayerSetupInfo {
  name: string;
  secretCode: string;
}

export default function GamePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [username] = useLocalStorage<string>('locked-codes-username', '');
  const [userSecretCode] = useLocalStorage<string>('locked-codes-secret-code', ''); // Legacy, P1's code
  const [gameMode] = useLocalStorage<GameMode | null>('locked-codes-gamemode', "computer");
  const [playersSetup] = useLocalStorage<PlayerSetupInfo[]>('locked-codes-players-setup', []);


  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [winner, setWinner] = useState<Player | null>(null); // Store the winning player object
  const [isGameEndDialogOpen, setIsGameEndDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [revealCodes, setRevealCodes] = useState<boolean>(false);
  const [targetPlayerIndices, setTargetPlayerIndices] = useState<number[]>([]);


  const initializeGame = useCallback(() => {
    if (!username || !gameMode) {
      toast({ title: "Error", description: "User or game mode not found. Redirecting...", variant: "destructive" });
      router.push('/');
      return;
    }

    let initialPlayers: Player[] = [];
    if (gameMode === "computer") {
      const p1Code = playersSetup.find(p => p.name === username)?.secretCode || userSecretCode || generateSecretCode(); // Fallback
      initialPlayers = [
        { id: "player1", name: username, secretCode: p1Code, guesses: [], score: 0 },
        { id: "computer", name: COMPUTER_PLAYER_NAME, secretCode: generateSecretCode(), guesses: [], score: 0, isComputer: true }
      ];
      setTargetPlayerIndices([1, 0]); // P1 targets Computer (idx 1), Computer targets P1 (idx 0)
    } else {
      // Basic multiplayer setup (still defaults to 1v1 vs Computer for now for actual gameplay)
      // This part needs significant expansion for true multiplayer code entry and player management
      const p1Code = playersSetup.find(p => p.name === username)?.secretCode || userSecretCode || generateSecretCode();
      initialPlayers = [
        { id: "player1", name: username, secretCode: p1Code, guesses: [], score: 0 },
        // Placeholder for other players; for now, computer acts as opponent
        { id: "computer", name: `Opponent (Computer)`, secretCode: generateSecretCode(), guesses: [], score: 0, isComputer: true }
      ];
       setTargetPlayerIndices([1, 0]); // P1 targets "Opponent", "Opponent" targets P1

      if (gameMode === "duo" && initialPlayers.length < 2) { /* Add P2 if not computer */ }
      // Similar logic for trio, quads to setup players and target indices (e.g. P1->P2, P2->P1 or P1->P2, P2->P3, P3->P1)
      // This is where actual multiplayer setup would create Player objects based on `playersSetup` or prompt for more.
    }

    setPlayers(initialPlayers);
    setCurrentPlayerIndex(0); // Player 1 (human) starts
    setWinner(null);
    setIsGameEndDialogOpen(false);
    setRevealCodes(false);
    setIsLoading(false);

  }, [username, userSecretCode, gameMode, playersSetup, router, toast]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  useEffect(() => {
    if (winner && revealCodes) {
      const timer = setTimeout(() => {
        setIsGameEndDialogOpen(true);
      }, REVEAL_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [winner, revealCodes]);

  const getCurrentPlayer = () => players[currentPlayerIndex];
  const getTargetPlayer = () => players[targetPlayerIndices[currentPlayerIndex]];

  const handlePlayerGuess = (guessValue: string) => {
    if (winner || !getCurrentPlayer() || getCurrentPlayer().isComputer || !getTargetPlayer()) return;

    if (guessValue.length !== CODE_LENGTH || !/^\d+$/.test(guessValue)) {
      toast({ title: "Invalid Guess", description: `Guess must be ${CODE_LENGTH} digits.`, variant: "destructive" });
      return;
    }
    
    const currentPlayer = getCurrentPlayer();
    const targetPlayer = getTargetPlayer();

    const feedback = calculateFeedback(guessValue, targetPlayer.secretCode);
    const newGuess: Guess = { 
      id: `${currentPlayer.id}-${Date.now()}`, 
      guesserId: currentPlayer.id, 
      value: guessValue, 
      feedback, 
      isPlayer: !currentPlayer.isComputer 
    };
    
    setPlayers(prevPlayers => prevPlayers.map((p, index) => {
      if (index === currentPlayerIndex) {
        const updatedGuesses = [...p.guesses, newGuess];
        return {
          ...p,
          guesses: updatedGuesses.length > MAX_DISPLAY_GUESSES ? updatedGuesses.slice(-MAX_DISPLAY_GUESSES) : updatedGuesses,
          score: calculatePlayerScore([...p.guesses, newGuess]) // Recalculate score with new guess
        };
      }
      return p;
    }));

    if (checkWin(feedback)) {
      setWinner(currentPlayer);
      setRevealCodes(true);
    } else {
      setCurrentPlayerIndex((prevIndex) => (prevIndex + 1) % players.length);
    }
  };

  const makeComputerGuessAgainstTarget = useCallback(() => {
    if (winner || !getCurrentPlayer() || !getCurrentPlayer().isComputer || !getTargetPlayer()) return;

    const computerPlayer = getCurrentPlayer();
    const targetHumanPlayer = getTargetPlayer(); // Computer always targets a human in this simplified setup

    const previousComputerGuessValues = computerPlayer.guesses.map(g => g.value);
    const computerGuessValue = generateComputerGuess(previousComputerGuessValues);
    const feedback = calculateFeedback(computerGuessValue, targetHumanPlayer.secretCode);
    const newGuess: Guess = { 
      id: `comp-${Date.now()}`, 
      guesserId: computerPlayer.id,
      value: computerGuessValue, 
      feedback, 
      isPlayer: false 
    };
    
    setPlayers(prevPlayers => prevPlayers.map((p, index) => {
      if (index === currentPlayerIndex) {
         const updatedGuesses = [...p.guesses, newGuess];
        return {
          ...p,
          guesses: updatedGuesses.length > MAX_DISPLAY_GUESSES ? updatedGuesses.slice(-MAX_DISPLAY_GUESSES) : updatedGuesses,
          score: calculatePlayerScore([...p.guesses, newGuess])
        };
      }
      return p;
    }));

    toast({
      title: `${computerPlayer.name} Guessed!`,
      description: `${computerPlayer.name} guessed: ${computerGuessValue} against ${targetHumanPlayer.name}`,
    });

    if (checkWin(feedback)) {
      setWinner(computerPlayer);
      setRevealCodes(true);
    } else {
      setCurrentPlayerIndex((prevIndex) => (prevIndex + 1) % players.length);
    }
  }, [players, currentPlayerIndex, targetPlayerIndices, toast, winner]);

  useEffect(() => {
    if (isLoading || players.length === 0) return;
    const currentPlayer = players[currentPlayerIndex];
    if (currentPlayer?.isComputer && !winner) {
      const timer = setTimeout(() => {
        makeComputerGuessAgainstTarget();
      }, 1500); 
      return () => clearTimeout(timer);
    }
  }, [currentPlayerIndex, players, winner, makeComputerGuessAgainstTarget, isLoading]);

  const handlePlayAgain = () => {
    initializeGame();
  };

  const handleExitGame = () => {
    // Clear only game-specific localStorage items if desired, or all related
    localStorage.removeItem('locked-codes-secret-code');
    localStorage.removeItem('locked-codes-gamemode');
    localStorage.removeItem('locked-codes-numplayers');
    localStorage.removeItem('locked-codes-players-setup');
    // Username is kept for convenience
    setPlayers([]);
    setWinner(null);
    setRevealCodes(false);
    router.push('/');
  };
  
  const leaderboardData = players.map(p => ({ name: p.name, score: p.score })).sort((a,b) => b.score - a.score);


  if (isLoading || players.length === 0) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-xl">Loading Game...</p></div>;
  }
  
  const activePlayer = players[currentPlayerIndex];
  const isMyTurn = activePlayer && !activePlayer.isComputer && !winner;

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 bg-background">
      <header className="w-full max-w-4xl flex justify-between items-center mb-4">
        <GameLogo size="small" />
        <Button variant="destructive" onClick={handleExitGame} size="sm">
          <LogOut className="w-4 h-4 mr-2" />
          Exit Game
        </Button>
      </header>

      {activePlayer && (
        <TurnIndicator 
          currentPlayerName={activePlayer.name}
          isPlayerTurn={!activePlayer.isComputer && !winner}
        />
      )}

      <main className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
        {players.map((player, index) => (
          <PlayerPanel
            key={player.id}
            playerName={player.name}
            guesses={player.guesses}
            isCurrentTurn={index === currentPlayerIndex && !winner}
            secretCodeToDisplay={revealCodes ? player.secretCode : (player.isComputer ? "****" : "Your Code (Hidden)")} 
          />
        ))}
      </main>

      {isMyTurn && (
        <GuessInput onSubmitGuess={handlePlayerGuess} disabled={!isMyTurn || revealCodes} />
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

