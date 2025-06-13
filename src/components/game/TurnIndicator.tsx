
"use client";

interface TurnIndicatorProps {
  currentPlayerName: string;
  isPlayerTurn: boolean;
}

export default function TurnIndicator({ currentPlayerName, isPlayerTurn }: TurnIndicatorProps) {
  return (
    <div className="text-center py-4 mb-4 rounded-lg bg-card shadow-md">
      <p className="text-lg font-semibold">
        {isPlayerTurn ? "Your Turn" : `${currentPlayerName}'s Turn`}
      </p>
      <p className="text-sm text-muted-foreground">
        {isPlayerTurn ? "Make your guess!" : "Waiting for opponent..."}
      </p>
    </div>
  );
}
