'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import type { WatchlistItem, User } from '@/lib/types';
import { useUser } from '@/context/UserContext';
import { useToast } from "@/hooks/use-toast";

interface WatchlistContextType {
  watchlistItems: WatchlistItem[];
  isLoading: boolean;
  addWatchlistItem: (item: Omit<WatchlistItem, 'id' | 'status' | 'addedBy'>) => void;
  toggleStatus: (itemId: string) => void;
  deleteWatchlistItem: (itemId: string) => void;
  markAsWatched: (itemId: string) => void;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

const initialItems: WatchlistItem[] = [
    { id: 'w1', title: 'Dune: Part Two', type: 'Movie', status: 'To Watch', addedBy: 'Carlos', notes: 'Heard the visuals are amazing.'},
    { id: 'w2', title: 'Shōgun', type: 'Series', status: 'To Watch', addedBy: 'Tamara' },
    { id: 'w3', title: 'Past Lives', type: 'Movie', status: 'Watched', addedBy: 'Tamara', notes: 'So beautiful and sad!' },
];

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    try {
      const storedItems = localStorage.getItem('cozy-watchlist');
      if (storedItems) {
        setWatchlistItems(JSON.parse(storedItems));
      } else {
        setWatchlistItems(initialItems);
      }
    } catch (e) {
      setWatchlistItems(initialItems);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem('cozy-watchlist', JSON.stringify(watchlistItems));
      } catch (e) {
        // LocalStorage not available
      }
    }
  }, [watchlistItems, isLoading]);

  const addWatchlistItem = (item: Omit<WatchlistItem, 'id' | 'status' | 'addedBy'>) => {
    if (!user) return;
    const newItem: WatchlistItem = {
      ...item,
      id: crypto.randomUUID(),
      status: 'To Watch',
      addedBy: user,
    };
    setWatchlistItems((prev) => [newItem, ...prev]);
    toast({
      title: "Added to Watchlist!",
      description: `"${newItem.title}" is ready to be watched.`,
    })
  };

  const toggleStatus = (itemId: string) => {
    setWatchlistItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, status: item.status === 'To Watch' ? 'Watched' : 'To Watch' } : item
      )
    );
  };

  const markAsWatched = (itemId: string) => {
    setWatchlistItems((prev) =>
      prev.map((item) =>
        item.id === itemId && item.status === 'To Watch'
          ? { ...item, status: 'Watched' }
          : item
      )
    );
  };

  const deleteWatchlistItem = (itemId: string) => {
    setWatchlistItems((prev) => prev.filter((item) => item.id !== itemId));
     toast({
      title: "Item Removed",
      description: "The item has been removed from your watchlist.",
      variant: "destructive"
    })
  };
  
  return (
    <WatchlistContext.Provider value={{ watchlistItems, isLoading, addWatchlistItem, toggleStatus, deleteWatchlistItem, markAsWatched }}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const context = useContext(WatchlistContext);
  if (context === undefined) {
    throw new Error('useWatchlist must be used within a WatchlistProvider');
  }
  return context;
}
