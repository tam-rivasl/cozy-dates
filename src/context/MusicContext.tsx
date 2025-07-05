
'use client';
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useUser } from '@/context/UserContext';
import { useToast } from "@/hooks/use-toast";
import { MusicNote } from '@/lib/types';
//import { supabase } from '@/lib/supabase';

interface MusicContextType {
  musicNotes: MusicNote[];
  isLoading: boolean;
  addMusicNote: (note: Omit<MusicNote, 'id' | 'added_by'>) => Promise<void>;
  deleteMusicNote: (id: string) => Promise<void>;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export function MusicProvider({ children }: { children: ReactNode }) {
  const [musicNotes, setMusicNotes] = useState<MusicNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    const fetchNotes = async () => {
      setIsLoading(true);
      // const { data, error } = await supabase.from('music_notes').select('*');
      // if (error) {
      //   toast({ variant: "destructive", title: 'Error loading music notes', description: error.message });
      // } else {
      //   setMusicNotes(data || []);
      // }
      // setIsLoading(false);
      // Dummy data for now
      setMusicNotes([]);
      setIsLoading(false)
    };
    fetchNotes();
  }, [toast]);

  const addMusicNote = async (note: Omit<MusicNote, 'id' | 'added_by'>) => {
    // if (!user) return;
    // const { data, error } = await supabase
    //   .from('music_notes')
    //   .insert([{ ...note, added_by: user }])
    //   .select()
    //   .single();

    // if (error) {
    //   toast({ variant: "destructive", title: 'Error adding note', description: error.message });
    // } else {
    //   setMusicNotes((prev) => [data, ...prev]);
    //   toast({ title: "Dedication Added!", description: `Your note "${data.title}" was added.` });
    // }
    // Dummy logic
    const newNote = { id: Date.now().toString(), ...note, added_by: user || 'dummy_user' };
    setMusicNotes((prev) => [newNote, ...prev]);
    toast({ title: "Dedication Added!", description: `Your note "${newNote.title}" was added.` });
  };

  const deleteMusicNote = async (id: string) => {
    // const { error } = await supabase.from('music_notes').delete().eq('id', id);
    // if (error) {
    //   toast({ variant: "destructive", title: 'Error deleting note', description: error.message });
    // } else {
    //   setMusicNotes((prev) => prev.filter((note) => note.id !== id));
    //   toast({ title: "Dedication Removed", description: "Note deleted.", variant: "destructive" });
    // }
    // Dummy logic
    setMusicNotes((prev) => prev.filter((note) => note.id !== id));
    toast({ title: "Dedication Removed", description: "Note deleted.", variant: "destructive" });
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
