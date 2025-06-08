"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import GameLogo from '@/components/game-logo';
import useLocalStorage from '@/hooks/use-local-storage';
import { RefreshCw } from 'lucide-react';

export default function UsernamePage() {
  const [username, setUsername] = useLocalStorage<string>('locked-codes-username', '');
  const [inputValue, setInputValue] = useState('');
  const router = useRouter();

  const generateRandomUsername = () => {
    const randomName = "Player" + Math.floor(Math.random() * 9000 + 1000);
    setInputValue(randomName);
  };
  
  useEffect(() => {
    // Pre-fill input if username already exists in localStorage
    if (username) {
      setInputValue(username);
    } else {
      generateRandomUsername();
    }
  }, [username]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setUsername(inputValue.trim());
      router.push('/enter-code');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <GameLogo />
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center text-primary">Welcome!</CardTitle>
          <CardDescription className="text-center">
            Enter your name or generate a random one to start.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                Username
              </label>
              <div className="flex space-x-2">
                <Input
                  id="username"
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="E.g., CodeCracker2000"
                  required
                  className="text-lg"
                />
                <Button type="button" variant="outline" onClick={generateRandomUsername} aria-label="Generate random username">
                  <RefreshCw className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full text-lg py-3 bg-primary hover:bg-primary/90 text-primary-foreground">
              Next: Set Secret Code
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
