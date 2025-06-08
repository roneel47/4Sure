# Developer Guide for 4Sure

This document provides information for developers working on the 4Sure game.

## Running the App

Follow the instructions in the main `README.md` file to install dependencies and start the development server:

```bash
npm install
npm run dev
```
The app will typically run on `http://localhost:9002`.

## Key LocalStorage Items

The game uses `localStorage` to manage state, especially for simulating multiplayer lobbies and persisting user data across sessions. Understanding these keys is crucial for debugging and testing:

-   **`locked-codes-username`**:
    -   **Type**: `string`
    -   **Description**: Stores the current player's chosen username.
    -   **Example**: `"Player123"`

-   **`locked-codes-active-game`**:
    -   **Type**: `ActiveGameData` (JSON stringified object, see `src/lib/gameTypes.ts`)
    -   **Description**: Stores the complete state of the game session the user is currently part of or setting up. This includes game mode, number of players, multiplayer role (host/join), the list of players (with their IDs, names, secret codes, guesses, scores, ready status), and the overall game status (lobby, playing, ended).
    -   **Example (for a host in a duo lobby)**:
        ```json
        {
          "gameId": "XYZ123",
          "gameMode": "duo",
          "numberOfPlayers": 2,
          "multiplayerRole": "host",
          "players": [
            {
              "id": "HostUser",
              "name": "HostUser",
              "secretCode": "1234",
              "guesses": [],
              "score": 0,
              "isHost": true,
              "isReady": true
            }
          ],
          "gameStatus": "lobby"
        }
        ```

-   **`locked-codes-all-games`**:
    -   **Type**: `Record<string, ActiveGameData>` (JSON stringified object)
    -   **Description**: A dictionary where each key is a `gameId` and the value is the `ActiveGameData` for that specific game session. This is used to simulate a shared "server" state for game lobbies, allowing different "players" (in different tabs or sessions, if manually synchronized) to see and join games.
    -   **Example**:
        ```json
        {
          "XYZ123": { /* ActiveGameData for game XYZ123 */ },
          "ABC789": { /* ActiveGameData for game ABC789 */ }
        }
        ```

## Bypassing Screens for Testing

You can manipulate `localStorage` via your browser's developer console to quickly navigate to specific screens or test different game states.

**1. Bypass Username Page:**
   Set a username and navigate directly to mode selection.
   ```javascript
   localStorage.setItem('locked-codes-username', JSON.stringify('TestUser'));
   // Then manually navigate to /select-mode in your browser
   ```

**2. Go Directly to "Enter Code" Page (for 'vs Computer' mode):**
   First, set a username as above.
   ```javascript
   localStorage.setItem('locked-codes-active-game', JSON.stringify({
     gameId: null,
     gameMode: 'computer',
     numberOfPlayers: 2,
     multiplayerRole: null,
     players: [], // Will be populated by the enter-code page for the human player
     gameStatus: 'lobby'
   }));
   // Then manually navigate to /enter-code
   ```

**3. Go Directly to Host Lobby Page:**
   First, set a username for the host (e.g., 'HostUser').
   ```javascript
   const hostUsername = 'HostUser';
   localStorage.setItem('locked-codes-username', JSON.stringify(hostUsername));

   const gameId = 'HOSTLOBBY01'; // Choose a unique game ID
   const hostGameData = {
     gameId: gameId,
     gameMode: 'duo', // or 'trio', 'quads'
     numberOfPlayers: 2, // or 3, 4 accordingly
     multiplayerRole: 'host',
     players: [{
       id: hostUsername,
       name: hostUsername,
       secretCode: '', // Host sets this in the lobby
       guesses: [],
       score: 0,
       isHost: true,
       isReady: false
     }],
     gameStatus: 'lobby'
   };
   localStorage.setItem('locked-codes-active-game', JSON.stringify(hostGameData));

   // Simulate creating the game in the "all games" list
   const allGames = JSON.parse(localStorage.getItem('locked-codes-all-games') || '{}');
   allGames[gameId] = hostGameData;
   localStorage.setItem('locked-codes-all-games', JSON.stringify(allGames));

   // Then manually navigate to /host-lobby/HOSTLOBBY01
   ```

