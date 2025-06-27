'use client';

import type { User } from '@/lib/types';
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  theme: string;
  isLoading: boolean;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [theme, setTheme] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('cozy-user') as User | null;
      if (storedUser) {
        setUserState(storedUser);
      }

      const storedTheme = localStorage.getItem('cozy-theme');
      if (storedTheme) {
        setTheme(storedTheme);
      } else {
        setTheme('light'); // Default theme
      }
    } catch (e) {
      // localStorage is not available
    }
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('cozy-user', user);
    } else {
      localStorage.removeItem('cozy-user');
    }
  }, [user]);

  useEffect(() => {
    if (theme) {
      localStorage.setItem('cozy-theme', theme);
    }
  }, [user, isLoading]);

  const setUser = (newUser: User | null) => {
    setUserState(newUser);
  };
  
  return (
    <UserContext.Provider value={{ user, setUser, theme, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
