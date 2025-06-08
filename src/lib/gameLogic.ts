
import type { DigitFeedback, Guess } from './gameTypes';

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

export function generateComputerGuess(previousComputerGuessesValues: string[]): string {
  let guess: string;
  const MAX_ATTEMPTS = 1000; 
  let attempts = 0;
  do {
    guess = generateSecretCode();
    attempts++;
  } while (previousComputerGuessesValues.includes(guess) && attempts < MAX_ATTEMPTS);
  
  if (attempts >= MAX_ATTEMPTS) {
    return generateSecretCode(); // Fallback if it can't find a unique guess quickly
  }
  return guess;
}

export function calculatePlayerScore(guesses: Guess[]): number {
  if (!guesses || guesses.length === 0) {
    return 0;
  }
  let maxCorrectDigitsInSingleGuess = 0;
  guesses.forEach(guess => {
    const correctDigitsInThisGuess = guess.feedback.filter(fb => fb === 'correct').length;
    if (correctDigitsInThisGuess > maxCorrectDigitsInSingleGuess) {
      maxCorrectDigitsInSingleGuess = correctDigitsInThisGuess;
    }
  });
  return maxCorrectDigitsInSingleGuess;
}
