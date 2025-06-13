
"use client";
import type React from 'react';
import { useState } from 'react';
import type { Guess } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DigitInput from './DigitInput';
import GuessDisplay from './GuessDisplay';
import { Send, UserCircle2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { CODE_LENGTH } from '@/lib/gameLogic'; // Import CODE_LENGTH

interface PlayerPanelProps {
  playerName: string;
  isCurrentPlayer: boolean;
  isPlayerTurn: boolean;
  guesses: Guess[];
  onMakeGuess: (guess: string) => void;
  isSubmitting: boolean;
  secretForDisplay?: string[];
}

export default function PlayerPanel({
  playerName,
  isCurrentPlayer,
  isPlayerTurn,
  guesses,
  onMakeGuess,
  isSubmitting,
  secretForDisplay,
}: PlayerPanelProps) {
  const [currentGuess, setCurrentGuess] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const { toast } = useToast();

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentGuess.some(digit => digit === '') || currentGuess.length !== CODE_LENGTH) {
      toast({
        title: "Invalid Guess",
        description: `Please enter all ${CODE_LENGTH} digits for your guess.`,
        variant: "destructive",
      });
      return;
    }
    onMakeGuess(currentGuess.join(''));
    setCurrentGuess(Array(CODE_LENGTH).fill('')); // Clear input after submission
  };

  const canMakeGuess = isCurrentPlayer && isPlayerTurn && !isSubmitting;

  return (
    <Card className={`flex-1 w-full shadow-lg ${isPlayerTurn && isCurrentPlayer ? 'border-2 border-primary ring-2 ring-primary/50' : 'border-border'}`}>
      <CardHeader>
        <CardTitle className="flex items-center text-xl sm:text-2xl">
          <UserCircle2 className={`mr-2 h-6 w-6 sm:h-7 sm:h-7 ${isCurrentPlayer ? 'text-primary' : ''}`} />
          {playerName} {isCurrentPlayer && "(You)"}
        </CardTitle>
        {secretForDisplay && secretForDisplay.length === CODE_LENGTH && (
          <CardDescription className="text-xs font-mono pt-1">
            Secret Code: {isCurrentPlayer ? secretForDisplay.join('') : '****'}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-64">
          <ScrollArea className="h-full pr-3">
            {guesses.length === 0 && (
              <p className="text-muted-foreground text-center py-8">No guesses made yet.</p>
            )}
            {guesses.slice(-5).reverse().map((guess, index) => ( // Show last 5 guesses
              <GuessDisplay key={`${guess.value}-${guesses.length - 1 - index}`} guess={guess} isPlayerGuess={isCurrentPlayer} />
            ))}
          </ScrollArea>
        </div>

        {isCurrentPlayer && (
          <form onSubmit={handleGuessSubmit} className="space-y-3 pt-4 border-t border-border/50">
            <DigitInput
              count={CODE_LENGTH}
              values={currentGuess}
              onChange={setCurrentGuess}
              disabled={!canMakeGuess}
              ariaLabel="Guess digit"
            />
            <Button type="submit" className="w-full" disabled={!canMakeGuess} size="lg">
              <Send className="mr-2 h-4 w-4" /> {isSubmitting ? 'Submitting...' : 'Make Guess'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

