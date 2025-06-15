
"use client";
import type React from 'react';
import { createContext, useContext, useState, useCallback, useEffect, useRef } // Added useRef
from 'react';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { Guess, GameStatus } from '@/types/game';
import { useAuth } from './AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { 
  CODE_LENGTH, 
  generateSecretCode, 
  calculateFeedback, 
  checkWin, 
  generateComputerGuess 
} from '@/lib/gameLogic';


interface GameContextType {
  playerSecret: string[];
  setPlayerSecret: (secret: string[]) => void;
  opponentSecret: string[]; 
  setOpponentSecret: (secret: string[]) => void; 
  
  playerGuesses: Guess[];
  opponentGuesses: Guess[];
  
  currentTurn: 'player' | 'opponent';
  gameStatus: GameStatus;
  winner: 'player' | 'opponent' | null;

  initializeGame: () => void;
  submitPlayerSecret: (secret: string[]) => void;
  makePlayerGuess: (guess: string) => void;
  exitGame: () => void;
  isSubmitting: boolean;
  isInitialLoading: boolean;
  timeLeft: number;
  isTimerActive: boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const INITIAL_TIME_LIMIT = 20;

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { username, logout: authLogout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [playerSecret, setPlayerSecretState] = useLocalStorage<string[]>('numberlock-playerSecret', Array(CODE_LENGTH).fill(''));
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
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME_LIMIT);
  const [isTimerActive, setIsTimerActive] = useState(false);

  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);


  const setPlayerSecret = (secret: string[]) => {
    setPlayerSecretState(secret);
  };

  const setOpponentSecret = (secret: string[]) => {
    setOpponentSecretState(secret);
    if (playerSecret.every(d => d !== '')) {
      setGameState(prev => ({ ...prev, gameStatus: 'PLAYING', currentTurn: 'player' }));
    }
  };
  
  const initializeGame = useCallback(() => {
    setPlayerSecretState(Array(CODE_LENGTH).fill(''));
    setOpponentSecretState(Array(CODE_LENGTH).fill('')); 
    setGameState({
      playerGuesses: [],
      opponentGuesses: [],
      currentTurn: 'player',
      gameStatus: "SETUP_PLAYER",
      winner: null,
    });
    setIsInitialLoading(false); 
    setIsSubmitting(false); 
    setTimeLeft(INITIAL_TIME_LIMIT);
    setIsTimerActive(false);
  }, [setPlayerSecretState, setOpponentSecretState, setGameState]);

  useEffect(() => {
    if (gameState.gameStatus === 'PLAYING' && !gameState.winner) {
      setTimeLeft(INITIAL_TIME_LIMIT);
      setIsTimerActive(true);
    } else {
      setIsTimerActive(false);
    }
  }, [gameState.currentTurn, gameState.gameStatus, gameState.winner]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isTimerActive && timeLeft > 0 && gameStateRef.current.gameStatus === 'PLAYING' && !gameStateRef.current.winner) {
      intervalId = setInterval(() => {
        setTimeLeft(prevTime => Math.max(0, prevTime - 1)); // Ensure timeLeft doesn't go below 0
      }, 1000);
    } else if (timeLeft === 0 && isTimerActive && gameStateRef.current.gameStatus === 'PLAYING' && !gameStateRef.current.winner) {
      setIsTimerActive(false); 
      
      const currentTurnPlayerName = gameStateRef.current.currentTurn === 'player' ? (username || 'Player') : 'Computer';
      toast({
        title: "Time's Up!",
        description: `${currentTurnPlayerName}'s turn was skipped.`,
        variant: "destructive",
      });

      setGameState(prev => {
        if (prev.gameStatus !== 'PLAYING' || prev.winner) return prev; // Check again inside updater
        return { ...prev, currentTurn: prev.currentTurn === 'player' ? 'opponent' : 'player' };
      });
    }
    return () => clearInterval(intervalId);
  }, [isTimerActive, timeLeft, username, setGameState, toast]); // Removed gameState.gameStatus and gameState.winner, using ref


  useEffect(() => {
    if (username && gameState.gameStatus === "SETUP_PLAYER" && !playerSecret.some(d => d !== '')) {
      // Stay in setup
    } else if (username && gameState.gameStatus === "WAITING_OPPONENT_SECRET" && !opponentSecret.some(d => d !== '')) {
      // Stay waiting
    }
  }, [username, gameState.gameStatus, playerSecret, opponentSecret]);


  const submitPlayerSecret = useCallback(async (secret: string[]) => {
    setIsSubmitting(true); 
    setIsInitialLoading(true); 

    setPlayerSecretState(secret);
    await new Promise(resolve => setTimeout(resolve, 500)); 
    
    const autoOpponentSecret = generateSecretCode();
    setOpponentSecretState(autoOpponentSecret);

    setGameState(prev => ({ ...prev, gameStatus: 'PLAYING', currentTurn: 'player' }));
    
    router.push('/play');
    toast({ title: "Secret set!", description: "Computer's secret also set. Game starts!" });
    
    await new Promise(resolve => setTimeout(resolve, 1500)); 

    setIsInitialLoading(false); 
    setIsSubmitting(false); 
  }, [setPlayerSecretState, setOpponentSecretState, setGameState, router, toast]);

  const simulateOpponentTurn = useCallback(async () => {
    if (gameStateRef.current.gameStatus !== 'PLAYING' || 
        gameStateRef.current.currentTurn !== 'opponent' || 
        gameStateRef.current.winner) {
      setIsSubmitting(false);
      return;
    }
  
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500)); 

    if (gameStateRef.current.gameStatus !== 'PLAYING' || 
        gameStateRef.current.currentTurn !== 'opponent' || 
        gameStateRef.current.winner) {
      setIsSubmitting(false);
      return;
    }
  
    const previousOpponentGuessValues = gameStateRef.current.opponentGuesses.map(g => g.value);
    const opponentGuessArray = generateComputerGuess(previousOpponentGuessValues);
    const opponentGuessStr = opponentGuessArray.join('');

    if (!playerSecret || playerSecret.length !== CODE_LENGTH || playerSecret.some(d => d === '' || d === undefined || d === null)) {
      console.error('[GameContext] Opponent turn: Player secret is not properly set for feedback!', playerSecret);
      setGameState(prev => {
        if (prev.gameStatus !== 'PLAYING' || prev.winner) return prev;
        return { ...prev, currentTurn: 'player' };
      });
      toast({ title: "Game Error", description: "Player secret not found for Computer's turn. Your turn again.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    const feedback = calculateFeedback(opponentGuessArray, playerSecret);
    const newOpponentGuess: Guess = { value: opponentGuessStr, feedback };
  
    setGameState(prev => {
      if (prev.gameStatus !== 'PLAYING' || prev.currentTurn !== 'opponent' || prev.winner) {
        return prev; 
      }
      const updatedOpponentGuesses = [...prev.opponentGuesses, newOpponentGuess];
      toast({ title: "Computer guessed!", description: `Computer guessed ${opponentGuessStr}`});
  
      if (checkWin(feedback)) {
        toast({ title: "Oh no!", description: "Computer guessed your number!" });
        return { ...prev, opponentGuesses: updatedOpponentGuesses, gameStatus: 'GAME_OVER', winner: 'opponent' };
      } else {
        return { ...prev, opponentGuesses: updatedOpponentGuesses, currentTurn: 'player' };
      }
    });
    setIsSubmitting(false); 
  }, [playerSecret, setGameState, toast]);


  const makePlayerGuess = useCallback(async (guessStr: string) => {
    if (gameStateRef.current.gameStatus !== 'PLAYING' || gameStateRef.current.currentTurn !== 'player' || isSubmitting) return;
    
    setIsSubmitting(true);

    const guessArray = guessStr.split('');
    const feedback = calculateFeedback(guessArray, opponentSecret);
    const newPlayerGuess: Guess = { value: guessStr, feedback };
    
    setGameState(prev => {
      if (prev.gameStatus !== 'PLAYING' || prev.currentTurn !== 'player' || prev.winner) {
        return prev;
      }
      const updatedPlayerGuesses = [...prev.playerGuesses, newPlayerGuess];
      if (checkWin(feedback)) {
        toast({ title: "Congratulations!", description: "You guessed the Computer's number!" });
        return { ...prev, playerGuesses: updatedPlayerGuesses, gameStatus: 'GAME_OVER', winner: 'player' };
      } else {
        return { ...prev, playerGuesses: updatedPlayerGuesses, currentTurn: 'opponent' };
      }
    });
    setIsSubmitting(false); 
  }, [opponentSecret, setGameState, toast, isSubmitting]);

  useEffect(() => {
    let thinkDelayTimeoutId: NodeJS.Timeout | undefined;
    if (
      gameState.gameStatus === 'PLAYING' &&
      gameState.currentTurn === 'opponent' &&
      !gameState.winner
    ) {
      thinkDelayTimeoutId = setTimeout(() => {
        simulateOpponentTurn();
      }, 750); 
    }
    return () => {
      if (thinkDelayTimeoutId) {
        clearTimeout(thinkDelayTimeoutId);
      }
    };
  }, [gameState.currentTurn, gameState.gameStatus, gameState.winner, simulateOpponentTurn]);


  const exitGame = useCallback(() => {
    initializeGame(); // Call this first to reset GameContext state
    authLogout(); 
    toast({ title: "Game Exited", description: "Your game data has been cleared." });
  }, [authLogout, initializeGame, toast]);


  return (
    <GameContext.Provider value={{ 
      playerSecret, setPlayerSecret, 
      opponentSecret, setOpponentSecret,
      playerGuesses: gameState.playerGuesses, 
      opponentGuesses: gameState.opponentGuesses,
      currentTurn: gameState.currentTurn, 
      gameStatus: gameState.gameStatus, 
      winner: gameState.winner,
      initializeGame,
      submitPlayerSecret,
      makePlayerGuess,
      exitGame,
      isSubmitting,
      isInitialLoading,
      timeLeft,
      isTimerActive,
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
