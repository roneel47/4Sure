
"use client";
import type { Guess } from '@/types/game';
// Lock icon import removed

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
          {guess.feedback[index] ? digit : ''}
        </div>
      ))}
    </div>
  );
}

