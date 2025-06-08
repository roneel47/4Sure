
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import GameLogo from '@/components/game-logo';
import useLocalStorage from '@/hooks/use-local-storage';
import { RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function UsernamePage() {
  const [username, setUsername] = useLocalStorage<string>('locked-codes-username', '');
  const [inputValue, setInputValue] = useState('');
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  const generateRandomUsername = useCallback(() => {
    const randomName = "Player" + Math.floor(Math.random() * 9000 + 1000);
    setInputValue(randomName);
  }, []);
  
  useEffect(() => {
    if (username) {
      setInputValue(username);
    } else {
      generateRandomUsername();
    }
    setIsLoading(false);
  }, [username, generateRandomUsername]);

  const handleProceed = useCallback(() => {
    if (inputValue.trim()) {
      setUsername(inputValue.trim());
      router.push('/select-mode');
    }
  }, [inputValue, setUsername, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleProceed();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <Skeleton className="h-[100px] w-[180px] mb-8 sm:mb-12" /> {/* GameLogo placeholder */}
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mx-auto mb-2" /> {/* CardTitle placeholder */}
            <Skeleton className="h-4 w-full mx-auto" /> {/* CardDescription placeholder */}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/4 mb-1" /> {/* Label placeholder */}
              <div className="flex space-x-2">
                <Skeleton className="h-10 flex-grow" /> {/* Input placeholder */}
                <Skeleton className="h-10 w-10" /> {/* Button placeholder */}
              </div>
            </div>
            <Skeleton className="h-10 w-full" /> {/* Button placeholder */}
          </CardContent>
        </Card>
      </div>
    );
  }

  const isInputEmpty = inputValue.trim() === '';

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
                <button
                  type="button"
                  onClick={generateRandomUsername}
                  aria-label="Generate random username"
                  className="p-2 border border-input rounded-md hover:bg-accent"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full text-lg py-3 bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={isInputEmpty}
            >
              Next: Select Mode
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
