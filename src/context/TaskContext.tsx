'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile, Task } from '@/lib/types';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/hooks/use-toast';
import { useWatchlist } from './WatchlistContext';
import { logError, logInfo, logWarn } from '@/lib/logger';
import { signedUrlFromPath /* o publicUrlFromPath si tu bucket es público */ } from '@/lib/storageUrls';

interface TaskContextType {
  tasks: Task[];
  isLoading: boolean;
  // La app calcula id/completed/createdBy/photos, por eso los omitimos al crear
  addTask: (task: Omit<Task, 'id' | 'completed' | 'createdBy' | 'photos'>) => Promise<void>;
  toggleComplete: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  addPhoto: (taskId: string, photoDataUri: string) => Promise<void>;
}

// Estructura que devuelve PostgREST
interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  due_at: string;
  category: string;            // enum BD: 'date_night' | ...
  priority: string;            // enum BD: 'low' | 'medium' | 'high'
  is_completed: boolean;
  watchlist_item_id: string | null;
  created_by: string | null;
  task_photos: { storage_path: string }[] | null;
}

// Mapas BD <-> UI
const CATEGORY_FROM_DB: Record<string, Task['category']> = {
  date_night: 'Date Night',
  movie_day: 'Movie Day',
  travel_plans: 'Travel Plans',
  to_do: 'To-Do',
  special_event: 'Special Event',
};

const CATEGORY_TO_DB: Record<Task['category'], string> = {
  'Date Night': 'date_night',
  'Movie Day': 'movie_day',
  'Travel Plans': 'travel_plans',
  'To-Do': 'to_do',
  'Special Event': 'special_event',
};

const PRIORITY_FROM_DB: Record<string, Task['priority']> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const PRIORITY_TO_DB: Record<Task['priority'], string> = {
  High: 'high',
  Medium: 'medium',
  Low: 'low',
};

const TaskContext = createContext<TaskContextType | undefined>(undefined);

