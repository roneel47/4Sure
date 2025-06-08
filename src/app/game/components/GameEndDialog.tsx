"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface GameEndDialogProps {
  isOpen: boolean;
  onClose: () => void; // Typically to set isOpen to false, might not be needed if only controlled by winner state
  winnerName: string | null; // null if draw or game exited early (not implemented)
  onPlayAgain: () => void;
  onExitGame: () => void;
}

export default function GameEndDialog({ isOpen, winnerName, onPlayAgain, onExitGame }: GameEndDialogProps) {
  if (!isOpen) return null;

  let titleText = "Game Over!";
  let descriptionText = "";

  if (winnerName) {
    titleText = `${winnerName} Wins!`;
    descriptionText = `Congratulations to ${winnerName} for cracking the code!`;
  } else {
    descriptionText = "The game has ended."; // Fallback or for future draw scenarios
  }


  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-card">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-primary text-2xl">{titleText}</AlertDialogTitle>
          <AlertDialogDescription>
            {descriptionText}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <Button onClick={onExitGame} variant="outline">Exit to Main Menu</Button>
          <Button onClick={onPlayAgain} className="bg-primary hover:bg-primary/90 text-primary-foreground">Play Again</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
