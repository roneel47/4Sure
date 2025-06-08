
"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


interface LeaderboardEntry {
  name: string;
  score: number;
}

interface GameEndDialogProps {
  isOpen: boolean;
  onClose: () => void; 
  winnerName: string | null; 
  leaderboardData: LeaderboardEntry[];
  onPlayAgain: () => void;
  onExitGame: () => void;
}

export default function GameEndDialog({ isOpen, winnerName, leaderboardData, onPlayAgain, onExitGame, onClose }: GameEndDialogProps) {
  if (!isOpen) return null;

  let titleText = "Game Over!";
  let descriptionText = winnerName ? `Congratulations to ${winnerName} for cracking the code!` : "The game has ended.";

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-card">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-primary text-2xl">{titleText}</AlertDialogTitle>
          <AlertDialogDescription>
            {descriptionText}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="my-4">
          <h3 className="text-lg font-semibold mb-2 text-center">Leaderboard</h3>
          <ScrollArea className="h-[150px] rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Rank</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-right">Correct Digits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboardData && leaderboardData.length > 0 ? (
                  leaderboardData.map((player, index) => (
                    <TableRow key={player.name}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{player.name}</TableCell>
                      <TableCell className="text-right">{player.score}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">No scores yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        <AlertDialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
          <Button onClick={onExitGame} variant="outline" className="w-full sm:w-auto">Exit to Main Menu</Button>
          <Button onClick={onPlayAgain} className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">Play Again</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
