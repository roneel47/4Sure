
"use client";
import type React from 'react';
import { createContext, useContext, useState, useCallback, useEffect }
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
}

const GameContext = createContext<GameContextType | undefined>(undefined);

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
    setIsInitialLoading(false); // Reset initial loading state
    setIsSubmitting(false); // Reset submitting state
  }, [setPlayerSecretState, setOpponentSecretState, setGameState]);

  useEffect(() => {
    if (username && gameState.gameStatus === "SETUP_PLAYER" && !playerSecret.some(d => d !== '')) {
      // Stay in setup
    } else if (username && gameState.gameStatus === "WAITING_OPPONENT_SECRET" && !opponentSecret.some(d => d !== '')) {
      // Stay waiting
    }
  }, [username, gameState.gameStatus, playerSecret, opponentSecret, initializeGame]);


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
  }, [setPlayerSecretState, setOpponentSecretState, setGameState, router, toast, setIsSubmitting, setIsInitialLoading]);

  const simulateOpponentTurn = useCallback(async () => {
    if (gameState.gameStatus !== 'PLAYING' || gameState.currentTurn !== 'opponent' || gameState.winner || isSubmitting) {
      return;
    }
  
    if (!playerSecret || playerSecret.length !== CODE_LENGTH || playerSecret.some(d => d === '' || d === undefined || d === null)) {
      console.error('[GameContext] Opponent turn: Player secret is not properly set!', playerSecret);
      setGameState(prev => ({ ...prev, currentTurn: 'player' })); 
      toast({ title: "Game Error", description: "Player secret not found for Computer's turn. Your turn again.", variant: "destructive" });
      return;
    }
  
    setIsSubmitting(true);
    
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500)); 
  
    const previousOpponentGuessValues = gameState.opponentGuesses.map(g => g.value);
    const opponentGuessArray = generateComputerGuess(previousOpponentGuessValues);
    const opponentGuessStr = opponentGuessArray.join('');
    const feedback = calculateFeedback(opponentGuessArray, playerSecret);
    const newOpponentGuess: Guess = { value: opponentGuessStr, feedback };
  
    const updatedOpponentGuesses = [...gameState.opponentGuesses, newOpponentGuess];
    
    toast({ title: "Computer guessed!", description: `Computer guessed ${opponentGuessStr}`});
  
    if (checkWin(feedback)) {
      setGameState(prev => ({ ...prev, opponentGuesses: updatedOpponentGuesses, gameStatus: 'GAME_OVER', winner: 'opponent' }));
      toast({ title: "Oh no!", description: "Computer guessed your number!" });
    } else {
      setGameState(prev => ({ ...prev, opponentGuesses: updatedOpponentGuesses, currentTurn: 'player' }));
    }
    setIsSubmitting(false); 
  }, [gameState, playerSecret, setGameState, toast, isSubmitting]);


  const makePlayerGuess = useCallback(async (guessStr: string) => {
    if (gameState.gameStatus !== 'PLAYING' || gameState.currentTurn !== 'player' || isSubmitting) return;
    
    setIsSubmitting(true);

    const guessArray = guessStr.split('');
    const feedback = calculateFeedback(guessArray, opponentSecret);
    const newPlayerGuess: Guess = { value: guessStr, feedback };
    
    const updatedPlayerGuesses = [...gameState.playerGuesses, newPlayerGuess];

    if (checkWin(feedback)) {
      setGameState(prev => ({ ...prev, playerGuesses: updatedPlayerGuesses, gameStatus: 'GAME_OVER', winner: 'player' }));
      toast({ title: "Congratulations!", description: "You guessed the Computer's number!" });
    } else {
      setGameState(prev => ({ ...prev, playerGuesses: updatedPlayerGuesses, currentTurn: 'opponent' }));
    }
    setIsSubmitting(false); 
  }, [gameState, opponentSecret, setGameState, toast, isSubmitting]);

  useEffect(() => {
    if (
      gameState.gameStatus === 'PLAYING' &&
      gameState.currentTurn === 'opponent' &&
      !gameState.winner &&
      !isSubmitting 
    ) {
      simulateOpponentTurn();
    }
  }, [gameState.currentTurn, gameState.gameStatus, gameState.winner, isSubmitting, simulateOpponentTurn]);


  const exitGame = useCallback(() => {
    authLogout(); 
    toast({ title: "Game Exited", description: "Your game data has been cleared." });
  }, [authLogout, toast]);


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
      isInitialLoading
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