**4. Go Directly to Player Lobby Page (as a Joiner):**
   First, ensure a game has been "hosted" (e.g., using the steps above for the host lobby). Let's assume the `gameId` is `HOSTLOBBY01`.
   Set a username for the joiner (e.g., 'JoinerUser').
   ```javascript
   const joinerUsername = 'JoinerUser';
   localStorage.setItem('locked-codes-username', JSON.stringify(joinerUsername));

   const gameIdToJoin = 'HOSTLOBBY01';
   const allGames = JSON.parse(localStorage.getItem('locked-codes-all-games') || '{}');
   const gameToJoin = allGames[gameIdToJoin];

   if (gameToJoin) {
     const playerGameData = {
       ...gameToJoin, // Copy details from the hosted game
       multiplayerRole: 'join',
       // Important: players array will be updated by the join-game/player-lobby logic,
       // but for direct navigation, you might need to ensure the joiner is added to 'allGames'
       // or the player-lobby page can handle adding them if not present.
     };
     localStorage.setItem('locked-codes-active-game', JSON.stringify(playerGameData));

     // To simulate joining, ensure the player is added to the 'allGames' entry
     if (!gameToJoin.players.find(p => p.id === joinerUsername)) {
        gameToJoin.players.push({
            id: joinerUsername, name: joinerUsername, secretCode: '', guesses: [], score: 0, isHost: false, isReady: false
        });
        allGames[gameIdToJoin] = gameToJoin;
        localStorage.setItem('locked-codes-all-games', JSON.stringify(allGames));
     }

     // Then manually navigate to /player-lobby/HOSTLOBBY01
   } else {
     console.error('Game HOSTLOBBY01 not found in localStorage. Host it first.');
   }
   ```

**5. Go Directly to Game Page:**
   This requires a fully configured `locked-codes-active-game` object with `gameStatus: 'playing'` and all players (including their secret codes if multiplayer). This is more complex to set up manually and usually follows the lobby flow.
   Example structure for `locked-codes-active-game` before navigating to `/game`:
   ```json
    {
      "gameId": "GAME123", // or null for 'computer'
      "gameMode": "duo", // or 'computer', 'trio', 'quads'
      "numberOfPlayers": 2,
      "multiplayerRole": "host", // or 'join', or null
      "players": [
        {
          "id": "PlayerOne",
          "name": "PlayerOne",
          "secretCode": "1111", // Must be set
          "guesses": [],
          "score": 0,
          "isHost": true,
          "isReady": true
        },
        {
          "id": "PlayerTwo", // or "computer"
          "name": "PlayerTwo", // or "Computer"
          "secretCode": "2222", // Must be set
          "guesses": [],
          "score": 0,
          "isComputer": false, // true for computer player
          "isReady": true
        }
        // ... more players for trio/quads
      ],
      "gameStatus": "playing"
    }
   ```
   Set your username (`locked-codes-username`) to match one of the players in the list.
   Then navigate to `/game`.

## Project Structure Highlights

-   **`src/app/`**: Next.js App Router pages.
    -   `page.tsx`: Username entry.
    -   `select-mode/page.tsx`: Game mode selection.
    -   `enter-code/page.tsx`: Secret code entry for 'vs Computer' mode.
    -   `host-lobby/[gameId]/page.tsx`: Lobby for game hosts.
    -   `player-lobby/[gameId]/page.tsx`: Lobby for joining players.
    -   `join-game/page.tsx`: Page to enter a game code.
    -   `game/page.tsx`: Main game screen.
-   **`src/components/`**:
    -   `ui/`: ShadCN UI components.
    -   `game-logo.tsx`: The game's logo.
    -   Other game-specific components are co-located with their respective pages (e.g., `src/app/game/components/`).
-   **`src/lib/`**:
    -   `gameLogic.ts`: Core functions for game mechanics (generating codes, feedback, scoring).
    -   `gameTypes.ts`: TypeScript type definitions for game entities.
    -   `utils.ts`: Utility functions (like `cn` for classnames).
-   **`src/hooks/`**: Custom React hooks like `useLocalStorage.ts`.

## Styling

-   **ShadCN UI**: Components are sourced from `shadcn/ui`. Theme and base styles are in `src/app/globals.css`.
-   **Tailwind CSS**: Used for utility-first styling throughout the application. Configuration is in `tailwind.config.ts`.

This guide should help you get started with development and testing!
