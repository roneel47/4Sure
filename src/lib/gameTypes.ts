
export type DigitFeedback = 'correct' | 'none' | 'empty'; // 'empty' for placeholder before guess

export interface Guess {
  id: string; // unique id for key prop
  guesserId: string; // ID of the player who made the guess
  targetId?: string; // ID of the player whose code was being guessed (for MP context)
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
  guesses: Guess[]; // Guesses made BY this player
  score: number; // Best single guess score
  isComputer?: boolean;
  isHost?: boolean;
  isReady?: boolean;
}

// Defines the structure for active game data stored in localStorage
// This is the "master" record for a game session, especially for multiplayer.
export interface ActiveGameData {
  gameId: string | null; // Unique ID for multiplayer games, null for 'vs Computer'
  gameMode: GameMode | null;
  numberOfPlayers: number | null; // Max number of players for this game mode
  multiplayerRole: MultiplayerRole | null; // 'host', 'join', or null if not applicable
  players: Player[]; // Array of all players in the game
  gameStatus?: 'lobby' | 'playing' | 'ended'; // Current status of the game
  // currentTurnPlayerId?: string; // ID of player whose turn it is
  // currentTargetPlayerId?: string; // ID of player being targeted
}
