
"use client";
import { Button } from "@/components/ui/button";
import { useGame } from "@/contexts/GameContext";
import { LogOut, HelpCircle } from "lucide-react"; // Added HelpCircle
import Link from "next/link";
import Image from "next/image";
import HowToPlayDialog from "./HowToPlayDialog"; // Import the new dialog

export default function Header() {
  const { exitGame, gameStatus } = useGame();

  return (
    <header className="py-4 px-4 sm:px-6 md:px-8 border-b border-border/50">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <Image src="/logo.svg" alt="4Sure Logo" width={100} height={30} priority />
        </Link>
        <div className="flex items-center gap-2">
          <HowToPlayDialog /> 
          {(gameStatus !== "SETUP_PLAYER" && gameStatus !== "WAITING_OPPONENT_SECRET") && (
            <Button variant="destructive" onClick={exitGame} size="sm">
              <LogOut className="mr-2 h-4 w-4" /> Exit Game
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
