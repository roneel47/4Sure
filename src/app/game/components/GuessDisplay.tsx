
"use client";

import type { DigitFeedback } from '@/lib/gameTypes';

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
        const displayChar = fb === 'correct' ? digit : '_';
        
        let ariaLabelText = `Position ${index + 1}: `;
        if (fb === 'correct') {
          ariaLabelText += `Digit ${digit}, Correct.`;
        } else {
          ariaLabelText += `Hidden, Incorrect guess.`;
        }

        return (
          <div
            key={index}
            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded border border-border bg-muted/30"
            aria-label={ariaLabelText}
          >
            <span className="font-mono text-lg text-foreground">{displayChar}</span>
          </div>
        );
      })}
    </div>
  );
}
