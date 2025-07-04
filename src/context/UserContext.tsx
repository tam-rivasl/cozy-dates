'use client';

import type { UserName as User } from '@/lib/types'; // 'Carlos' | 'Tamara'
import React, { createContext, useState, useContext, ReactNode } from 'react';

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Aplicar tema al cambiar de usuario
  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');

    if (user === 'Carlos') {
      root.classList.add('theme-carlos');
      root.classList.remove('theme-tamara');
    } else if (user === 'Tamara') {
      root.classList.add('theme-tamara');
      root.classList.remove('theme-carlos');
    } else {
      root.classList.remove('theme-carlos', 'theme-tamara');
    }

    console.log(`User: ${user}, Theme applied.`);
  }, [user]);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within a UserProvider');
  return context;
}
