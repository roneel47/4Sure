
"use client";
import type React from 'react';

interface TimerDisplayProps {
  timeLeft: number;
  isTimerActive: boolean; 
}

export default function TimerDisplay({ timeLeft, isTimerActive }: TimerDisplayProps) {
  const isAlertTime = isTimerActive && timeLeft <= 5 && timeLeft > 0;
  
  let textColor = "text-foreground";
  let textSize = "text-xl sm:text-2xl";
  let animationClass = "";

  if (isAlertTime) {
    textColor = "text-destructive";
    textSize = "text-2xl sm:text-3xl";
    animationClass = "animate-pulse";
  } else if (!isTimerActive && timeLeft > 0) { 
    textColor = "text-muted-foreground";
  } else if (timeLeft === 0) { 
    textColor = "text-destructive font-bold";
    textSize = "text-2xl sm:text-3xl";
  }

  return (
    <div className={`transition-all duration-300 ease-in-out p-1 mt-1 rounded-md ${animationClass}`}>
      <span className={`${textSize} ${textColor} font-mono font-semibold`}>
        {timeLeft}s
      </span>
    </div>
  );
}

    