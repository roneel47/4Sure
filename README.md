# 4Sure

4Sure is a two-player (Player vs. Computer) turn-based number guessing game. Each player sets a secret 4-digit code, and then players take turns guessing their opponent's code. The first player to guess the opponent's code wins!

This project is built with Next.js, React, ShadCN UI components, and Tailwind CSS.

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

## Project Structure

-   `src/app/`: Contains the Next.js pages and layouts.
    -   `src/app/page.tsx`: The login page.
    -   `src/app/(game)/setup/page.tsx`: Page for the player to set their secret code.
    -   `src/app/(game)/play/page.tsx`: The main game board page.
-   `src/components/`: Contains reusable React components.
    -   `src/components/auth/`: Authentication related components.
    -   `src/components/game/`: Game-specific components.
    -   `src/components/layout/`: Layout components like the header.
    -   `src/components/ui/`: ShadCN UI components.
-   `src/contexts/`: React context providers for managing global state (AuthContext, GameContext).
-   `src/hooks/`: Custom React hooks.
-   `src/lib/`: Utility functions and game logic.
    -   `src/lib/gameLogic.ts`: Core game mechanics (code generation, feedback calculation, etc.).
-   `public/`: Static assets, like `logo.svg`.
