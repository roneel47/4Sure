
"use client";

import type { Guess } from '@/lib/gameTypes';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import GuessDisplay from './GuessDisplay';
import React, { useEffect, useRef } from 'react';

interface PlayerPanelProps {
  playerName: string;
  guesses: Guess[];
  isCurrentTurn: boolean;
  secretCodeToDisplay?: string; // e.g. "****" or actual code if revealed
}

export default function PlayerPanel({ playerName, guesses, isCurrentTurn, secretCodeToDisplay }: PlayerPanelProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      // Access the viewport div within ScrollArea
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [guesses]);

  return (
    <Card className={`w-full ${isCurrentTurn ? 'border-primary shadow-primary/30 shadow-lg' : 'border-border'}`}>
      <CardHeader>
        <CardTitle className={`text-xl sm:text-2xl ${isCurrentTurn ? 'text-primary' : ''}`}>{playerName}</CardTitle>
        {secretCodeToDisplay && (
          <CardDescription>Secret Code: <span className="font-mono tracking-widest">{secretCodeToDisplay}</span></CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <h3 className="text-sm font-medium mb-2 text-muted-foreground">Guess History ({guesses.length}):</h3>
        {guesses.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No guesses yet.</p>
        ) : (
          <ScrollArea className="h-48 sm:h-64 pr-3" ref={scrollAreaRef}> {/* Adjust height as needed */}
            <div className="space-y-3">
              {guesses.map((guess) => (
                <GuessDisplay key={guess.id} guessValue={guess.value} feedback={guess.feedback} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
