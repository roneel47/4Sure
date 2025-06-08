export type DigitFeedback = 'correct' | 'none' | 'empty'; // 'empty' for placeholder before guess

export interface Guess {
  id: string; // unique id for key prop
  value: string; // The 4-digit guess string "1234"
  feedback: DigitFeedback[]; // e.g. ['correct', 'none', 'none', 'correct']
  isPlayer: boolean; // true if this guess was made by the human player
}
