'use client';
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import type { Task } from '@/lib/types';
import { useUser } from '@/context/UserContext';
import { useToast } from "@/hooks/use-toast";
import { useWatchlist } from './WatchlistContext';
import { supabase, type SupabaseTask } from '@/lib/supabase';

interface TaskContextType {
  tasks: Task[];
  isLoading: boolean;
  addTask: (task: Omit<Task, 'id' | 'completed' | 'created_by' | 'photos'>) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addPhoto: (id: string, photoDataUri: string) => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const { toast } = useToast();
  const { markAsWatched } = useWatchlist();

  useEffect(() => {
    const loadTasks = async () => {
      setIsLoading(true);
      const { data, error } = await supabase.from('tasks').select('*');
      if (error) {
        toast({ variant: "destructive", title: 'Error loading tasks', description: error.message });
      } else {
        setTasks(data?.map((t: SupabaseTask) => ({ ...t, date: new Date(t.date) })) || []);
      }
      setIsLoading(false);
    };
    loadTasks();
  }, [toast]);

  const addTask = async (task: Omit<Task, 'id' | 'completed' | 'created_by' | 'photos'>) => {
    if (!profile) return;
    const newTask = {
        ...task,
        created_by: profile.username,
        completed: false,
        photos: [],
        watchlist_item_id: task.watchlist_item_id || null,
    };
    
    const { data, error } = await supabase
      .from('tasks')
      .insert([newTask])
      .select()
      .single();

    if (error) {
        toast({ variant: "destructive", title: 'Error adding task', description: error.message });
    }
    else {
      setTasks((prev) => [{...data, date: new Date(data.date)}, ...prev]);
      toast({ title: "Task Added!", description: `"${data.title}" has been added.` });
    }
  };

  const toggleComplete = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const { error } = await supabase
      .from('tasks')
      .update({ completed: !task.completed })
      .eq('id', id);

    if (error) {
        toast({ variant: "destructive", title: 'Error updating task', description: error.message });
    } else {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
      );
      if (!task.completed && task.watchlist_item_id) {
        markAsWatched(task.watchlist_item_id);
      }
    }
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
        toast({ variant: "destructive", title: 'Error deleting task', description: error.message });
    }
    else {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast({ title: "Task Removed", description: "Deleted successfully.", variant: "destructive" });
    }
  };

  const addPhoto = async (id: string, uri: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const newPhotos = [...(task.photos || []), uri];
    const { error } = await supabase.from('tasks').update({ photos: newPhotos }).eq('id', id);

    if (error) {
        toast({ variant: "destructive", title: 'Error adding photo', description: error.message });
    }
    else {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, photos: newPhotos } : t))
      );
      toast({ title: "Memory Added!", description: "Photo added." });
    }
  };

  return (
    <TaskContext.Provider value={{ tasks, isLoading, addTask, toggleComplete, deleteTask, addPhoto }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (!context) throw new Error('useTasks must be used within a TaskProvider');
  return context;
}
