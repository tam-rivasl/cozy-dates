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
import type { Profile, WatchlistItem } from '@/lib/types';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/hooks/use-toast';
import { logError, logInfo, logWarn } from '@/lib/logger';

interface WatchlistContextType {
  watchlistItems: WatchlistItem[];
  isLoading: boolean;
  addWatchlistItem: (item: Omit<WatchlistItem, 'id' | 'status' | 'created_by'>) => Promise<void>;
  deleteWatchlistItem: (itemId: string) => Promise<void>;
  markAsWatched: (itemId: string) => Promise<void>;
}

interface WatchlistRow {
  id: string;
  title: string;
  kind: string;
  status: string;
  created_by: string | null;
}

const KIND_FROM_DB: Record<string, WatchlistItem['type']> = {
  movie: 'Movie',
  series: 'Series',
};

const KIND_TO_DB: Record<WatchlistItem['type'], string> = {
  Movie: 'movie',
  Series: 'series',
};

const STATUS_FROM_DB: Record<string, WatchlistItem['status']> = {
  to_watch: 'To Watch',
  watched: 'Watched',
};

const STATUS_TO_DB: Record<WatchlistItem['status'], string> = {
  'To Watch': 'to_watch',
  Watched: 'watched',
};

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
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

  const fetchWatchlist = useCallback(async () => {
    if (!activeCoupleId) {
      logInfo('WatchlistContext.fetchWatchlist', 'Sin pareja activa, limpiando lista');
      setWatchlistItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    logInfo('WatchlistContext.fetchWatchlist', 'Cargando watchlist', { coupleId: activeCoupleId });

    const { data, error } = await supabase
      .from('watchlist_items')
      .select('id, title, kind, status, created_by')
      .eq('couple_id', activeCoupleId)
      .order('created_at', { ascending: false });

    if (error) {
      logError('WatchlistContext.fetchWatchlist', 'Error cargando watchlist', error);
      toast({
        variant: 'destructive',
        title: 'No pudimos cargar la watchlist',
        description: 'Intenta nuevamente en unos minutos.',
      });
      setWatchlistItems([]);
      setIsLoading(false);
      return;
    }

    const rows = ((data ?? []) as unknown as WatchlistRow[]);
    const items = rows.map((row) => ({
      id: row.id,
      title: row.title,
      type: KIND_FROM_DB[row.kind] ?? 'Movie',
      status: STATUS_FROM_DB[row.status] ?? 'To Watch',
      created_by: row.created_by ? membersMap.get(row.created_by) ?? null : null,
    } satisfies WatchlistItem));

    setWatchlistItems(items);
    setIsLoading(false);
    logInfo('WatchlistContext.fetchWatchlist', 'Watchlist cargada', { count: items.length });
  }, [activeCoupleId, membersMap, toast]);

  useEffect(() => {
    void fetchWatchlist();
  }, [fetchWatchlist]);

  const addWatchlistItem = useCallback<WatchlistContextType['addWatchlistItem']>(
    async (item) => {
      if (!user || !activeCoupleId) {
        logWarn('WatchlistContext.addWatchlistItem', 'No se pudo agregar item por falta de contexto', {
          userId: user?.id ?? null,
        });
        return;
      }

      logInfo('WatchlistContext.addWatchlistItem', 'Agregando elemento', { title: item.title });

      const { error } = await supabase.from('watchlist_items').insert({
        title: item.title,
        kind: KIND_TO_DB[item.type],
        status: STATUS_TO_DB['To Watch'],
        couple_id: activeCoupleId,
        created_by: user.id,
      });

      if (error) {
        logError('WatchlistContext.addWatchlistItem', 'Error agregando elemento', error);
        toast({
          variant: 'destructive',
          title: 'No pudimos agregar el titulo',
          description: 'Intentalo nuevamente mas tarde.',
        });
        return;
      }

      toast({
        title: 'Agregado a la watchlist',
        description: `"${item.title}" esta listo para ver.`,
      });

      await fetchWatchlist();
    },
    [fetchWatchlist, toast, user, activeCoupleId],
  );

  const markAsWatched = useCallback<WatchlistContextType['markAsWatched']>(
    async (itemId) => {
      logInfo('WatchlistContext.markAsWatched', 'Marcando como visto', { itemId });
      const { error } = await supabase
        .from('watchlist_items')
        .update({ status: STATUS_TO_DB.Watched })
        .eq('id', itemId);

      if (error) {
        logError('WatchlistContext.markAsWatched', 'Error marcando como visto', error);
        toast({
          variant: 'destructive',
          title: 'No pudimos actualizar el elemento',
          description: 'Intentalo nuevamente mas tarde.',
        });
        return;
      }

      await fetchWatchlist();
    },
    [fetchWatchlist, toast],
  );

  const deleteWatchlistItem = useCallback<WatchlistContextType['deleteWatchlistItem']>(
    async (itemId) => {
      logInfo('WatchlistContext.deleteWatchlistItem', 'Eliminando elemento', { itemId });
      const { error } = await supabase
        .from('watchlist_items')
        .delete()
        .eq('id', itemId);

      if (error) {
        logError('WatchlistContext.deleteWatchlistItem', 'Error eliminando elemento', error);
        toast({
          variant: 'destructive',
          title: 'No pudimos eliminar el elemento',
          description: 'Intentalo nuevamente mas tarde.',
        });
        return;
      }

      toast({
        title: 'Elemento eliminado',
        description: 'Se quito de la lista.',
        variant: 'destructive',
      });

      await fetchWatchlist();
    },
    [fetchWatchlist, toast],
  );

  const value = useMemo(
    () => ({ watchlistItems, isLoading, addWatchlistItem, deleteWatchlistItem, markAsWatched }),
    [watchlistItems, isLoading, addWatchlistItem, deleteWatchlistItem, markAsWatched],
  );

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}

export function useWatchlist() {
  const context = useContext(WatchlistContext);
  if (context === undefined) {
    throw new Error('useWatchlist must be used within a WatchlistProvider');
  }
  return context;
}

