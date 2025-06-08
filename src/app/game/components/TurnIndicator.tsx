"use client";

interface TurnIndicatorProps {
  currentPlayerName: string;
  isPlayerTurn: boolean;
}

export default function TurnIndicator({ currentPlayerName, isPlayerTurn }: TurnIndicatorProps) {
  return (
    <div className="my-4 sm:my-6 p-3 rounded-md bg-card border border-border shadow-md w-full max-w-md text-center">
      <p className={`text-lg sm:text-xl font-semibold ${isPlayerTurn ? 'text-primary' : 'text-muted-foreground'}`}>
        {isPlayerTurn ? `Your Turn, ${currentPlayerName}!` : `Waiting for ${currentPlayerName}...`}
      </p>
    </div>
  );
}
