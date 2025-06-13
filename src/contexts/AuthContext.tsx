
"use client";
import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useLocalStorage from '@/hooks/useLocalStorage';

interface AuthContextType {
  username: string | null;
  login: () => void;
  logout: () => void;
  isLoggedIn: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [username, setUsername] = useLocalStorage<string | null>('numberlock-username', null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(!!username);
  const router = useRouter();

  useEffect(() => {
    setIsLoggedIn(!!username);
  }, [username]);

  const login = useCallback(() => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newUsername = `Player_${randomSuffix}`;
    setUsername(newUsername);
    setIsLoggedIn(true);
    // router.push('/setup'); // Navigation handled by component after login
  }, [setUsername, router]);

  const logout = useCallback(() => {
    setUsername(null);
    setIsLoggedIn(false);
    // Clear game related data from localStorage as well upon logout
    if (typeof window !== 'undefined') {
        window.localStorage.removeItem('numberlock-playerSecret');
        window.localStorage.removeItem('numberlock-opponentSecret'); // Example
        window.localStorage.removeItem('numberlock-gameState');
    }
    router.push('/');
  }, [setUsername, router]);

  return (
    <AuthContext.Provider value={{ username, login, logout, isLoggedIn }}>
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
