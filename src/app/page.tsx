
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import GameLogo from '@/components/game-logo';
import useLocalStorage from '@/hooks/use-local-storage';
import { RefreshCw, Lock, Unlock } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function UsernamePage() {
  const [username, setUsername] = useLocalStorage<string>('locked-codes-username', '');
  const [inputValue, setInputValue] = useState('');
  const [sliderValue, setSliderValue] = useState([0]);
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

  const handleSliderChange = (value: number[]) => {
    setSliderValue(value);
  };

  const handleSliderCommit = (value: number[]) => {
    if (value[0] === 100 && inputValue.trim()) {
      handleProceed();
    } else if (inputValue.trim()) {
      // Snap back if not fully slid or no username
      setSliderValue([0]);
    }
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
            <div className="space-y-3">
              <Skeleton className="h-4 w-1/3 mx-auto" /> {/* Slider label placeholder */}
              <div className="flex items-center space-x-3">
                <Skeleton className="h-6 w-6 rounded-full" /> {/* Lock icon placeholder */}
                <Skeleton className="h-6 flex-grow" /> {/* Slider placeholder */}
                <Skeleton className="h-6 w-6 rounded-full" /> {/* Unlock icon placeholder */}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isInputEmpty = inputValue.trim() === '';
  const sliderThumbColor = isInputEmpty ? 'bg-muted-foreground' : sliderValue[0] === 100 ? 'bg-green-500' : 'bg-primary';
  const unlockIconColor = isInputEmpty ? 'text-muted-foreground' : sliderValue[0] === 100 ? 'text-green-500' : 'text-primary';


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
          <form onSubmit={(e) => { e.preventDefault(); if (!isInputEmpty) handleProceed(); }} className="space-y-6">
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

            <div className="space-y-3">
              <label htmlFor="unlock-slider" className="text-sm font-medium text-center block">
                Next: Select Mode
              </label>
              <div className="flex items-center space-x-3">
                <Lock className={`w-6 h-6 ${isInputEmpty ? 'text-muted-foreground' : 'text-primary'}`} />
                <Slider
                  id="unlock-slider"
                  value={sliderValue}
                  onValueChange={handleSliderChange}
                  onValueCommit={handleSliderCommit}
                  max={100}
                  step={1}
                  disabled={isInputEmpty}
                  className={cn(isInputEmpty ? 'opacity-50 cursor-not-allowed' : '')}
                  aria-labelledby="unlock-slider-label"
                />
                <Unlock className={`w-6 h-6 ${unlockIconColor}`} />
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

