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
import type { Guess, DigitFeedback } from '@/lib/gameTypes';
import { CODE_LENGTH, generateSecretCode, calculateFeedback, checkWin, generateComputerGuess } from '@/lib/gameLogic';
import { LogOut } from 'lucide-react';

const COMPUTER_PLAYER_NAME = "Computer";

export default function GamePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [username, setUsername] = useLocalStorage<string>('locked-codes-username', '');
  const [userSecretCode, setUserSecretCode] = useLocalStorage<string>('locked-codes-secret-code', '');

  const [computerSecretCode, setComputerSecretCode] = useState<string>('');
  const [userGuesses, setUserGuesses] = useState<Guess[]>([]);
  const [computerGuesses, setComputerGuesses] = useState<Guess[]>([]);
  const [currentTurn, setCurrentTurn] = useState<'user' | 'computer'>('user'); // User starts
  const [winner, setWinner] = useState<string | null>(null);
  const [isGameEndDialogOpen, setIsGameEndDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const initializeGame = useCallback(() => {
    if (!username || !userSecretCode) {
      toast({ title: "Error", description: "User data not found. Redirecting...", variant: "destructive" });
      router.push('/');
      return;
    }
    setComputerSecretCode(generateSecretCode());
    setUserGuesses([]);
    setComputerGuesses([]);
    setCurrentTurn('user');
    setWinner(null);
    setIsGameEndDialogOpen(false);
    setIsLoading(false);
  }, [username, userSecretCode, router, toast]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]); // Only on mount or if initializeGame deps change

  const handleUserGuess = (guessValue: string) => {
    if (guessValue.length !== CODE_LENGTH || !/^\d+$/.test(guessValue)) {
      toast({ title: "Invalid Guess", description: `Guess must be ${CODE_LENGTH} digits.`, variant: "destructive" });
      return;
    }

    const feedback = calculateFeedback(guessValue, computerSecretCode);
    const newGuess: Guess = { id: `user-${Date.now()}`, value: guessValue, feedback, isPlayer: true };
    setUserGuesses(prev => [...prev, newGuess]);

    if (checkWin(feedback)) {
      setWinner(username);
      setIsGameEndDialogOpen(true);
    } else {
      setCurrentTurn('computer');
    }
  };

  const makeComputerGuess = useCallback(() => {
    if (winner) return; // Don't make a guess if game already won
    
    const previousComputerGuessValues = computerGuesses.map(g => g.value);
    const computerGuessValue = generateComputerGuess(previousComputerGuessValues);
    const feedback = calculateFeedback(computerGuessValue, userSecretCode);
    const newGuess: Guess = { id: `comp-${Date.now()}`, value: computerGuessValue, feedback, isPlayer: false };
    
    setComputerGuesses(prev => [...prev, newGuess]);

    toast({
      title: "Computer Guessed!",
      description: `Computer guessed: ${computerGuessValue}`,
    });

    if (checkWin(feedback)) {
      setWinner(COMPUTER_PLAYER_NAME);
      setIsGameEndDialogOpen(true);
    } else {
      setCurrentTurn('user');
    }
  }, [computerGuesses, userSecretCode, toast, winner]);

  useEffect(() => {
    if (currentTurn === 'computer' && !winner) {
      const timer = setTimeout(() => {
        makeComputerGuess();
      }, 1500); // Delay for computer's turn
      return () => clearTimeout(timer);
    }
  }, [currentTurn, winner, makeComputerGuess]);

  const handlePlayAgain = () => {
    initializeGame();
  };

  const handleExitGame = () => {
    // Clear specific game session data, keep username/code for next time?
    // For this prompt, full clear and redirect.
    localStorage.removeItem('locked-codes-username');
    localStorage.removeItem('locked-codes-secret-code');
    router.push('/');
  };

  if (isLoading || !username || !userSecretCode) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-xl">Loading Game...</p></div>;
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

      <TurnIndicator 
        currentPlayerName={currentTurn === 'user' ? username : COMPUTER_PLAYER_NAME}
        isPlayerTurn={currentTurn === 'user'}
      />

      <main className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <PlayerPanel
          playerName={username}
          guesses={userGuesses}
          isCurrentTurn={currentTurn === 'user'}
          secretCodeToDisplay="Your Code (Hidden)" // Or display userSecretCode if desired
        />
        <PlayerPanel
          playerName={COMPUTER_PLAYER_NAME}
          guesses={computerGuesses}
          isCurrentTurn={currentTurn === 'computer'}
          secretCodeToDisplay="****" // Computer's code is hidden
        />
      </main>

      {currentTurn === 'user' && !winner && (
        <GuessInput onSubmitGuess={handleUserGuess} disabled={currentTurn !== 'user' || !!winner} />
      )}
      
      <GameEndDialog
        isOpen={isGameEndDialogOpen}
        winnerName={winner}
        onPlayAgain={handlePlayAgain}
        onExitGame={handleExitGame}
        onClose={() => setIsGameEndDialogOpen(false)} // Allow closing dialog without action
      />
    </div>
  );
}
