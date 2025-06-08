"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import GameLogo from '@/components/game-logo';
import useLocalStorage from '@/hooks/use-local-storage';
import { useToast } from "@/hooks/use-toast";

const CODE_LENGTH = 4;

export default function EnterCodePage() {
  const [secretCode, setSecretCode] = useLocalStorage<string>('locked-codes-secret-code', '');
  const [inputValue, setInputValue] = useState('');
  const [username] = useLocalStorage<string>('locked-codes-username', '');
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!username) {
      // Redirect to username page if not set
      router.push('/');
    }
    if (secretCode) {
        setInputValue(secretCode);
    }
  }, [username, secretCode, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow only digits and limit length
    if (/^\d*$/.test(val) && val.length <= CODE_LENGTH) {
      setInputValue(val);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.length === CODE_LENGTH && /^\d{4}$/.test(inputValue)) {
      setSecretCode(inputValue);
      router.push('/game');
    } else {
      toast({
        title: "Invalid Code",
        description: `Please enter exactly ${CODE_LENGTH} digits.`,
        variant: "destructive",
      });
    }
  };

  if (!username) {
    return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>; // Or a loading spinner
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <GameLogo />
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center text-primary">Set Your Secret Code</CardTitle>
          <CardDescription className="text-center">
            Hi {username}! Enter a {CODE_LENGTH}-digit secret code. The computer will try to guess it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="secretCode" className="text-sm font-medium">
                Your {CODE_LENGTH}-Digit Code
              </label>
              <Input
                id="secretCode"
                type="text" // Use text to easily manage input and show digits, use password for hiding if needed
                value={inputValue}
                onChange={handleInputChange}
                placeholder="E.g., 1234"
                maxLength={CODE_LENGTH}
                required
                className="text-center text-3xl tracking-[0.5em] font-mono"
                pattern="\d{4}"
                inputMode="numeric"
              />
            </div>
            <Button type="submit" className="w-full text-lg py-3 bg-primary hover:bg-primary/90 text-primary-foreground">
              Start Game
            </Button>
          </form>
        </CardContent>
      </Card>
       <Button variant="link" onClick={() => router.push('/')} className="mt-4 text-sm text-muted-foreground">
        Change Username
      </Button>
    </div>
  );
}
