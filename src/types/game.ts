
export interface Guess {
  value: string; // The 4-digit guessed number as a string e.g. "1234"
  feedback: boolean[]; // Array of 4 booleans, true if digit is in correct position
}
