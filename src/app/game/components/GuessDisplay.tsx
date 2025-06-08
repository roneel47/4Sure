"use client";

import type { DigitFeedback } from '@/lib/gameTypes';
import { Lock, HelpCircle } from 'lucide-react'; // Using HelpCircle for 'none'

interface GuessDisplayProps {
  guessValue: string; // e.g., "1234"
  feedback: DigitFeedback[]; // e.g., ['correct', 'none', 'none', 'correct']
}

export default function GuessDisplay({ guessValue, feedback }: GuessDisplayProps) {
  const digits = guessValue.split('');

  return (
    <div className="flex space-x-2 items-center">
      {digits.map((digit, index) => {
        const fb = feedback[index];
        let bgColor = 'bg-muted/50'; // Default for 'none' or 'empty'
        let icon = <span className="font-mono text-lg">{digit}</span>;
        let textColor = 'text-foreground';

        if (fb === 'correct') {
          bgColor = 'bg-green-500/30'; // Green highlight for correct
          icon = <Lock className="w-5 h-5 text-green-400" />;
          textColor = 'text-green-400';
        } else if (fb === 'none') {
          // Keep default digit display for 'none'
          bgColor = 'bg-destructive/20'; // Reddish highlight for incorrect
        }

        return (
          <div
            key={index}
            className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded border border-border ${bgColor} transition-all duration-300`}
            aria-label={`Digit ${index + 1}: ${digit}, Status: ${fb}`}
          >
            {fb === 'correct' ? icon : <span className={`font-mono text-lg ${textColor}`}>{digit}</span>}
          </div>
        );
      })}
    </div>
  );
}
