
export interface Guess {
  value: string; // The 4-digit guessed number as a string e.g. "1234"
  feedback: boolean[]; // Array of 4 booleans, true if digit is in correct position
}

// Single Player Game Status
export type SinglePlayerGameStatus =
  | "SETUP_PLAYER"
  | "WAITING_OPPONENT_SECRET"
  | "PLAYING"
  | "GAME_OVER";

// Multiplayer Game Status
export type MultiplayerGameStatus =
  | "UNKNOWN"                  // Initial state before any server interaction
  | "WAITING_FOR_PLAYERS"      // Room created, waiting for enough players (e.g., host is player1, waiting for player2)
  | "WAITING_FOR_READY"        // All player slots are filled, waiting for all players to set secrets
  | "READY_TO_START"           // All connected players have set secrets, player1 (host) can initiate start
  | "IN_PROGRESS"              // Game is actively being played
  | "GAME_OVER";               // Game has concluded

export interface PlayerData {
  socketId?: string;        // Optional: can be undefined if player disconnected
  secret?: string[];
  guessesMade?: Guess[];
  guessesAgainst?: Guess[];
  hasSetSecret: boolean;   // True if this player has submitted their secret data
  isReady: boolean;          // True if player has confirmed their secret and is ready for game to start
}

export interface GameRoom {
  gameId: string;
  playerCount: number;
  players: { [playerId: string]: PlayerData }; // e.g., { "player1": PlayerData, "player2": PlayerData }
  status: MultiplayerGameStatus;
  turn?: string; // playerId of whose turn it is
  targetMap?: { [playerId: string]: string }; // Who is guessing whose secret
  winner?: string; // playerId of the winner
  createdAt: Date; // For TTL index and tracking
  inProgressSince?: Date; // Timestamp for when the game moved to IN_PROGRESS
}

// Structure for the in-memory store on the server (if not using DB for everything)
// This is more of a conceptual type if we were using in-memory stores, MongoDB handles this.
export interface GameRoomsStore {
  [gameId: string]: GameRoom;
}

// For turn-update event data
export interface TurnUpdateData {
    gameId: string;
    nextPlayerId: string;
    reason?: 'guess' | 'timeout';
}

