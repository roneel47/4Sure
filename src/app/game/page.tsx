
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
import type { Guess, Player, GameMode, ActiveGameData } from '@/lib/gameTypes';
import { CODE_LENGTH, calculateFeedback, checkWin, generateComputerGuess, calculatePlayerScore, generateSecretCode } from '@/lib/gameLogic';
import { LogOut } from 'lucide-react';

const REVEAL_DELAY_MS = 3000;

export default function GamePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [username] = useLocalStorage<string>('locked-codes-username', '');
  const [activeGameData, setActiveGameData] = useLocalStorage<ActiveGameData | null>('locked-codes-active-game', null);
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [winner, setWinner] = useState<Player | null>(null);
  const [isGameEndDialogOpen, setIsGameEndDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [revealCodes, setRevealCodes] = useState<boolean>(false);
  const [targetPlayerIndices, setTargetPlayerIndices] = useState<number[]>([]);


  const initializeGame = useCallback(() => {
    setIsLoading(true);
    if (!username || !activeGameData || !activeGameData.players || activeGameData.players.length === 0) {
      toast({ title: "Error", description: "Game data not found or incomplete. Redirecting to setup...", variant: "destructive" });
      router.push('/');
      return;
    }
    
    // For multiplayer, players are already set up in activeGameData from lobby
    // For 'vs Computer', players were set up in enter-code page
    setPlayers(activeGameData.players);

    // Determine target indices for guessing
    // This logic needs to be more robust for various multiplayer modes (duo, trio, quads)
    // For now, a simple P1 vs P2 (or P1 vs Computer) logic.
    if (activeGameData.players.length >= 2) {
      if (activeGameData.gameMode === 'computer') {
        setTargetPlayerIndices([1, 0]); // P1 targets Computer (idx 1), Computer targets P1 (idx 0)
      } else { // Multiplayer modes (Duo, Trio, Quads)
        // Simplified: P1 targets P2, P2 targets P1. 
        // More complex targeting (e.g., round-robin for Trio/Quads) can be added later.
        // For now, this makes it playable for 2 human players.
        // If more than 2 players, this targeting is not fully representative of all interactions.
        const indices = activeGameData.players.map((_, i, arr) => (i + 1) % arr.length);
        setTargetPlayerIndices(indices);

        // Example for Trio: P0->P1, P1->P2, P2->P0
        // if (activeGameData.numberOfPlayers === 3) setTargetPlayerIndices([1, 2, 0]);
        // Example for Quads: P0->P1, P1->P2, P2->P3, P3->P0
        // if (activeGameData.numberOfPlayers === 4) setTargetPlayerIndices([1, 2, 3, 0]);
      }
    } else {
      // Fallback or error for insufficient players
      setTargetPlayerIndices([]);
    }
    
    setCurrentPlayerIndex(0); // First player in the list starts (could be host, or first human)
    setWinner(null);
    setIsGameEndDialogOpen(false);
    setRevealCodes(false);
    setIsLoading(false);

  }, [username, activeGameData, router, toast]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);
  
  useEffect(() => {
    if (winner && !isGameEndDialogOpen) { // Only trigger dialog if not already open and codes are revealed
      const timer = setTimeout(() => {
        setIsGameEndDialogOpen(true);
      }, REVEAL_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [winner, isGameEndDialogOpen, revealCodes]);


  const getCurrentPlayer = () => players[currentPlayerIndex];
  const getTargetPlayer = () => {
    if(targetPlayerIndices.length > currentPlayerIndex && players.length > targetPlayerIndices[currentPlayerIndex]){
        return players[targetPlayerIndices[currentPlayerIndex]];
    }
    return null; // Should not happen in a well-formed game
  }


  const updatePlayerInGameData = (playerId: string, updatedGuessData: {guesses: Guess[], score: number}) => {
    if(activeGameData){
        const updatedPlayers = activeGameData.players.map(p => 
            p.id === playerId ? {...p, guesses: updatedGuessData.guesses, score: updatedGuessData.score } : p
        );
        setActiveGameData({...activeGameData, players: updatedPlayers});
        // Also update the master list of games if gameId exists
        if(activeGameData.gameId){
            const allGames = JSON.parse(localStorage.getItem('locked-codes-all-games') || '{}') as Record<string, ActiveGameData>;
            if(allGames[activeGameData.gameId]){
                allGames[activeGameData.gameId].players = updatedPlayers;
                localStorage.setItem('locked-codes-all-games', JSON.stringify(allGames));
            }
        }
    }
  }


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
    
    const updatedPlayerGuesses = [...currentPlayer.guesses, newGuess];
    const updatedPlayerScore = calculatePlayerScore(updatedPlayerGuesses);

    setPlayers(prevPlayers => prevPlayers.map((p, index) => {
      if (index === currentPlayerIndex) {
        return { ...p, guesses: updatedPlayerGuesses, score: updatedPlayerScore };
      }
      return p;
    }));
    updatePlayerInGameData(currentPlayer.id, {guesses: updatedPlayerGuesses, score: updatedPlayerScore});


    if (checkWin(feedback)) {
      setWinner(currentPlayer);
      setRevealCodes(true); // Reveal codes immediately on win
    } else {
      setCurrentPlayerIndex((prevIndex) => (prevIndex + 1) % players.length);
    }
  };

  const makeComputerGuessAgainstTarget = useCallback(() => {
    const computerPlayer = getCurrentPlayer();
    const targetHumanPlayer = getTargetPlayer();

    if (winner || !computerPlayer || !computerPlayer.isComputer || !targetHumanPlayer) return;
    
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
    
    const updatedPlayerGuesses = [...computerPlayer.guesses, newGuess];
    const updatedPlayerScore = calculatePlayerScore(updatedPlayerGuesses);

    setPlayers(prevPlayers => prevPlayers.map((p, index) => {
      if (index === currentPlayerIndex) {
        return { ...p, guesses: updatedPlayerGuesses, score: updatedPlayerScore };
      }
      return p;
    }));
    updatePlayerInGameData(computerPlayer.id, {guesses: updatedPlayerGuesses, score: updatedPlayerScore});


    toast({
      title: `${computerPlayer.name} Guessed!`,
      description: `${computerPlayer.name} guessed: ${computerGuessValue} against ${targetHumanPlayer.name}`,
    });

    if (checkWin(feedback)) {
      setWinner(computerPlayer);
      setRevealCodes(true); // Reveal codes immediately
    } else {
      setCurrentPlayerIndex((prevIndex) => (prevIndex + 1) % players.length);
    }
  }, [players, currentPlayerIndex, targetPlayerIndices, toast, winner, setActiveGameData, activeGameData]);

  useEffect(() => {
    if (isLoading || players.length === 0 || !activeGameData) return;
    
    const currentPlayer = players[currentPlayerIndex];
    if (currentPlayer?.isComputer && !winner) {
      const timer = setTimeout(() => {
        makeComputerGuessAgainstTarget();
      }, 1500); 
      return () => clearTimeout(timer);
    }
  }, [currentPlayerIndex, players, winner, makeComputerGuessAgainstTarget, isLoading, activeGameData]);

  const handlePlayAgain = () => {
    setIsGameEndDialogOpen(false); // Close dialog first
    setWinner(null);
    setRevealCodes(false);
    // For multiplayer, host might decide to play again, which needs more complex logic.
    // For now, play again sends to select mode.
    if (activeGameData && activeGameData.gameId) { // Multiplayer game
        // Reset player states for a new round IF keeping the same lobby
        // Or navigate to select-mode to form a new game
         setActiveGameData(prev => prev ? {...prev, gameStatus: 'lobby', players: prev.players.map(p => ({...p, guesses:[], score:0, isReady: p.isHost ? true : false, secretCode: p.isHost ? p.secretCode : ''}))} : null ); // Host keeps code, others reset
         
         // Update allGames as well
        if(activeGameData.gameId && localStorage.getItem('locked-codes-all-games')){
             const allGames = JSON.parse(localStorage.getItem('locked-codes-all-games')!) as Record<string, ActiveGameData>;
             if(allGames[activeGameData.gameId]){
                 allGames[activeGameData.gameId].gameStatus = 'lobby';
                 allGames[activeGameData.gameId].players = allGames[activeGameData.gameId].players.map(p => ({...p, guesses:[], score:0, isReady: p.isHost ? true : false, secretCode: p.isHost ? p.secretCode : ''}));
                 localStorage.setItem('locked-codes-all-games', JSON.stringify(allGames));
             }
        }


        if(activeGameData.multiplayerRole === 'host'){
            router.push(`/host-lobby/${activeGameData.gameId}`);
        } else {
             router.push(`/player-lobby/${activeGameData.gameId}`);
        }

    } else { // 'vs Computer' mode
        router.push('/select-mode'); // Go back to select mode to start fresh
    }
  };

  const handleExitGame = () => {
    // Clear active game data, player keeps username
    setActiveGameData(null);
    // Optionally, if host exits, the game in 'allGames' could be marked as abandoned or removed.
    // This is complex, for now, just clears active game for this user.
    router.push('/');
  };
  
  const leaderboardData = players.map(p => ({ name: p.name, score: p.score })).sort((a,b) => b.score - a.score);

  if (isLoading || players.length === 0 || !activeGameData) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-xl">Loading Game...</p></div>;
  }
  
  const activePlayer = players[currentPlayerIndex];
  const isMyTurn = activePlayer && activePlayer.id === username && !activePlayer.isComputer && !winner;

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
          isPlayerTurn={activePlayer.id === username && !activePlayer.isComputer && !winner}
        />
      )}

      <main className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
        {players.map((player, index) => (
          <PlayerPanel
            key={player.id}
            playerName={player.name}
            guesses={player.guesses}
            isCurrentTurn={index === currentPlayerIndex && !winner}
            secretCodeToDisplay={revealCodes || player.id === username || (winner && player.isComputer) ? player.secretCode : "****"} 
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
