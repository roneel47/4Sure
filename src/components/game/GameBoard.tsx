
"use client";
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import PlayerPanel from './PlayerPanel';
import TurnIndicator from './TurnIndicator';
import { Button } from '../ui/button';
import { useRouter } from 'next/navigation';
import { Award, Hourglass, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

export default function GameBoard() {
  const { 
    playerSecret, 
    opponentSecret, // For display/debug in local sim
    playerGuesses, 
    opponentGuesses, 
    currentTurn, 
    gameStatus, 
    winner,
    makePlayerGuess,
    initializeGame, // To restart game
    isSubmitting
  } = useGame();
  const { username } = useAuth();
  const router = useRouter();

  const handleRestartGame = () => {
    initializeGame();
    router.push('/setup'); // Go back to setup for new secrets
  };

  if (gameStatus === "SETUP_PLAYER" || gameStatus === "WAITING_OPPONENT_SECRET") {
    // This state should be handled by /setup page, redirect if accessed directly
    if (typeof window !== 'undefined') router.replace("/setup");
    return <div className="flex-grow flex items-center justify-center"><p>Loading game setup...</p></div>;
  }
  
  if (gameStatus === "GAME_OVER") {
    return (
      <Card className="w-full max-w-md mx-auto text-center shadow-xl">
        <CardHeader>
          <Award className="mx-auto h-16 w-16 text-primary" />
          <CardTitle className="text-3xl mt-4">
            {winner === 'player' ? "You Win!" : "Opponent Wins!"}
          </CardTitle>
          <CardDescription className="pt-2">
            {winner === 'player' 
              ? `Congratulations, ${username}! You guessed the number!` 
              : `Better luck next time, ${username}! The opponent guessed the number.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Your Secret: <span className="font-mono text-primary">{playerSecret.join('')}</span></p>
          <p>Opponent's Secret: <span className="font-mono text-primary">{opponentSecret.join('')}</span></p>
          <Button onClick={handleRestartGame} className="w-full" size="lg">
            <RotateCcw className="mr-2 h-5 w-5" /> Play Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const playerPanelName = username || "Player";
  const opponentPanelName = "Opponent"; // In real app, this would be opponent's username

  return (
    <div className="space-y-6">
      <TurnIndicator 
        currentPlayerName={currentTurn === 'player' ? playerPanelName : opponentPanelName}
        isPlayerTurn={currentTurn === 'player'} 
      />
      <div className="flex flex-col md:flex-row gap-4 sm:gap-6">
        <PlayerPanel
          playerName={playerPanelName}
          isCurrentPlayer={true}
          isPlayerTurn={currentTurn === 'player'}
          guesses={playerGuesses}
          onMakeGuess={makePlayerGuess}
          isSubmitting={isSubmitting}
          secretForDisplay={playerSecret}
        />
        <PlayerPanel
          playerName={opponentPanelName}
          isCurrentPlayer={false} // This panel is always for the opponent from current user's view
          isPlayerTurn={currentTurn === 'opponent'}
          guesses={opponentGuesses}
          onMakeGuess={() => {}} // Opponent guesses are simulated or come from backend
          isSubmitting={isSubmitting}
          secretForDisplay={opponentSecret}
        />
      </div>
      {isSubmitting && currentTurn === 'opponent' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 text-center">
            <Hourglass className="mx-auto h-12 w-12 text-primary animate-spin" />
            <p className="mt-4 text-lg">Opponent is thinking...</p>
          </Card>
        </div>
      )}
    </div>
  );
}
