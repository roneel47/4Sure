"use client";

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { CODE_LENGTH } from '@/lib/gameLogic';

interface GuessInputProps {
  onSubmitGuess: (guess: string) => void;
  disabled: boolean;
}

export default function GuessInput({ onSubmitGuess, disabled }: GuessInputProps) {
  const [currentGuess, setCurrentGuess] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^\d*$/.test(val) && val.length <= CODE_LENGTH) {
      setCurrentGuess(val);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentGuess.length === CODE_LENGTH) {
      onSubmitGuess(currentGuess);
      setCurrentGuess('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xs sm:max-w-sm space-x-2 mt-4">
      <Input
        type="text"
        value={currentGuess}
        onChange={handleInputChange}
        placeholder={`Enter ${CODE_LENGTH}-digit guess`}
        maxLength={CODE_LENGTH}
        pattern={`\\d{${CODE_LENGTH}}`}
        inputMode="numeric"
        disabled={disabled}
        aria-label="Enter your guess"
        className="text-center text-xl sm:text-2xl tracking-[0.2em] font-mono flex-grow"
      />
      <Button type="submit" disabled={disabled || currentGuess.length !== CODE_LENGTH} className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 sm:px-4">
        <Send className="w-5 h-5 sm:mr-2" />
        <span className="hidden sm:inline">Guess</span>
      </Button>
    </form>
  );
}
