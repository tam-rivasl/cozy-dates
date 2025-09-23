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
import type { Profile, Task } from '@/lib/types';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/hooks/use-toast';
import { useWatchlist } from './WatchlistContext';
import { logError, logInfo, logWarn } from '@/lib/logger';

interface TaskContextType {
  tasks: Task[];
  isLoading: boolean;
  addTask: (task: Omit<Task, 'id' | 'completed' | 'createdBy' | 'photos'>) => Promise<void>;
  toggleComplete: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  addPhoto: (taskId: string, photoDataUri: string) => Promise<void>;
}

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  due_at: string;
  category: string;
  priority: string;
  is_completed: boolean;
  notes: string | null;
  watchlist_item_id: string | null;
  created_by: string | null;
  task_photos: { storage_path: string }[] | null;
}

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

function dataUriToBlob(dataUri: string): { blob: Blob; extension: string } {
  const matches = dataUri.match(/^data:(.*);base64,(.*)$/);
  if (!matches) {
    throw new Error('Invalid data URI');
  }

  const mime = matches[1];
  const base64Data = matches[2];
  const binary = atob(base64Data);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    array[i] = binary.charCodeAt(i);
  }

  const extension = mime.split('/')[1] ?? 'png';
  const blob = new Blob([array], { type: mime });

  return { blob, extension };
}

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, members, activeCoupleId } = useUser();
  const { toast } = useToast();
  const { markAsWatched } = useWatchlist();

  const membersMap = useMemo(() => {
    const map = new Map<string, Profile>();
    members.forEach((profile) => {
      map.set(profile.id, profile);
    });
    return map;
  }, [members]);

  const fetchTasks = useCallback(async () => {
    if (!activeCoupleId) {
      logInfo('TaskContext.fetchTasks', 'Sin pareja activa, limpiando tareas');
      setTasks([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    logInfo('TaskContext.fetchTasks', 'Cargando tareas', { coupleId: activeCoupleId });

    const { data, error } = await supabase
      .from('tasks')
      .select(
        id,
        title,
        description,
        due_at,
        category,
        priority,
        is_completed,
        notes,
        watchlist_item_id,
        created_by,
        task_photos (storage_path)
      )
      .eq('couple_id', activeCoupleId)
      .order('due_at', { ascending: true });

    if (error) {
      logError('TaskContext.fetchTasks', 'Error obteniendo tareas', error);
      toast({
        variant: 'destructive',
        title: 'No pudimos cargar tus planes',
        description: 'Por favor intenta de nuevo en unos minutos.',
      });
      setTasks([]);
      setIsLoading(false);
      return;
    }

    const rows = ((data ?? []) as TaskRow[]);
    const mappedTasks: Task[] = rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      date: new Date(row.due_at),
      category: CATEGORY_FROM_DB[row.category] ?? 'Date Night',
      priority: PRIORITY_FROM_DB[row.priority] ?? 'Medium',
      completed: row.is_completed,
      notes: row.notes,
      watchlistItemId: row.watchlist_item_id,
      createdBy: row.created_by ? membersMap.get(row.created_by) ?? null : null,
      photos: (row.task_photos ?? []).map((photo) => photo.storage_path),
    } satisfies Task));

    setTasks(mappedTasks);
    setIsLoading(false);
    logInfo('TaskContext.fetchTasks', 'Tareas cargadas', { count: mappedTasks.length });
  }, [activeCoupleId, membersMap, toast]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  const addTask = useCallback<TaskContextType['addTask']>(
    async (task) => {
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
          notes: task.notes,
          watchlist_item_id: task.watchlistItemId ?? null,
        })
        .select('id')
        .single();

      if (error || !data) {
        logError('TaskContext.addTask', 'Error agregando tarea', error);
        toast({
          variant: 'destructive',
          title: 'No pudimos crear el plan',
          description: 'Intentalo de nuevo en un momento.',
        });
        return;
      }

      toast({
        title: 'Plan agregado',
        description: `"${task.title}" ya esta en tu lista.`,
      });

      await fetchTasks();
    },
    [fetchTasks, toast, user, activeCoupleId],
  );

  const toggleComplete = useCallback<TaskContextType['toggleComplete']>(
    async (taskId) => {
      const taskToUpdate = tasks.find((task) => task.id === taskId);
      if (!taskToUpdate) {
        logWarn('TaskContext.toggleComplete', 'No encontramos la tarea solicitada', { taskId });
        return;
      }

      logInfo('TaskContext.toggleComplete', 'Alternando estado de tarea', {
        taskId,
        completed: taskToUpdate.completed,
      });

      const { error } = await supabase
        .from('tasks')
        .update({ is_completed: !taskToUpdate.completed })
        .eq('id', taskId);

      if (error) {
        logError('TaskContext.toggleComplete', 'Error actualizando tarea', error);
        toast({
          variant: 'destructive',
          title: 'No pudimos actualizar el plan',
          description: 'Intentalo de nuevo en unos momentos.',
        });
        return;
      }

      if (!taskToUpdate.completed && taskToUpdate.watchlistItemId) {
        await markAsWatched(taskToUpdate.watchlistItemId);
      }

      await fetchTasks();
    },
    [fetchTasks, markAsWatched, tasks, toast],
  );

  const deleteTask = useCallback<TaskContextType['deleteTask']>(
    async (taskId) => {
      logInfo('TaskContext.deleteTask', 'Eliminando tarea', { taskId });
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);

      if (error) {
        logError('TaskContext.deleteTask', 'Error eliminando tarea', error);
        toast({
          variant: 'destructive',
          title: 'No pudimos eliminar el plan',
          description: 'Intentalo nuevamente pronto.',
        });
        return;
      }

      toast({
        title: 'Plan eliminado',
        description: 'El plan se elimino correctamente.',
        variant: 'destructive',
      });

      await fetchTasks();
    },
    [fetchTasks, toast],
  );

  const addPhoto = useCallback<TaskContextType['addPhoto']>(
    async (taskId, photoDataUri) => {
      try {
        logInfo('TaskContext.addPhoto', 'Adjuntando foto a tarea', { taskId });
        const { blob, extension } = dataUriToBlob(photoDataUri);
        const filePath = `${taskId}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase
          .storage
          .from('task-photos')
          .upload(filePath, blob, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          throw uploadError;
        }

        const { error: insertError } = await supabase
          .from('task_photos')
          .insert({ task_id: taskId, storage_path: filePath });

        if (insertError) {
          throw insertError;
        }

        toast({
          title: 'Recuerdo agregado',
          description: 'La foto se guardo correctamente.',
        });

        await fetchTasks();
      } catch (error) {
        logError('TaskContext.addPhoto', 'Error agregando foto', error);
        toast({
          variant: 'destructive',
          title: 'No pudimos subir la foto',
          description: 'Intentalo de nuevo mas tarde.',
        });
      }
    },
    [fetchTasks, toast],
  );

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


