
"use client";
import type React from 'react';
import { createContext, useContext, useState, useCallback, useEffect }
from 'react';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { Guess } from '@/types/game';
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


export type GameStatus = "SETUP_PLAYER" | "WAITING_OPPONENT_SECRET" | "PLAYING" | "GAME_OVER";


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
    setPlayerSecretState(secret);
    await new Promise(resolve => setTimeout(resolve, 500)); 
    
    const autoOpponentSecret = generateSecretCode();
    setOpponentSecretState(autoOpponentSecret);

    setGameState(prev => ({ ...prev, gameStatus: 'PLAYING', currentTurn: 'player' }));
    setIsSubmitting(false);
    router.push('/play');
    toast({ title: "Secret set!", description: "Computer's secret also set. Game starts!" });
  }, [setPlayerSecretState, setOpponentSecretState, setGameState, router, toast]);

  const simulateOpponentTurn = useCallback(async () => {
    console.log('[GameContext] Attempting simulateOpponentTurn. Current state:', {
      gameStatus: gameState.gameStatus,
      currentTurn: gameState.currentTurn,
      isSubmittingState: isSubmitting,
      playerSecret: playerSecret.join('')
    });

    if (gameState.gameStatus !== 'PLAYING') {
      console.log('[GameContext] Opponent turn: Not PLAYING. Status:', gameState.gameStatus);
      return;
    }
    if (gameState.currentTurn !== 'opponent') {
      console.log('[GameContext] Opponent turn: Not opponents turn. Turn:', gameState.currentTurn);
      return;
    }
    if (isSubmitting) {
      console.log('[GameContext] Opponent turn: Already submitting.');
      return;
    }
    if (!playerSecret || playerSecret.length !== CODE_LENGTH || playerSecret.some(d => d === '' || d === undefined || d === null)) {
      console.error('[GameContext] Opponent turn: Player secret is not properly set!', playerSecret);
      setGameState(prev => ({ ...prev, currentTurn: 'player' })); 
      toast({ title: "Game Error", description: "Player secret not found for Computer's turn. Your turn again.", variant: "destructive" });
      setIsSubmitting(false); 
      return;
    }

    setIsSubmitting(true);
    console.log('[GameContext] Opponent turn: setIsSubmitting(true)');
    
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500));

    const opponentGuessArray = generateComputerGuess();
    const opponentGuessStr = opponentGuessArray.join('');
    const feedback = calculateFeedback(opponentGuessArray, playerSecret);
    const newOpponentGuess: Guess = { value: opponentGuessStr, feedback };

    const updatedOpponentGuesses = [...gameState.opponentGuesses, newOpponentGuess];
    
    console.log(`[GameContext] Opponent guessed: ${opponentGuessStr}, Feedback: ${feedback.join(',')}, Against Player Secret: ${playerSecret.join('')}`);
    toast({ title: "Computer guessed!", description: `Computer guessed ${opponentGuessStr}`});

    if (checkWin(feedback)) {
      console.log('[GameContext] Opponent wins.');
      setGameState(prev => ({ ...prev, opponentGuesses: updatedOpponentGuesses, gameStatus: 'GAME_OVER', winner: 'opponent' }));
      toast({ title: "Oh no!", description: "Computer guessed your number!" });
    } else {
      console.log('[GameContext] Opponent turn ends, player\'s turn.');
      setGameState(prev => ({ ...prev, opponentGuesses: updatedOpponentGuesses, currentTurn: 'player' }));
    }
    setIsSubmitting(false);
    console.log('[GameContext] Opponent turn: setIsSubmitting(false)');
  }, [gameState, playerSecret, setGameState, toast, isSubmitting]);


  const makePlayerGuess = useCallback(async (guessStr: string) => {
    if (gameState.gameStatus !== 'PLAYING' || gameState.currentTurn !== 'player' || isSubmitting) return;
    
    console.log('[GameContext] Player making guess:', guessStr);
    setIsSubmitting(true);

    const guessArray = guessStr.split('');
    const feedback = calculateFeedback(guessArray, opponentSecret);
    const newPlayerGuess: Guess = { value: guessStr, feedback };
    
    const updatedPlayerGuesses = [...gameState.playerGuesses, newPlayerGuess];

    if (checkWin(feedback)) {
      setGameState(prev => ({ ...prev, playerGuesses: updatedPlayerGuesses, gameStatus: 'GAME_OVER', winner: 'player' }));
      toast({ title: "Congratulations!", description: "You guessed the Computer's number!" });
      setIsSubmitting(false); 
    } else {
      setGameState(prev => ({ ...prev, playerGuesses: updatedPlayerGuesses, currentTurn: 'opponent' }));
      setTimeout(() => {
        simulateOpponentTurn();
      }, 1500); 
      setIsSubmitting(false); 
    }
  }, [gameState, opponentSecret, setGameState, toast, isSubmitting, simulateOpponentTurn]);


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
