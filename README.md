# 4Sure - Code Breaking Game

4Sure is a fun, multiplayer code-breaking game built with Next.js, React, ShadCN UI, and Tailwind CSS. Players try to guess each other's secret 4-digit codes.

## Features

- **Multiple Game Modes**:
  - Versus Computer: Test your skills against an AI.
  - Duo (2 Players): Go head-to-head with a friend.
  - Trio (3 Players): A three-way code-breaking challenge.
  - Quads (4 Players): Four players battle it out.
- **Multiplayer Lobbies**: Host or join game sessions with friends using a game code.
- **Secret Code Mechanics**: Each player sets a secret 4-digit code.
- **Guessing & Feedback**: Players take turns guessing codes, receiving feedback on correctly placed digits.
- **Leaderboard**: See who performed best at the end of each game.

## Getting Started

### Prerequisites

- Node.js (version 18.x or later recommended)
- npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone <your-repository-url>
    cd 4sure
    ```
2.  Install dependencies:
    ```bash
    npm install
    # or
    # yarn install
    ```

### Running the Development Server

To start the development server:

```bash
npm run dev
# or
# yarn dev
```

Open [http://localhost:9002](http://localhost:9002) (or the port specified in your `package.json` if different) with your browser to see the result.

## Project Structure

- `src/app/`: Contains the Next.js pages and layouts (App Router).
- `src/components/`: Shared React components, including UI elements from ShadCN.
- `src/lib/`: Core game logic (`gameLogic.ts`) and type definitions (`gameTypes.ts`).
- `src/hooks/`: Custom React hooks.
- `public/`: Static assets like images and favicons.

## Tech Stack

- Next.js (React Framework)
- TypeScript
- ShadCN UI (Component Library)
- Tailwind CSS (Styling)
- Lucide React (Icons)
- LocalStorage (for game state management in the current version)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is currently unlicensed.
