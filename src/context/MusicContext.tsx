'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import type { MusicNote, Profile } from '@/lib/types';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/hooks/use-toast';
import { logError, logInfo, logWarn } from '@/lib/logger';

interface MusicContextType {
  musicNotes: MusicNote[];
  isLoading: boolean;
  addMusicNote: (item: Omit<MusicNote, 'id' | 'addedBy'>) => Promise<void>;
  deleteMusicNote: (noteId: string) => Promise<void>;
}

interface MusicRow {
  id: string;
  title: string;
  message: string;
  playlist_url: string;
  added_by: string | null;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export function MusicProvider({ children }: { children: ReactNode }) {
  const [musicNotes, setMusicNotes] = useState<MusicNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, members, activeCoupleId } = useUser();
  const { toast } = useToast();

  const membersMap = useMemo(() => {
    const map = new Map<string, Profile>();
    members.forEach((profile) => {
      map.set(profile.id, profile);
    });
    return map;
  }, [members]);

  const fetchMusicNotes = useCallback(async () => {
    if (!activeCoupleId) {
      logInfo('MusicContext.fetchMusicNotes', 'Sin pareja activa, limpiando notas');
      setMusicNotes([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    logInfo('MusicContext.fetchMusicNotes', 'Cargando notas', { coupleId: activeCoupleId });

    const { data, error } = await supabase
      .from('music_notes')
      .select('id, title, message, playlist_url, added_by')
      .eq('couple_id', activeCoupleId)
      .order('created_at', { ascending: false });

    if (error) {
      logError('MusicContext.fetchMusicNotes', 'Error obteniendo notas', error);
      toast({
        variant: 'destructive',
        title: 'No pudimos cargar las dedicatorias',
        description: 'Intenta nuevamente en unos minutos.',
      });
      setMusicNotes([]);
      setIsLoading(false);
      return;
    }

    const rows = ((data ?? []) as MusicRow[]);
    const mapped = rows.map((row) => ({
      id: row.id,
      title: row.title,
      notes: row.message,
      playlistUrl: row.playlist_url,
      addedBy: row.added_by ? membersMap.get(row.added_by) ?? null : null,
    } satisfies MusicNote));

    setMusicNotes(mapped);
    setIsLoading(false);
    logInfo('MusicContext.fetchMusicNotes', 'Notas cargadas', { count: mapped.length });
  }, [activeCoupleId, membersMap, toast]);

  useEffect(() => {
    void fetchMusicNotes();
  }, [fetchMusicNotes]);

  const addMusicNote = useCallback<MusicContextType['addMusicNote']>(
    async (note) => {
      if (!user || !activeCoupleId) {
        logWarn('MusicContext.addMusicNote', 'No se pudo agregar nota por falta de contexto', {
          userId: user?.id ?? null,
        });
        return;
      }

      logInfo('MusicContext.addMusicNote', 'Agregando nota', { title: note.title });

      const { error } = await supabase.from('music_notes').insert({
        title: note.title,
        message: note.notes,
        playlist_url: note.playlistUrl,
        couple_id: activeCoupleId,
        added_by: user.id,
      });

      if (error) {
        logError('MusicContext.addMusicNote', 'Error agregando nota', error);
        toast({
          variant: 'destructive',
          title: 'No pudimos agregar la dedicatoria',
          description: 'Intentalo nuevamente mas tarde.',
        });
        return;
      }

      toast({
        title: 'Dedicatoria agregada',
        description: `"${note.title}" se compartio con tu pareja.`,
      });

      await fetchMusicNotes();
    },
    [fetchMusicNotes, toast, user, activeCoupleId],
  );

  const deleteMusicNote = useCallback<MusicContextType['deleteMusicNote']>(
    async (noteId) => {
      logInfo('MusicContext.deleteMusicNote', 'Eliminando nota', { noteId });
      const { error } = await supabase
        .from('music_notes')
        .delete()
        .eq('id', noteId);

      if (error) {
        logError('MusicContext.deleteMusicNote', 'Error eliminando nota', error);
        toast({
          variant: 'destructive',
          title: 'No pudimos eliminar la dedicatoria',
          description: 'Intentalo nuevamente mas tarde.',
        });
        return;
      }

      toast({
        title: 'Dedicatoria eliminada',
        description: 'La nota se elimino correctamente.',
        variant: 'destructive',
      });

      await fetchMusicNotes();
    },
    [fetchMusicNotes, toast],
  );

  const value = useMemo(
    () => ({ musicNotes, isLoading, addMusicNote, deleteMusicNote }),
    [musicNotes, isLoading, addMusicNote, deleteMusicNote],
  );

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}

export function useMusic() {
  const context = useContext(MusicContext);
  if (context === undefined) {
    throw new Error('useMusic debe usarse dentro de un MusicProvider');
  }
  return context;
}

