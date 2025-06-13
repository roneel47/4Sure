
"use client";

interface TurnIndicatorProps {
  currentPlayerName: string;
  isPlayerTurn: boolean;
}

export default function TurnIndicator({ currentPlayerName, isPlayerTurn }: TurnIndicatorProps) {
  return (
    <>
      <p className="text-lg font-semibold">
        {isPlayerTurn ? "Your Turn" : `${currentPlayerName}'s Turn`}
      </p>
      <p className="text-sm text-muted-foreground">
        {isPlayerTurn ? "Make your guess!" : "Waiting for opponent..."}
      </p>
    </>
  );
}
