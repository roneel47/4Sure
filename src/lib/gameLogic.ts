
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
 * Generates a random guess for the computer.
 * @returns {string[]} An array of strings, each a digit, representing the computer's guess.
 */
export function generateComputerGuess(): string[] {
  return Array(CODE_LENGTH).fill('').map(() => String(Math.floor(Math.random() * 10)));
}
