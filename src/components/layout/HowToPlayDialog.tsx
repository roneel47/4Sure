
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HelpCircle } from "lucide-react";

export default function HowToPlayDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <HelpCircle className="mr-2 h-4 w-4" />
          How to Play?
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl text-primary">How to Play 4Sure</DialogTitle>
          <DialogDescription>
            Your goal is to guess your opponent&apos;s secret 4-digit code before they guess yours!
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-grow pr-6 -mr-2 overflow-y-auto"> {/* Adjusted for better scrollbar visibility */}
          <div className="space-y-4 text-sm text-foreground/90 py-2">
            <h3 className="font-semibold text-lg mt-2 text-accent">Game Overview</h3>
            <p>
              4Sure is a turn-based number guessing game. Each player sets a secret 4-digit code. 
              Players then take turns trying to guess their opponent&apos;s code. The first player to 
              guess all four digits of the opponent&apos;s code in the correct positions wins!
            </p>

            <h3 className="font-semibold text-lg mt-3 text-accent">Core Rules (Apply to All Modes)</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Code Length</strong>: All secret codes and guesses must be 4 digits long.</li>
              <li><strong>Digits</strong>: Use digits from 0 to 9.</li>
              <li>
                <strong>No Triplicates/Quadruplicates</strong>: Codes and guesses <strong>cannot</strong> have 
                three (e.g., "1112") or four (e.g., "0000") identical consecutive digits. 
                However, pairs like "1122" or alternating like "1212" are valid.
              </li>
              <li>
                <strong>Feedback</strong>: After each guess, digits that are correct AND in the correct 
                position will be revealed. Other digits remain hidden in the feedback boxes.
              </li>
            </ul>

            <h3 className="font-semibold text-lg mt-3 text-accent">Single Player Mode (vs. Computer)</h3>
            <ol className="list-decimal pl-5 space-y-1">
              <li><strong>Login</strong>: Choose a username on the main page.</li>
              <li><strong>Mode Select</strong>: After login, pick "Single Player".</li>
              <li>
                <strong>Set Secret Code</strong>: On the setup page, enter your 4-digit secret code 
                following the core rules. Click "Confirm Secret". The computer will also set its secret code.
              </li>
              <li><strong>Gameplay</strong>:
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>The game board shows your panel and the computer&apos;s panel. Your secret code is visible to you.</li>
                  <li>A turn indicator shows whose turn it is.</li>
                  <li>
                    You have <strong>20 seconds</strong> per turn. If the timer runs out, your turn is skipped. 
                    The timer turns red and pulses when 5 seconds or less remain.
                  </li>
                  <li>On your turn, use the input boxes to enter your 4-digit guess for the computer&apos;s code and click "Make Guess".</li>
                  <li>The computer will then take its turn to guess your code.</li>
                </ul>
              </li>
              <li><strong>Winning</strong>: The first to guess all 4 digits of the opponent&apos;s code correctly wins! A dialog will announce the winner.</li>
            </ol>

            <h3 className="font-semibold text-lg mt-3 text-accent">Multiplayer Mode</h3>
            <ol className="list-decimal pl-5 space-y-1">
              <li><strong>Login</strong>: Choose a username on the main page.</li>
              <li><strong>Mode Select</strong>: After login, pick "Multiplayer".</li>
              <li><strong>Setup</strong>:
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>Choose player count (currently Duo - 2 Players).</li>
                  <li>
                    Either "Host New Game" (a Game ID will be generated for you to share with the other player) 
                    or "Join Existing Game" (enter a Game ID shared by a host).
                  </li>
                </ul>
              </li>
              <li><strong>Lobby & Secret Code</strong>:
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>You&apos;ll enter a lobby. Wait for the other player(s) to join.</li>
                  <li>
                    Once all players are in, you&apos;ll be prompted to set your 4-digit secret code (following core rules). 
                    All players must set their code to become "Ready".
                  </li>
                  <li>The host (Player 1) will then be able to start the game.</li>
                </ul>
              </li>
              <li><strong>Gameplay</strong>:
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>The game assigns each player an opponent (in Duo mode, it&apos;s the other player).</li>
                  <li>The game board shows your panel and your opponent&apos;s panel. Your secret code is visible to you.</li>
                  <li>A turn indicator shows whose turn it is.</li>
                  <li>
                    You have <strong>30 seconds</strong> per turn. If the timer runs out, your turn is skipped.
                    The timer display will alert you when time is low.
                  </li>
                  <li>On your turn, enter your 4-digit guess for your opponent&apos;s code and click "Make Guess".</li>
                </ul>
              </li>
              <li><strong>Winning</strong>: The first player to guess their designated opponent&apos;s code correctly wins the game! A dialog will announce the winner.</li>
            </ol>
          </div>
        </ScrollArea>
        
        <DialogFooter className="pt-4">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
