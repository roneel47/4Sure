# 4Sure - NumberLock Duel

**Repository**: [https://github.com/roneel47/4Sure_Publish](https://github.com/roneel47/4Sure_Publish)

4Sure is a turn-based number guessing game. It supports both Player vs. Computer (single player) and Player vs. Player (multiplayer) modes. Each player sets a secret 4-digit code, and then players take turns guessing their opponent's code. The first player to guess the opponent's code wins!

This project is built with Next.js, React, ShadCN UI components, Tailwind CSS, and Socket.IO for real-time multiplayer communication, with MongoDB for storing multiplayer game room states.

## Features

*   **Single Player Mode**: Test your guessing skills against a computer opponent.
*   **Multiplayer Mode**: Play against another human player in real-time.
    *   Supports Duo (2 players). Trio & Quads planned.
    *   Host or join game rooms with unique Game IDs.
    *   Real-time updates on player joins, secret submissions, guesses, and game status.
*   **Secret Code Setup**: Choose your own secret 4-digit number.
*   **Turn-Based Guessing**: Take turns trying to crack your opponent's code.
*   **Feedback System**: Get hints on which digits are correct *and* in the right position. No hints for correct digits in wrong positions.
*   **Timed Turns**:
    *   Single Player: 20-second timer per turn.
    *   Multiplayer: 30-second timer per turn.
    *   Visual alerts when timer is low. Turn skipped if timer reaches 0.
*   **Guessing Rules**: Codes and guesses cannot contain 3 or 4 identical consecutive digits (e.g., "0000" or "1112" are invalid).
*   **Sleek UI**: Modern interface built with ShadCN UI and Tailwind CSS, featuring a dark theme with a bright yellow primary color.
*   **Persistent Login**: Your chosen username is remembered for future sessions.
*   **How to Play Dialog**: In-app guide for rules and gameplay.

## Getting Started

To get started with the application:

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/roneel47/4Sure_Publish.git
    cd 4Sure_Publish
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Set up Environment Variables (Required for Multiplayer)**:
    *   Create a file named `.env.local` in the root of your project.
    *   Add your MongoDB connection string to this file:
        ```env
        MONGODB_URI="your_mongodb_connection_string_here"
        ```
    *   Replace `"your_mongodb_connection_string_here"` with your actual MongoDB URI.
    *   **Note**: Multiplayer functionality relies on MongoDB to store game room states. Single player mode will work without this, but you might see console warnings about the missing URI if you navigate to multiplayer setup pages.
    *   Ensure your MongoDB instance has a database named `4SureDB` (or modify `src/pages/api/socketio.ts` for a different name) and a collection named `gameRooms`. It's recommended to set up a TTL (Time-To-Live) index on the `createdAt` field in the `gameRooms` collection for automatic cleanup of old game rooms, and a unique index on `gameId`.

4.  **Run the development server**:
    ```bash
    npm run dev
    ```
    This will start the Next.js development server, typically on `http://localhost:9002`.

5.  **Open the application**:
    Open [http://localhost:9002](http://localhost:9002) in your browser to see the game.

## How to Play

Detailed "How to Play" instructions for both Single Player and Multiplayer modes are available via the **"How to Play?"** button in the game's header. Here's a summary:

1.  **Login**:
    *   On the main page (`/`), enter a username or use the refresh icon for a random one.
    *   Click "Login to Play".

2.  **Mode Select**:
    *   Choose "Single Player" or "Multiplayer".

### Single Player Mode (vs. Computer)
1.  **Set Secret Code**: Enter your 4-digit secret code (no 3 or 4 identical consecutive digits).
2.  **Gameplay**:
    *   The game board shows your panel and the computer's panel.
    *   Guess the computer's code on your turn (20-second timer).
    *   Feedback shows correct digits in the correct position.
3.  **Winning**: First to guess the opponent's code wins.

### Multiplayer Mode
1.  **Setup**:
    *   Choose player count (currently Duo - 2 players).
    *   "Host New Game" (a Game ID is generated to share) or "Join Existing Game" (enter a Game ID).
2.  **Lobby & Secret Code**:
    *   Wait for other player(s).
    *   All players set their 4-digit secret codes.
    *   The host (Player 1) starts the game.
3.  **Gameplay**:
    *   Guess your opponent's code on your turn (30-second timer).
    *   Feedback is provided.
4.  **Winning**: First to guess the designated opponent's code wins.

## Core Rules (Apply to All Modes)

*   **Code Length**: All secret codes and guesses must be 4 digits long.
*   **Digits**: Use digits from 0 to 9.
*   **No Triplicates/Quadruplicates**: Codes and guesses **cannot** have three (e.g., "1112") or four (e.g., "0000") identical consecutive digits. Pairs like "1122" or alternating like "1212" are valid.
*   **Feedback**: After each guess, digits that are correct AND in the correct position will be revealed. Other digits remain hidden in the feedback boxes.

## Project Structure

*   `src/app/`: Contains the Next.js pages and layouts.
    *   `src/app/page.tsx`: The login page.
    *   `src/app/mode-select/page.tsx`: Page for selecting game mode.
    *   `src/app/(game)/layout.tsx`: Layout for authenticated game routes.
    *   `src/app/(game)/setup/page.tsx`: Page for the player to set their secret code (single player).
    *   `src/app/(game)/play/page.tsx`: The main game board page (single player).
    *   `src/app/(game)/multiplayer-setup/page.tsx`: Page for setting up multiplayer game options (host/join, player count).
    *   `src/app/(game)/multiplayer-secret-setup/page.tsx`: Lobby and secret code setup for multiplayer.
    *   `src/app/(game)/multiplayer-play/page.tsx`: Main game board for multiplayer.
    *   `src/app/globals.css`: Global styles and Tailwind CSS theme configuration.
    *   `src/app/layout.tsx`: Root layout for the entire application.
*   `src/components/`: Contains reusable React components.
    *   `src/components/auth/LoginForm.tsx`: Component for user login.
    *   `src/components/game/`: Game-specific components (DigitInput, GameBoard, PlayerPanel, etc.).
    *   `src/components/layout/`: Layout components (Header, Footer, HowToPlayDialog).
    *   `src/components/ui/`: ShadCN UI components.
*   `src/contexts/`: React context providers for managing global state (AuthContext, GameContext).
*   `src/hooks/`: Custom React hooks (useLocalStorage, useToast, use-mobile).
*   `src/lib/`: Utility functions and core game logic (`gameLogic.ts`, `utils.ts`).
*   `src/pages/api/socketio.ts`: Next.js API route for Socket.IO server-side logic and MongoDB interaction.
*   `src/types/`: TypeScript type definitions (`game.ts`).
*   `public/`: Static assets, including `logo.svg`.
*   `.env.local.example`: Example environment file (remember to create your own `.env.local`).
*   `package.json`: Lists project dependencies and scripts.
*   `tailwind.config.ts`: Configuration for Tailwind CSS.
*   `next.config.ts`: Configuration for Next.js.
*   `README.md`: This file.

## Tech Stack

*   **Framework**: Next.js 15 (App Router)
*   **UI Library**: React 18
*   **Component Library**: ShadCN UI
*   **Styling**: Tailwind CSS
*   **Language**: TypeScript
*   **State Management**: React Context API with `useLocalStorage` hook.
*   **Real-time Communication**: Socket.IO
*   **Database (for Multiplayer)**: MongoDB (via MongoDB Node.js Driver)

## Contributing

This project was developed primarily as a demonstration and learning exercise. While contributions are not actively sought, feel free to fork the repository, explore the code, and adapt it for your own learning or projects.

If you find issues or have suggestions, you can open an issue on the [GitHub repository](https://github.com/roneel47/4Sure_Publish/issues).

## License

This project is for demonstration purposes. Please refer to the license file if one is provided, or assume standard copyright unless otherwise stated.

---
Built with 💛 by [Roneel V](https://github.com/roneelv) · Project **4Sure** · ©2025
```