// Data URI -> Blob (para subir fotos)
function dataUriToBlob(dataUri: string): { blob: Blob; extension: string } {
  const matches = dataUri.match(/^data:(.*);base64,(.*)$/);
  if (!matches) throw new Error('Invalid data URI');
  const mime = matches[1];
  const base64Data = matches[2];
  const binary = atob(base64Data);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) array[i] = binary.charCodeAt(i);
  const extension = (mime.split('/')[1] ?? 'png').toLowerCase();
  const blob = new Blob([array], { type: mime });
  return { blob, extension };
}

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedOnceRef = useRef(false);

  const { user, members, activeCoupleId } = useUser();
  const { toast } = useToast();
  const { markAsWatched } = useWatchlist();

  // Cache idPerfil -> Profile para resolver created_by
  const membersMap = useMemo(() => {
    const map = new Map<string, Profile>();
    members.forEach((profile) => map.set(profile.id, profile));
    return map;
  }, [members]);

  // select compacto (evita PGRST100) + embed de fotos
  const SELECT_COLS = useMemo(
    () =>
      [
        'id',
        'title',
        'description',
        'due_at',
        'category',
        'priority',
        'is_completed',
        'watchlist_item_id',
        'created_by',
        'task_photos(storage_path)', // OJO: sin espacio antes del paréntesis
      ].join(','),
    [],
  );

  // Helper interno: resuelve storage_paths -> URLs (firmadas o públicas)
  const resolvePhotoUrls = useCallback(async (paths: string[]): Promise<string[]> => {
    // Si tu bucket es público, podrías usar publicUrlFromPath(path) sin await.
    const urls = await Promise.all(paths.map((p) => signedUrlFromPath(p)));
    // Filtra nulos por si alguna firma falla
    return urls.filter((u): u is string => !!u);
  }, []);

  // Cargar tareas de la pareja activa
  const fetchTasks = useCallback(async () => {
    if (!activeCoupleId) {
      logInfo('TaskContext.fetchTasks', 'Sin pareja activa, limpiando tareas');
      hasLoadedOnceRef.current = false;
      setTasks([]);
      setIsLoading(false);
      return;
    }

    const shouldShowSpinner = !hasLoadedOnceRef.current;
    if (shouldShowSpinner) {
      setIsLoading(true);
    }
    logInfo('TaskContext.fetchTasks', 'Cargando tareas', { coupleId: activeCoupleId });

    const { data, error } = await supabase
      .from('tasks')
      .select(SELECT_COLS)
      .eq('couple_id', activeCoupleId)
      .order('due_at', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      logError('TaskContext.fetchTasks', 'Error cargando tareas', error);
      setTasks([]);
      setIsLoading(false);
      hasLoadedOnceRef.current = false;
      return;
    }

    const rows = (data ?? []) as unknown as TaskRow[];

    // 1) mapear campos base
    const base = rows.map((row) => {
      const storagePaths = (row.task_photos ?? []).map((p) => p.storage_path);
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        dueAtISO: row.due_at,
        categoryDb: row.category,
        priorityDb: row.priority,
        isCompleted: row.is_completed,
        watchlistItemId: row.watchlist_item_id,
        createdByProfile: row.created_by ? membersMap.get(row.created_by) ?? null : null,
        storagePaths,
      };
    });

    // 2) resolver fotos a URLs válidas (para <Image src>)
    const photosPerTask = await Promise.all(base.map((b) => resolvePhotoUrls(b.storagePaths)));

    // 3) construir Tasks finales
    const mapped: Task[] = base.map((b, i) => ({
      id: b.id,
      title: b.title,
      description: b.description,
      date: new Date(b.dueAtISO),
      category: CATEGORY_FROM_DB[b.categoryDb] ?? 'Date Night',
      priority: PRIORITY_FROM_DB[b.priorityDb] ?? 'Medium',
      completed: b.isCompleted,
      watchlistItemId: b.watchlistItemId,
      createdBy: b.createdByProfile,
      photos: photosPerTask[i], // URLs listas para <Image>
    }));

    setTasks(mapped);
    setIsLoading(false);
    hasLoadedOnceRef.current = true;
    logInfo('TaskContext.fetchTasks', 'Tareas cargadas', { count: mapped.length });
  }, [SELECT_COLS, activeCoupleId, membersMap, resolvePhotoUrls]);

  useEffect(() => {
    hasLoadedOnceRef.current = false;
  }, [activeCoupleId]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  // Crear tarea
  const addTask = useCallback<TaskContextType['addTask']>(async (task) => {
    if (!user || !activeCoupleId) {
      logWarn('TaskContext.addTask', 'No hay pareja activa o usuario', { userId: user?.id ?? null });
      return;
    }

    logInfo('TaskContext.addTask', 'Creando nueva tarea', { title: task.title });

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: task.title,
        description: task.description,
        due_at: task.date.toISOString(),
        category: CATEGORY_TO_DB[task.category],
        priority: PRIORITY_TO_DB[task.priority],
        couple_id: activeCoupleId,
        created_by: user.id,
        watchlist_item_id: task.watchlistItemId ?? null,
      })
      .select('id')
      .single();

    if (error || !data) {
      logError('TaskContext.addTask', 'Error agregando tarea', error);
      toast({
        variant: 'destructive',
        title: 'No pudimos crear el plan',
        description: 'Inténtalo de nuevo en un momento.',
      });
      return;
    }

    toast({ title: 'Plan agregado', description: `"${task.title}" ya está en tu lista.` });
    await fetchTasks();
  }, [fetchTasks, toast, user, activeCoupleId]);

  // Alternar completado
  const toggleComplete = useCallback<TaskContextType['toggleComplete']>(async (taskId) => {
    const current = tasks.find((t) => t.id === taskId);
    if (!current) {
      logWarn('TaskContext.toggleComplete', 'No encontramos la tarea solicitada', { taskId });
      return;
    }

    logInfo('TaskContext.toggleComplete', 'Alternando estado de tarea', {
      taskId,
      completed: current.completed,
    });

    const { error } = await supabase
      .from('tasks')
      .update({ is_completed: !current.completed })
      .eq('id', taskId);

    if (error) {
      logError('TaskContext.toggleComplete', 'Error actualizando tarea', error);
      toast({
        variant: 'destructive',
        title: 'No pudimos actualizar el plan',
        description: 'Inténtalo de nuevo en unos momentos.',
      });
      return;
    }

    // Si se completó y tenía watchlist asignado → marcar como visto
    if (!current.completed && current.watchlistItemId) {
      await markAsWatched(current.watchlistItemId);
    }

    await fetchTasks();
  }, [fetchTasks, markAsWatched, tasks, toast]);

  // Eliminar tarea
  const deleteTask = useCallback<TaskContextType['deleteTask']>(async (taskId) => {
    logInfo('TaskContext.deleteTask', 'Eliminando tarea', { taskId });
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);

    if (error) {
      logError('TaskContext.deleteTask', 'Error eliminando tarea', error);
      toast({
        variant: 'destructive',
        title: 'No pudimos eliminar el plan',
        description: 'Inténtalo nuevamente pronto.',
      });
      return;
    }

    toast({ title: 'Plan eliminado', description: 'El plan se eliminó correctamente.', variant: 'destructive' });
    await fetchTasks();
  }, [fetchTasks, toast]);

  // Subir foto (con RLS de storage.objects basada en taskId como prefijo)
  const addPhoto = useCallback<TaskContextType['addPhoto']>(async (taskId, photoDataUri) => {
    try {
      logInfo('TaskContext.addPhoto', 'Adjuntando foto a tarea', { taskId });

      // 1) Data URI -> Blob
      const { blob, extension } = dataUriToBlob(photoDataUri);
      const filePath = `${taskId}/${crypto.randomUUID()}.${extension}`;

      // 2) Upload a Storage (asegúrate que tus policies permitan INSERT en storage.objects)
      const { error: uploadError } = await supabase
        .storage
        .from('task-photos')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: false,
          contentType: blob.type,
        });

      if (uploadError) {
        logError('TaskContext.addPhoto', 'Error subiendo foto', { uploadError, filePath });
        throw uploadError;
      }

      // 3) Registrar en task_photos
      const { error: insertError } = await supabase
        .from('task_photos')
        .insert({ task_id: taskId, storage_path: filePath });

      if (insertError) {
        logError('TaskContext.addPhoto', 'Error insertando foto', { insertError, filePath });
        throw insertError;
      }

      toast({ title: 'Recuerdo agregado', description: 'La foto se guardó correctamente.' });

      // 4) Refrescar: volverá con URLs firmadas listas para <Image />
      await fetchTasks();
    } catch (error) {
      logError('TaskContext.addPhoto', 'Error agregando foto', error);
      toast({
        variant: 'destructive',
        title: 'No pudimos subir la foto',
        description: 'Inténtalo de nuevo más tarde.',
      });
    }
  }, [fetchTasks, toast]);

  const value = useMemo(
    () => ({ tasks, isLoading, addTask, toggleComplete, deleteTask, addPhoto }),
    [tasks, isLoading, addTask, toggleComplete, deleteTask, addPhoto],
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
}
