import type { DigitFeedback } from './gameTypes';

export const CODE_LENGTH = 4;

export function generateSecretCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

export function calculateFeedback(guess: string, secretCode: string): DigitFeedback[] {
  const feedback: DigitFeedback[] = [];
  if (guess.length !== CODE_LENGTH || secretCode.length !== CODE_LENGTH) {
    // Should not happen with proper validation, but good to have a fallback
    return Array(CODE_LENGTH).fill('none');
  }
  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guess[i] === secretCode[i]) {
      feedback.push('correct');
    } else {
      feedback.push('none');
    }
  }
  return feedback;
}

export function checkWin(feedback: DigitFeedback[]): boolean {
  return feedback.length === CODE_LENGTH && feedback.every(f => f === 'correct');
}

// Simple random guess for computer, avoiding its own previous guesses
export function generateComputerGuess(previousComputerGuessesValues: string[]): string {
  let guess: string;
  const MAX_ATTEMPTS = 1000; // Prevent infinite loop if all codes guessed
  let attempts = 0;
  do {
    guess = generateSecretCode();
    attempts++;
  } while (previousComputerGuessesValues.includes(guess) && attempts < MAX_ATTEMPTS);
  
  if (attempts >= MAX_ATTEMPTS) {
    // Fallback if somehow all codes are exhausted (highly unlikely for 4 digits)
    // Or just return a random one even if it's a repeat
    return generateSecretCode();
  }
  return guess;
}
