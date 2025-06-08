
export type DigitFeedback = 'correct' | 'none' | 'empty'; // 'empty' for placeholder before guess

export interface Guess {
  id: string; // unique id for key prop
  guesserId: string; // ID of the player who made the guess
  value: string; // The 4-digit guess string "1234"
  feedback: DigitFeedback[]; // e.g. ['correct', 'none', 'none', 'correct']
  isPlayer: boolean; // true if this guess was made by a human player
}

export type GameMode = "computer" | "duo" | "trio" | "quads";
export type MultiplayerRole = 'host' | 'join' | null;

export interface Player {
  id: string; // Unique identifier, usually username
  name: string;
  secretCode: string;
  guesses: Guess[];
  score: number;
  isComputer?: boolean;
  isHost?: boolean;
  isReady?: boolean;
}

export interface ActiveGameData {
  gameId: string | null;
  gameMode: GameMode | null;
  numberOfPlayers: number | null;
  multiplayerRole: MultiplayerRole | null;
  players: Player[];
  // Add other game-specific states here if needed, e.g., gameStatus: 'lobby' | 'playing' | 'ended'
  gameStatus?: 'lobby' | 'playing' | 'ended'; 
}
