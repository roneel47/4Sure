
export const CODE_LENGTH = 4;

/**
 * Generates a random secret code.
 * @returns {string[]} An array of strings, each a digit, representing the secret code.
 */
export function generateSecretCode(): string[] {
  return Array(CODE_LENGTH).fill('').map(() => String(Math.floor(Math.random() * 10)));
}

/**
 * Calculates feedback for a guess against a secret code.
 * @param {string[]} guessArray - The guessed code as an array of digit strings.
 * @param {string[]} secretCode - The secret code as an array of digit strings.
 * @returns {boolean[]} An array of booleans indicating correct digit and position.
 */
export function calculateFeedback(guessArray: string[], secretCode: string[]): boolean[] {
  if (!secretCode || secretCode.length !== CODE_LENGTH || secretCode.some(d => d === '' || d === undefined || d === null)) {
    console.error("[gameLogic] Invalid secretCode in calculateFeedback:", secretCode);
    return Array(CODE_LENGTH).fill(false);
  }
  return guessArray.map((digit, index) => digit === secretCode[index]);
}

/**
 * Checks if the feedback indicates a win.
 * @param {boolean[]} feedback - The feedback array from calculateFeedback.
 * @returns {boolean} True if all feedback elements are true, otherwise false.
 */
export function checkWin(feedback: boolean[]): boolean {
  return feedback.every(f => f);
}

/**
 * Generates a random guess for the computer, avoiding guesses from an exclude list.
 * @param {string[]} [excludeList=[]] - An optional list of guess strings to avoid.
 * @returns {string[]} An array of strings, each a digit, representing the computer's guess.
 */
export function generateComputerGuess(excludeList: string[] = []): string[] {
  let guessString = "";
  let guessArray: string[] = [];
  let attempts = 0;
  // There are 10^CODE_LENGTH possible unique codes (e.g., 10,000 for CODE_LENGTH = 4).
  // MAX_ATTEMPTS can be set to this value or slightly higher as a practical limit.
  const MAX_POSSIBLE_UNIQUE_CODES = Math.pow(10, CODE_LENGTH);
  const MAX_ATTEMPTS = MAX_POSSIBLE_UNIQUE_CODES + 100; // A little buffer

  if (excludeList.length >= MAX_POSSIBLE_UNIQUE_CODES) {
    console.warn("All possible codes have been excluded. Returning a random (possibly repeated) guess.");
    // Fallback to a completely random guess if all options are exhausted.
    return Array(CODE_LENGTH).fill('').map(() => String(Math.floor(Math.random() * 10)));
  }

  do {
    guessArray = Array(CODE_LENGTH).fill('').map(() => String(Math.floor(Math.random() * 10)));
    guessString = guessArray.join('');
    attempts++;
    if (attempts > MAX_ATTEMPTS) {
      console.warn("Max attempts reached in generateComputerGuess. Returning a potentially repeated guess.");
      break; // Exit loop and return the last generated guess
    }
  } while (excludeList.includes(guessString));
  
  return guessArray;
}

