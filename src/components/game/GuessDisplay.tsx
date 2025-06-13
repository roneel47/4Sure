
"use client";
import type { Guess } from '@/types/game';
import { Lock } from 'lucide-react';

interface GuessDisplayProps {
  guess: Guess;
  isPlayerGuess?: boolean; // To slightly differentiate styling or context if needed
}

export default function GuessDisplay({ guess, isPlayerGuess = false }: GuessDisplayProps) {
  return (
    <div className={`flex items-center space-x-1.5 p-2 rounded-md mb-2 ${isPlayerGuess ? 'bg-secondary/30' : 'bg-muted/30'}`}>
      {guess.value.split('').map((digit, index) => (
        <div
          key={index}
          className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-xl sm:text-2xl font-bold rounded-md border-2 transition-all duration-300
            ${guess.feedback[index] 
              ? 'bg-primary text-primary-foreground border-primary animate-digit-lock' 
              : 'bg-input text-foreground border-border/70'
            }
          `}
        >
          {guess.feedback[index] ? <Lock className="w-5 h-5 sm:w-6 sm:h-6" /> : digit}
        </div>
      ))}
      <div className="ml-auto pl-2 flex flex-col items-end">
        <span className="text-xs text-muted-foreground">Guess:</span>
        <span className="text-sm font-mono">{guess.value}</span>
      </div>
    </div>
  );
}
