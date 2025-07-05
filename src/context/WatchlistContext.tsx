
'use client';
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import type { WatchlistItem } from '@/lib/types';
import { useUser } from '@/context/UserContext';
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/lib/supabase';

interface WatchlistContextType {
  watchlistItems: WatchlistItem[];
  isLoading: boolean;
  addWatchlistItem: (item: Omit<WatchlistItem, 'id' | 'status' | 'added_by' | 'user_id' | 'created_at'>) => Promise<void>;
  deleteWatchlistItem: (id: string) => Promise<void>;
  markAsWatched: (id: string) => Promise<void>;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile, user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    const fetchItems = async () => {
      setIsLoading(true);
      const { data, error } = await supabase.from('watchlist_items').select('*');
      if (error) {
        toast({ variant: "destructive", title: 'Error loading watchlist', description: error.message });
      } else {
        setWatchlistItems(data || []);
      }
      setIsLoading(false);
    };
    if (user) {
        fetchItems();
    } else {
        setWatchlistItems([]);
        setIsLoading(false);
    }
  }, [toast, user]);

  const addWatchlistItem = async (item: Omit<WatchlistItem, 'id' | 'status' | 'added_by' | 'user_id' | 'created_at'>) => {
    if (!profile || !user) return;
    const newItem = {
        ...item,
        status: 'To Watch',
        added_by: profile.username,
        user_id: user.id,
    };
    const { data, error } = await supabase
      .from('watchlist_items')
      .insert([newItem])
      .select()
      .single();

    if (error) {
        toast({ variant: "destructive", title: 'Error adding item', description: error.message });
    } else {
      setWatchlistItems((prev) => [data, ...prev]);
      toast({ title: "Added to Watchlist!", description: `"${data.title}" is ready to watch.` });
    }
  };

  const markAsWatched = async (id: string) => {
    const item = watchlistItems.find(i => i.id === id);
    if (!item || item.user_id !== user?.id) {
        toast({ variant: "destructive", title: 'Not Authorized', description: "You can only update your own items." });
        return;
    }

    const { error } = await supabase
      .from('watchlist_items')
      .update({ status: 'Watched' })
      .eq('id', id);

    if (error) {
      toast({ variant: "destructive", title: 'Error updating status', description: error.message });
    } else {
      setWatchlistItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: 'Watched' } : i))
      );
    }
  };

  const deleteWatchlistItem = async (id: string) => {
    const item = watchlistItems.find(i => i.id === id);
    if (!item || item.user_id !== user?.id) {
        toast({ variant: "destructive", title: 'Not Authorized', description: "You can only delete your own items." });
        return;
    }
    const { error } = await supabase.from('watchlist_items').delete().eq('id', id);
    if (error) {
      toast({ variant: "destructive", title: 'Error deleting item', description: error.message });
    } else {
      setWatchlistItems((prev) => prev.filter((i) => i.id !== id));
      toast({ title: "Item Removed", description: "Deleted from list.", variant: "destructive" });
    }
  };

  return (
    <WatchlistContext.Provider value={{ watchlistItems, isLoading, addWatchlistItem, deleteWatchlistItem, markAsWatched }}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const context = useContext(WatchlistContext);
  if (!context) throw new Error('useWatchlist must be used within a WatchlistProvider');
  return context;
}
