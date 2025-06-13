
"use client";
import type React from 'react';
import { AuthProvider } from './AuthContext';
import { GameProvider } from './GameContext';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <GameProvider>
        {children}
      </GameProvider>
    </AuthProvider>
  );
};
