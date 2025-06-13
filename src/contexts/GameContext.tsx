
"use client";
import type React from 'react';
import { createContext, useContext, useState, useCallback, useEffect }
from 'react';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { Guess } from '@/types/game';
import { useAuth } from './AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';


export type GameStatus = "SETUP_PLAYER" | "WAITING_OPPONENT_SECRET" | "PLAYING" | "GAME_OVER";


interface GameContextType {
  playerSecret: string[];
  setPlayerSecret: (secret: string[]) => void;
  opponentSecret: string[]; // For local simulation
  setOpponentSecret: (secret: string[]) => void; // For local simulation
  
  playerGuesses: Guess[];
  opponentGuesses: Guess[];
  
  currentTurn: 'player' | 'opponent';
  gameStatus: GameStatus;
  winner: 'player' | 'opponent' | null;

  initializeGame: () => void;
  submitPlayerSecret: (secret: string[]) => void;
  makePlayerGuess: (guess: string[]) => void;
  // makeOpponentGuess: (guess: string[]) => void; // For full simulation, not primary for this UI
  exitGame: () => void;
  isSubmitting: boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const MAX_DIGITS = 4;

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { username, logout: authLogout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [playerSecret, setPlayerSecretState] = useLocalStorage<string[]>('numberlock-playerSecret', Array(MAX_DIGITS).fill(''));
  // For local simulation, opponent's secret will also be managed here.
  // In a real app, this would come from the backend or be unknown to the client.
  const [opponentSecret, setOpponentSecretState] = useLocalStorage<string[]>('numberlock-opponentSecret', []); 
  
  const [gameState, setGameState] = useLocalStorage<{
    playerGuesses: Guess[];
    opponentGuesses: Guess[];
    currentTurn: 'player' | 'opponent';
    gameStatus: GameStatus;
    winner: 'player' | 'opponent' | null;
  }>('numberlock-gameState', {
    playerGuesses: [],
    opponentGuesses: [],
    currentTurn: 'player',
    gameStatus: "SETUP_PLAYER",
    winner: null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const setPlayerSecret = (secret: string[]) => {
    setPlayerSecretState(secret);
  };

  const setOpponentSecret = (secret: string[]) => {
    setOpponentSecretState(secret);
    // Simulate opponent setting secret and game starting
    if (playerSecret.every(d => d !== '')) {
      setGameState(prev => ({ ...prev, gameStatus: 'PLAYING', currentTurn: 'player' }));
    }
  };
  
  const initializeGame = useCallback(() => {
    setPlayerSecretState(Array(MAX_DIGITS).fill(''));
    setOpponentSecretState(Array(MAX_DIGITS).fill('')); // For demo, generate one
    setGameState({
      playerGuesses: [],
      opponentGuesses: [],
      currentTurn: 'player',
      gameStatus: "SETUP_PLAYER",
      winner: null,
    });
  }, [setPlayerSecretState, setOpponentSecretState, setGameState]);

  useEffect(() => {
    // Initialize game if username exists but game state is not set up
    if (username && gameState.gameStatus === "SETUP_PLAYER" && !playerSecret.some(d => d !== '')) {
      // Stay in setup
    } else if (username && gameState.gameStatus === "WAITING_OPPONENT_SECRET" && !opponentSecret.some(d => d !== '')) {
      // Stay waiting, or for demo, auto-set opponent secret
      // This part will be replaced by backend logic
    }
  }, [username, gameState.gameStatus, playerSecret, opponentSecret, initializeGame]);


  const submitPlayerSecret = useCallback(async (secret: string[]) => {
    setIsSubmitting(true);
    setPlayerSecretState(secret);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500)); 
    
    // In a real app, wait for backend confirmation. For demo, auto-generate opponent secret.
    const autoOpponentSecret = Array(MAX_DIGITS).fill('').map(() => String(Math.floor(Math.random() * 10)));
    setOpponentSecretState(autoOpponentSecret);

    setGameState(prev => ({ ...prev, gameStatus: 'PLAYING', currentTurn: 'player' }));
    setIsSubmitting(false);
    router.push('/play');
    toast({ title: "Secret set!", description: "Opponent's secret also set (auto-generated for demo). Game starts!" });
  }, [setPlayerSecretState, setOpponentSecretState, setGameState, router, toast]);

  const calculateFeedback = (guess: string[], secretToMatch: string[]): boolean[] => {
    return guess.map((digit, index) => digit === secretToMatch[index]);
  };

  const makePlayerGuess = useCallback(async (guessStr: string) => {
    if (gameState.gameStatus !== 'PLAYING' || gameState.currentTurn !== 'player' || isSubmitting) return;
    setIsSubmitting(true);

    const guessArray = guessStr.split('');
    const feedback = calculateFeedback(guessArray, opponentSecret);
    const newPlayerGuess: Guess = { value: guessStr, feedback };
    
    const updatedPlayerGuesses = [...gameState.playerGuesses, newPlayerGuess];

    if (feedback.every(f => f)) {
      setGameState(prev => ({ ...prev, playerGuesses: updatedPlayerGuesses, gameStatus: 'GAME_OVER', winner: 'player' }));
      toast({ title: "Congratulations!", description: "You guessed the opponent's number!" });
    } else {
      setGameState(prev => ({ ...prev, playerGuesses: updatedPlayerGuesses, currentTurn: 'opponent' }));
      // Simulate opponent's turn after a delay
      setTimeout(() => simulateOpponentTurn(), 1500);
    }
    setIsSubmitting(false);
  }, [gameState, opponentSecret, setGameState, toast, isSubmitting]);

  const simulateOpponentTurn = useCallback(async () => {
    if (gameState.gameStatus !== 'PLAYING' || gameState.currentTurn !== 'opponent' || isSubmitting) return;
    setIsSubmitting(true);
    
    // Simple random guess for opponent
    const opponentGuessArray = Array(MAX_DIGITS).fill('').map(() => String(Math.floor(Math.random() * 10)));
    const opponentGuessStr = opponentGuessArray.join('');
    const feedback = calculateFeedback(opponentGuessArray, playerSecret);
    const newOpponentGuess: Guess = { value: opponentGuessStr, feedback };

    const updatedOpponentGuesses = [...gameState.opponentGuesses, newOpponentGuess];
    
    toast({ title: "Opponent guessed!", description: `Opponent guessed ${opponentGuessStr}`});

    if (feedback.every(f => f)) {
      setGameState(prev => ({ ...prev, opponentGuesses: updatedOpponentGuesses, gameStatus: 'GAME_OVER', winner: 'opponent' }));
      toast({ title: "Oh no!", description: "Opponent guessed your number!" });
    } else {
      setGameState(prev => ({ ...prev, opponentGuesses: updatedOpponentGuesses, currentTurn: 'player' }));
    }
    setIsSubmitting(false);
  }, [gameState, playerSecret, setGameState, toast, isSubmitting]);


  const exitGame = useCallback(() => {
    // This would call backend API to clear data.
    // For local, clear local storage via authLogout which handles it.
    authLogout(); 
    // initializeGame(); // Reset local game state variables
    toast({ title: "Game Exited", description: "Your game data has been cleared." });
  }, [authLogout, toast]);


  return (
    <GameContext.Provider value={{ 
      playerSecret, setPlayerSecret, 
      opponentSecret, setOpponentSecret, // opponentSecret and setOpponentSecret are for local simulation
      playerGuesses: gameState.playerGuesses, 
      opponentGuesses: gameState.opponentGuesses,
      currentTurn: gameState.currentTurn, 
      gameStatus: gameState.gameStatus, 
      winner: gameState.winner,
      initializeGame,
      submitPlayerSecret,
      makePlayerGuess,
      exitGame,
      isSubmitting
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
