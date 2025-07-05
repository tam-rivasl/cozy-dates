
'use client';
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import type { MusicNote } from '@/lib/types';
import { useUser } from '@/context/UserContext';
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/lib/supabase';

interface MusicContextType {
  musicNotes: MusicNote[];
  isLoading: boolean;
  addMusicNote: (note: Omit<MusicNote, 'id' | 'added_by' | 'user_id' | 'created_at'>) => Promise<void>;
  deleteMusicNote: (id: string) => Promise<void>;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export function MusicProvider({ children }: { children: ReactNode }) {
  const [musicNotes, setMusicNotes] = useState<MusicNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile, user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    const fetchNotes = async () => {
      setIsLoading(true);
      const { data, error } = await supabase.from('music_notes').select('*');
      if (error) {
        toast({ variant: "destructive", title: 'Error loading music notes', description: error.message });
      } else {
        setMusicNotes(data || []);
      }
      setIsLoading(false);
    };
    if (user) {
      fetchNotes();
    } else {
      setIsLoading(false);
    }
  }, [toast, user]);

  const addMusicNote = async (note: Omit<MusicNote, 'id' | 'added_by' | 'user_id' | 'created_at'>) => {
    if (!profile || !user) return;
    const newNote = { ...note, added_by: profile.username, user_id: user.id };
    const { data, error } = await supabase
      .from('music_notes')
      .insert([newNote])
      .select()
      .single();

    if (error) {
      toast({ variant: "destructive", title: 'Error adding note', description: error.message });
    } else {
      setMusicNotes((prev) => [data, ...prev]);
      toast({ title: "Dedication Added!", description: `Your note "${data.title}" was added.` });
    }
  };

  const deleteMusicNote = async (id: string) => {
    const { error } = await supabase.from('music_notes').delete().eq('id', id);
    if (error) {
      toast({ variant: "destructive", title: 'Error deleting note', description: error.message });
    } else {
      setMusicNotes((prev) => prev.filter((note) => note.id !== id));
      toast({ title: "Dedication Removed", description: "Note deleted.", variant: "destructive" });
    }
  };

  return (
    <MusicContext.Provider value={{ musicNotes, isLoading, addMusicNote, deleteMusicNote }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const context = useContext(MusicContext);
  if (!context) throw new Error('useMusic must be used within a MusicProvider');
  return context;
}
