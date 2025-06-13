
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
  const MAX_POSSIBLE_UNIQUE_CODES = Math.pow(10, CODE_LENGTH);
  const MAX_ATTEMPTS = MAX_POSSIBLE_UNIQUE_CODES + 100; 

  if (excludeList.length >= MAX_POSSIBLE_UNIQUE_CODES) {
    console.warn("All possible codes have been excluded. Returning a random (possibly repeated) guess.");
    return Array(CODE_LENGTH).fill('').map(() => String(Math.floor(Math.random() * 10)));
  }

  do {
    guessArray = Array(CODE_LENGTH).fill('').map(() => String(Math.floor(Math.random() * 10)));
    guessString = guessArray.join('');
    attempts++;
    if (attempts > MAX_ATTEMPTS) {
      console.warn("Max attempts reached in generateComputerGuess. Returning a potentially repeated guess.");
      break; 
    }
  } while (excludeList.includes(guessString));
  
  return guessArray;
}

/**
 * Validates if a sequence of digits meets the game's rules
 * (no 3 or 4 identical consecutive digits for CODE_LENGTH = 4).
 * @param {string[]} digits - The array of digit strings to validate.
 * @returns {boolean} True if the sequence is valid, false otherwise.
 */
export function isValidDigitSequence(digits: string[]): boolean {
  if (digits.length !== CODE_LENGTH) {
    return true; // This function only cares about the pattern, length checked elsewhere
  }

  // Check for 4 identical digits (e.g., "0000")
  if (digits[0] === digits[1] && digits[1] === digits[2] && digits[2] === digits[3]) {
    return false;
  }

  // Check for 3 consecutive identical digits
  // For CODE_LENGTH = 4, this covers "XXXY" and "YXXX"
  if (
    (digits[0] === digits[1] && digits[1] === digits[2]) || // First three are the same
    (digits[1] === digits[2] && digits[2] === digits[3])    // Last three are the same
  ) {
    return false;
  }

  return true;
}
