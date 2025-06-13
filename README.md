# 4Sure

4Sure is a two-player (Player vs. Computer) turn-based number guessing game. Each player sets a secret 4-digit code, and then players take turns guessing their opponent's code. The first player to guess the opponent's code wins!

This project is built with Next.js, React, ShadCN UI components, and Tailwind CSS.

## Features

*   **Player vs. Computer Gameplay**: Test your guessing skills against a computer opponent.
*   **Secret Code Setup**: Choose your own secret 4-digit number.
*   **Turn-Based Guessing**: Take turns trying to crack your opponent's code.
*   **Feedback System**: Get hints on which digits are correct and in the right position.
*   **Timed Turns**: Each turn has a 20-second timer to keep the game moving. When the timer is low, it provides a visual alert.
*   **Guessing Rules**: Codes and guesses cannot contain 3 or 4 identical consecutive digits (e.g., "0000" or "1112" are invalid).
*   **Sleek UI**: Modern interface built with ShadCN UI and Tailwind CSS, featuring a dark theme.
*   **Persistent Login**: Your chosen username is remembered for future sessions.

## Getting Started

To get started with the application:

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Run the development server:**
    ```bash
    npm run dev
    ```
    This will start the Next.js development server, typically on `http://localhost:9002`.

3.  **Open the application:**
    Open [http://localhost:9002](http://localhost:9002) in your browser to see the game.

## How to Play

1.  **Login**:
    *   On the main page, enter a username in the input field.
    *   Alternatively, click the refresh icon next to the input to generate a random name.
    *   If you leave the field blank and click "Login to Play", a random name will be assigned.
    *   Click "Login to Play" to proceed.

2.  **Set Your Secret Code**:
    *   On the setup page, you'll see four input boxes. Enter your desired 4-digit secret number, one digit per box.
    *   **Rule**: Your code cannot have three or four identical consecutive digits (e.g., "1111" or "2223" are not allowed).
    *   Click "Confirm Secret".

3.  **Play the Game**:
    *   The game board will display two panels: one for you and one for the Computer.
    *   Your secret code will be visible on your panel. The Computer's code will be hidden.
    *   **Turn Indicator**: Above the panels, an indicator shows whose turn it is.
    *   **Timer**: Below the turn indicator, a 20-second timer counts down. If it reaches 0, the current player's turn is skipped. The timer turns red and pulses when 5 seconds or less remain.
    *   **Making a Guess (Your Turn)**:
        *   Use the four input boxes at the bottom of your panel to enter your guess for the Computer's code.
        *   Click "Make Guess".
        *   **Rule**: Your guess also cannot have three or four identical consecutive digits.
    *   **Feedback**:
        *   Your guess will appear in your panel's guess history.
        *   Digits that are correct and in the correct position will be revealed and highlighted (using the primary color).
        *   Digits that are incorrect or in the wrong position will not be revealed in the feedback boxes.
    *   The Computer will then take its turn to guess your code.
4.  **Winning**:
    *   The first player to correctly guess all four digits of the opponent's code wins!
    *   A dialog will appear announcing the winner. You can choose to "Play Again" or "Exit Game".

## Project Structure

*   `src/app/`: Contains the Next.js pages and layouts.
    *   `src/app/page.tsx`: The login page.
    *   `src/app/(game)/layout.tsx`: Layout for authenticated game routes.
    *   `src/app/(game)/setup/page.tsx`: Page for the player to set their secret code.
    *   `src/app/(game)/play/page.tsx`: The main game board page.
    *   `src/app/globals.css`: Global styles and Tailwind CSS theme configuration.
    *   `src/app/layout.tsx`: Root layout for the entire application.
*   `src/components/`: Contains reusable React components.
    *   `src/components/auth/LoginForm.tsx`: Component for user login.
    *   `src/components/game/`: Game-specific components:
        *   `DigitInput.tsx`: Reusable input for 4-digit codes/guesses.
        *   `GameBoard.tsx`: Main component orchestrating the game play area.
        *   `GuessDisplay.tsx`: Component to show a single guess and its feedback.
        *   `PlayerPanel.tsx`: Component for displaying a player's guesses and input area.
        *   `SecretSetupForm.tsx`: Form for setting the player's secret code.
        *   `TimerDisplay.tsx`: Component to show the turn timer.
        *   `TurnIndicator.tsx`: Component to display whose turn it is.
    *   `src/components/layout/`: Layout components like `Header.tsx` and `Footer.tsx`.
    *   `src/components/ui/`: ShadCN UI components (e.g., Button, Card, Input, Toast).
*   `src/contexts/`: React context providers for managing global state.
    *   `AuthContext.tsx`: Manages user authentication state (username, login status).
    *   `GameContext.tsx`: Manages game state (secrets, guesses, turns, status, timer).
    *   `AppProviders.tsx`: Wraps AuthProvider and GameProvider.
*   `src/hooks/`: Custom React hooks.
    *   `useLocalStorage.ts`: Hook for easily managing state in localStorage.
    *   `useToast.ts`: Hook for displaying toast notifications.
    *   `use-mobile.tsx`: Hook to detect if the client is on a mobile device (used by some ShadCN components).
*   `src/lib/`: Utility functions and core game logic.
    *   `gameLogic.ts`: Contains functions for code generation, feedback calculation, win checking, computer guess generation, and validation of digit sequences.
    *   `utils.ts`: Utility functions like `cn` for merging Tailwind classes.
*   `src/types/`: TypeScript type definitions.
    *   `game.ts`: Defines types like `Guess` and `GameStatus`.
*   `public/`: Static assets, including `logo.svg`.
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

## Contributing

This project was developed primarily as a demonstration. While contributions are not actively sought, feel free to fork the repository, explore the code, and adapt it for your own learning or projects.

## License

This project is for demonstration purposes. Please refer to the license file if one is provided, or assume standard copyright unless otherwise stated.
Built by Roneel V.
