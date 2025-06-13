
"use client";
import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useLocalStorage from '@/hooks/useLocalStorage';

interface AuthContextType {
  username: string | null;
  login: (customUsername?: string) => void;
  logout: () => void;
  isLoggedIn: boolean;
  isAuthLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [username, setUsername] = useLocalStorage<string | null>('numberlock-username', null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false); // Start false for SSR/initial client match
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true); // Start true
  const router = useRouter();

  useEffect(() => {
    // This effect runs on the client after hydration.
    // `username` from useLocalStorage is now reflecting the client's localStorage.
    setIsLoggedIn(!!username);
    setIsAuthLoading(false);
  }, [username]); // Re-evaluate if `username` (from localStorage or login/logout) changes.

  const login = useCallback((customUsername?: string) => {
    let finalUsername = customUsername?.trim();
    if (!finalUsername) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      finalUsername = `Player_${randomSuffix}`;
    }
    setUsername(finalUsername); // This will trigger the useEffect above to update isLoggedIn
    // Navigation will be handled by the page component based on isLoggedIn state
  }, [setUsername]);

  const logout = useCallback(() => {
    setUsername(null); // This will trigger the useEffect above to update isLoggedIn
    // Clear game related data from localStorage as well upon logout
    if (typeof window !== 'undefined') {
        window.localStorage.removeItem('numberlock-playerSecret');
        window.localStorage.removeItem('numberlock-opponentSecret');
        window.localStorage.removeItem('numberlock-gameState');
    }
    router.push('/');
  }, [setUsername, router]);

  return (
    <AuthContext.Provider value={{ username, login, logout, isLoggedIn, isAuthLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
