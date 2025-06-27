'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import type { MusicNote } from '@/lib/types';
import { useUser } from '@/context/UserContext';
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/lib/supabaseClient';

interface MusicContextType {
  musicNotes: MusicNote[];
  isLoading: boolean;
  addMusicNote: (item: Omit<MusicNote, 'id' | 'addedBy'>) => void;
  deleteMusicNote: (noteId: string) => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

const initialMusicNotes: MusicNote[] = [
    { 
      id: 'm1', 
      title: 'For your morning coffee ☕', 
      notes: 'Thought you might like this chill playlist to start your day. Love you!', 
      playlistUrl: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M', 
      addedBy: 'Carlos' 
    },
    { 
      id: 'm2', 
      title: 'Our Anniversary Songs', 
      notes: 'A collection of songs that remind me of us over the years. Happy anniversary, my love.', 
      playlistUrl: 'https://music.youtube.com/playlist?list=PL4fGSI1pDJn5kI81J1fYC0_B_k3qByOU5', 
      addedBy: 'Tamara'
    },
];

export function MusicProvider({ children }: { children: ReactNode }) {
  const [musicNotes, setMusicNotes] = useState<MusicNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from('music_notes').select('*');
      if (error) {
        console.error('Failed to load music notes', error);
        setMusicNotes(initialMusicNotes);
      } else {
        setMusicNotes(data as MusicNote[]);
      }
      setIsLoading(false);
    }
    load();
  }, []);

  const addMusicNote = async (note: Omit<MusicNote, 'id' | 'addedBy'>) => {
    if (!user) return;
    const newNote: MusicNote = {
      ...note,
      id: crypto.randomUUID(),
      addedBy: user,
    };
    setMusicNotes((prev) => [newNote, ...prev]);
    await supabase.from('music_notes').insert(newNote);
    toast({
      title: "Dedication Added!",
      description: `Your musical note "${newNote.title}" has been shared.`,
    })
  };

  const deleteMusicNote = async (noteId: string) => {
    setMusicNotes((prev) => prev.filter((note) => note.id !== noteId));
    await supabase.from('music_notes').delete().eq('id', noteId);
     toast({
      title: "Dedication Removed",
      description: "The musical note has been deleted.",
      variant: "destructive"
    })
  };
  
  return (
    <MusicContext.Provider value={{ musicNotes, isLoading, addMusicNote, deleteMusicNote }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const context = useContext(MusicContext);
  if (context === undefined) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
}
