
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

interface PlayerPanelProps {
  playerName: string;
  isCurrentPlayer: boolean;
  isPlayerTurn: boolean;
  guesses: Guess[];
  onMakeGuess: (guess: string) => void;
  isSubmitting: boolean;
  secretForDisplay?: string[]; // Only for debugging or "show secret" feature
}

const MAX_DIGITS = 4;

export default function PlayerPanel({
  playerName,
  isCurrentPlayer,
  isPlayerTurn,
  guesses,
  onMakeGuess,
  isSubmitting,
  secretForDisplay,
}: PlayerPanelProps) {
  const [currentGuess, setCurrentGuess] = useState<string[]>(Array(MAX_DIGITS).fill(''));
  const { toast } = useToast();

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentGuess.some(digit => digit === '') || currentGuess.length !== MAX_DIGITS) {
      toast({
        title: "Invalid Guess",
        description: `Please enter all ${MAX_DIGITS} digits for your guess.`,
        variant: "destructive",
      });
      return;
    }
    onMakeGuess(currentGuess.join(''));
    setCurrentGuess(Array(MAX_DIGITS).fill('')); // Clear input after submission
  };

  const canMakeGuess = isCurrentPlayer && isPlayerTurn && !isSubmitting;

  return (
    <Card className={`flex-1 w-full shadow-lg ${isPlayerTurn && isCurrentPlayer ? 'border-2 border-primary ring-2 ring-primary/50' : 'border-border'}`}>
      <CardHeader>
        <CardTitle className="flex items-center text-xl sm:text-2xl">
          <UserCircle2 className={`mr-2 h-6 w-6 sm:h-7 sm:h-7 ${isCurrentPlayer ? 'text-primary' : ''}`} />
          {playerName} {isCurrentPlayer && "(You)"}
        </CardTitle>
        {secretForDisplay && (
            <CardDescription className="text-xs font-mono">Secret: {secretForDisplay.join('')}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-64"> {/* Fixed height for scroll area */}
          <ScrollArea className="h-full pr-3">
            {guesses.length === 0 && (
              <p className="text-muted-foreground text-center py-8">No guesses made yet.</p>
            )}
            {guesses.slice().reverse().map((guess, index) => (
              <GuessDisplay key={guesses.length - 1 - index} guess={guess} isPlayerGuess={isCurrentPlayer} />
            ))}
          </ScrollArea>
        </div>

        {isCurrentPlayer && (
          <form onSubmit={handleGuessSubmit} className="space-y-3 pt-4 border-t border-border/50">
            <DigitInput
              count={MAX_DIGITS}
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
