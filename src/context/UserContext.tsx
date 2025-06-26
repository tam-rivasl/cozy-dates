'use client';

import type { User } from '@/lib/types';
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  theme: string;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [theme, setTheme] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('cozy-user') as User | null;
      if (storedUser) {
        setUserState(storedUser);
      }
    } catch (e) {
      // localStorage is not available
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (user) {
      localStorage.setItem('cozy-user', user);
      const newTheme = `theme-${user.toLowerCase()}`;
      setTheme(newTheme);
      document.documentElement.className = '';
      
      const storedThemeMode = localStorage.getItem('theme');
      if (storedThemeMode === 'dark') {
          document.documentElement.classList.add('dark');
      }

      document.documentElement.classList.add(newTheme);
    } else {
      localStorage.removeItem('cozy-user');
      setTheme('');
      document.documentElement.className = '';

      const storedThemeMode = localStorage.getItem('theme');
      if (storedThemeMode === 'dark') {
          document.documentElement.classList.add('dark');
      }
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
