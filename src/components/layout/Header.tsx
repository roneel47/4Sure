
"use client";
import { Button } from "@/components/ui/button";
import { useGame } from "@/contexts/GameContext";
import { LogOut } from "lucide-react";
import Link from "next/link";

export default function Header() {
  const { exitGame, gameStatus } = useGame();

  return (
    <header className="py-4 px-4 sm:px-6 md:px-8 border-b border-border/50">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-2xl font-headline text-primary hover:opacity-80 transition-opacity">
          4Sure
        </Link>
        {(gameStatus !== "SETUP_PLAYER" && gameStatus !== "WAITING_OPPONENT_SECRET") && (
          <Button variant="destructive" onClick={exitGame} size="sm">
            <LogOut className="mr-2 h-4 w-4" /> Exit Game
          </Button>
        )}
      </div>
    </header>
  );
}
