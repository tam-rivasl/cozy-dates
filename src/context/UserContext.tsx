'use client';

import type { User } from '@/lib/types';
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('cozy-user') as User | null;
      if (storedUser) {
        setUserState(storedUser);
      }
    } catch (e) {
      // localStorage is not available
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if(!isLoading) {
      try {
        if (user) {
          localStorage.setItem('cozy-user', user);
        } else {
          localStorage.removeItem('cozy-user');
        }
      } catch (e) {
        // LocalStorage not available
      }
    }
  }, [user, isLoading]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark'); // Remove dark theme as user themes take precedence

    let themeClass = '';
    if (user === 'Carlos') {
      themeClass = 'theme-carlos';
      root.classList.add('theme-carlos');
      root.classList.remove('theme-tamara');
    } else if (user === 'Tamara') {
      themeClass = 'theme-tamara';
      root.classList.add('theme-tamara');
      root.classList.remove('theme-carlos');
    } else {
      // Fallback to default when no user is selected
      root.classList.remove('theme-carlos');
      root.classList.remove('theme-tamara');
    }
    console.log(`User: ${user}, Theme applied: ${themeClass || 'default'}`);
  }, [user]);

  const setUser = (newUser: User | null) => {
    setUserState(newUser);
  };
  
  return (
    <UserContext.Provider value={{ user, setUser, isLoading }}>
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
