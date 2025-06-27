'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import type { WatchlistItem, User } from '@/lib/types';
import { useUser } from '@/context/UserContext';
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/lib/supabaseClient';

interface WatchlistContextType {
  watchlistItems: WatchlistItem[];
  isLoading: boolean;
  addWatchlistItem: (item: Omit<WatchlistItem, 'id' | 'status' | 'addedBy'>) => void;
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
    async function load() {
      const { data, error } = await supabase.from('watchlist_items').select('*');
      if (error) {
        console.error('Failed to load watchlist', error);
        setWatchlistItems(initialItems);
      } else {
        setWatchlistItems(data as WatchlistItem[]);
      }
      setIsLoading(false);
    }
    load();
  }, []);

  const addWatchlistItem = async (item: Omit<WatchlistItem, 'id' | 'status' | 'addedBy'>) => {
    if (!user) return;
    const newItem: WatchlistItem = {
      ...item,
      id: crypto.randomUUID(),
      status: 'To Watch',
      addedBy: user,
    };
    setWatchlistItems((prev) => [newItem, ...prev]);
    await supabase.from('watchlist_items').insert(newItem);
    toast({
      title: "Added to Watchlist!",
      description: `"${newItem.title}" is ready to be watched.`,
    })
  };

  const markAsWatched = async (itemId: string) => {
    setWatchlistItems((prev) =>
      prev.map((item) =>
        item.id === itemId && item.status === 'To Watch'
          ? { ...item, status: 'Watched' }
          : item
      )
    );
    await supabase
      .from('watchlist_items')
      .update({ status: 'Watched' })
      .eq('id', itemId);
  };

  const deleteWatchlistItem = async (itemId: string) => {
    setWatchlistItems((prev) => prev.filter((item) => item.id !== itemId));
    await supabase.from('watchlist_items').delete().eq('id', itemId);
     toast({
      title: "Item Removed",
      description: "The item has been removed from your watchlist.",
      variant: "destructive"
    })
  };
  
  return (
    <WatchlistContext.Provider value={{ watchlistItems, isLoading, addWatchlistItem, deleteWatchlistItem, markAsWatched }}>
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
