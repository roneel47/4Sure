
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import GameLogo from '@/components/game-logo';
import useLocalStorage from '@/hooks/use-local-storage';
import PlayerPanel from '../game/components/PlayerPanel';
import GuessInput from '../game/components/GuessInput';
import TurnIndicator from '../game/components/TurnIndicator';
import GameEndDialog from '../game/components/GameEndDialog';
import type { Guess, Player, GameMode } from '@/lib/gameTypes';
import { CODE_LENGTH, generateSecretCode, calculateFeedback, checkWin, generateComputerGuess, calculatePlayerScore } from '@/lib/gameLogic';
import { LogOut } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton'; // Added Skeleton import

const COMPUTER_PLAYER_NAME = "Computer";
const MAX_DISPLAY_GUESSES = 5; 
const REVEAL_DELAY_MS = 3000;

interface PlayerSetupInfo {
  name: string;
  secretCode: string;
}

export default function GameComputerPage() { // Renamed component for clarity in file system
  const router = useRouter();
  const { toast } = useToast();

  const [username] = useLocalStorage<string>('locked-codes-username', '');
  const [userSecretCode] = useLocalStorage<string>('locked-codes-secret-code', ''); 
  const [gameMode] = useLocalStorage<GameMode | null>('locked-codes-gamemode', "computer");
  const [playersSetup] = useLocalStorage<PlayerSetupInfo[]>('locked-codes-players-setup', []);


  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [winner, setWinner] = useState<Player | null>(null); 
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
      // Ensure userSecretCode is correctly retrieved from localStorage
      let p1StoredCode = '';
      const storedCodeItem = localStorage.getItem('locked-codes-secret-code');
      if (storedCodeItem) {
          try {
            p1StoredCode = JSON.parse(storedCodeItem);
          } catch (e) {
            console.error("Error parsing locked-codes-secret-code from localStorage", e);
            p1StoredCode = generateSecretCode(); // Fallback
          }
      } else {
          p1StoredCode = generateSecretCode(); // Fallback if not found
      }
      
      const p1Code = playersSetup.find(p => p.name === username)?.secretCode || p1StoredCode || generateSecretCode();

      initialPlayers = [
        { id: "player1", name: username, secretCode: p1Code, guesses: [], score: 0 },
        { id: "computer", name: COMPUTER_PLAYER_NAME, secretCode: generateSecretCode(), guesses: [], score: 0, isComputer: true }
      ];
      setTargetPlayerIndices([1, 0]); 
    } else {
      // This else block should ideally not be reached if routing is correct.
      // If gameMode is not 'computer', it should be handled by /game page.
      toast({ title: "Error", description: "Incorrect game page for this mode. Redirecting...", variant: "destructive" });
      router.push('/select-mode');
      return;
    }

    setPlayers(initialPlayers);
    setCurrentPlayerIndex(0); 
    setWinner(null);
    setIsGameEndDialogOpen(false);
    setRevealCodes(false);
    setIsLoading(false);

  }, [username, gameMode, playersSetup, router, toast]); // userSecretCode removed as it's read directly inside

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  useEffect(() => {
    if (winner && revealCodes) { // Ensure revealCodes is also true
      const timer = setTimeout(() => {
        setIsGameEndDialogOpen(true);
      }, REVEAL_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [winner, revealCodes]);

  const getCurrentPlayer = () => players[currentPlayerIndex];
  const getTargetPlayer = () => players[targetPlayerIndices[currentPlayerIndex]];

  const handlePlayerGuess = (guessValue: string) => {
    const currentPlayer = getCurrentPlayer();
    const targetPlayer = getTargetPlayer();
    if (winner || !currentPlayer || currentPlayer.isComputer || !targetPlayer) return;

    if (guessValue.length !== CODE_LENGTH || !/^\d+$/.test(guessValue)) {
      toast({ title: "Invalid Guess", description: `Guess must be ${CODE_LENGTH} digits.`, variant: "destructive" });
      return;
    }
    
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
          guesses: updatedGuesses, // MAX_DISPLAY_GUESSES logic removed here, PlayerPanel can handle display
          score: calculatePlayerScore(updatedGuesses) 
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
    const computerP = getCurrentPlayer(); // Renamed to avoid conflict
    const targetHumanP = getTargetPlayer(); // Renamed to avoid conflict
    if (winner || !computerP || !computerP.isComputer || !targetHumanP) return;

    const previousComputerGuessValues = computerP.guesses.map(g => g.value);
    const computerGuessValue = generateComputerGuess(previousComputerGuessValues);
    const feedback = calculateFeedback(computerGuessValue, targetHumanP.secretCode);
    const newGuess: Guess = { 
      id: `comp-${Date.now()}`, 
      guesserId: computerP.id,
      value: computerGuessValue, 
      feedback, 
      isPlayer: false 
    };
    
    setPlayers(prevPlayers => prevPlayers.map((p, index) => {
      if (index === currentPlayerIndex) { // Computer is the current player
         const updatedGuesses = [...p.guesses, newGuess];
        return {
          ...p,
          guesses: updatedGuesses, // MAX_DISPLAY_GUESSES logic removed
          score: calculatePlayerScore(updatedGuesses)
        };
      }
      return p;
    }));

    toast({
      title: `${computerP.name} Guessed!`,
      description: `${computerP.name} guessed: ${computerGuessValue} against ${targetHumanP.name}`,
    });

    if (checkWin(feedback)) {
      setWinner(computerP);
      setRevealCodes(true);
    } else {
      setCurrentPlayerIndex((prevIndex) => (prevIndex + 1) % players.length);
    }
  }, [players, currentPlayerIndex, targetPlayerIndices, toast, winner]); // Dependencies confirmed

  useEffect(() => {
    if (isLoading || players.length === 0) return;
    const currentPlayer = players[currentPlayerIndex]; // get current player from state
    if (currentPlayer?.isComputer && !winner) {
      const timer = setTimeout(() => {
        makeComputerGuessAgainstTarget();
      }, 1500); 
      return () => clearTimeout(timer);
    }
  }, [isLoading, players, currentPlayerIndex, winner, makeComputerGuessAgainstTarget]); // Corrected dependencies

  const handlePlayAgain = () => {
    setIsGameEndDialogOpen(false); // Close dialog first
    // No need to clear localStorage items like secret-code, as initializeGame will re-read or regenerate
    initializeGame(); 
  };

  const handleExitGame = () => {
    localStorage.removeItem('locked-codes-secret-code');
    localStorage.removeItem('locked-codes-gamemode');
    localStorage.removeItem('locked-codes-numplayers'); // This was not in your original list but good to clear
    localStorage.removeItem('locked-codes-players-setup');
    // activeGameData is not used directly by this page, but good practice to clear it if exiting game loop
    localStorage.removeItem('locked-codes-active-game'); 
    
    setPlayers([]); // Clear local component state
    setWinner(null);
    setRevealCodes(false);
    setIsLoading(true); // Reset loading state for potential re-entry
    router.push('/'); 
  };
  
  const leaderboardData = players.map(p => ({ name: p.name, score: p.score })).sort((a,b) => b.score - a.score);

  if (isLoading || players.length === 0) {
    // Using a simple loading text as per your provided code
    // If you want the skeleton here, it would be:
    // return (
    //   <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 bg-background">
    //     <header className="w-full max-w-4xl flex justify-between items-center mb-4">
    //       <Skeleton className="h-10 w-28" /> 
    //       <Skeleton className="h-9 w-24" /> 
    //     </header>
    //     <Skeleton className="my-4 sm:my-6 p-3 h-12 w-full max-w-md" /> 
    //     <main className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
    //       {[...Array(2)].map((_, i) => ( 
    //         <PlayerPanelSkeleton key={i}/> // You'd need to define PlayerPanelSkeleton or inline Skeleton structure
    //       ))}
    //     </main>
    //   </div>
    // );
    return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-xl text-foreground">Loading Game...</p></div>;
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
          isPlayerTurn={!activePlayer.isComputer && !winner} // This determines the message
        />
      )}

      <main className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
        {players.map((player, index) => (
          <PlayerPanel
            key={player.id}
            playerName={player.name + (player.id === "player1" ? " (You)" : "")}
            guesses={player.guesses}
            isCurrentTurn={index === currentPlayerIndex && !winner}
            // For computer mode, your code logic: show user's code if not computer, else ****, reveal all on win
            secretCodeToDisplay={revealCodes ? player.secretCode : (player.isComputer ? "****" : player.secretCode)} 
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
