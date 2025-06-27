'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import type { Task } from '@/lib/types';
import { useUser } from '@/context/UserContext';
import { useToast } from "@/hooks/use-toast";
import { useWatchlist } from './WatchlistContext';
import { supabase } from '@/lib/supabaseClient';

interface TaskContextType {
  tasks: Task[];
  isLoading: boolean;
  addTask: (task: Omit<Task, 'id' | 'completed' | 'createdBy' | 'photos'>) => void;
  toggleComplete: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
  addPhoto: (taskId: string, photoDataUri: string) => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

const today = new Date();
const initialTasks: Task[] = [
  {
    id: '1',
    title: 'Movie Night: "La La Land"',
    description: 'Get popcorn, blankets, and enjoy a classic romantic movie at home.',
    date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 20, 30),
    category: 'Date Night',
    priority: 'Medium',
    completed: false,
    createdBy: 'Tamara',
    photos: [],
    notes: 'Remember to buy the extra buttery popcorn!',
  },
  {
    id: '2',
    title: 'Plan Summer Vacation',
    description: 'Research destinations in Italy. Look up flights and hotels.',
    date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7, 18, 0),
    category: 'Travel Plans',
    priority: 'High',
    completed: false,
    createdBy: 'Carlos',
    photos: [],
    notes: 'Focus on Tuscany region.',
  },
  {
    id: '3',
    title: 'Cook Dinner Together',
    description: 'Try that new pasta recipe we found.',
    date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 19, 0),
    category: 'To-Do',
    priority: 'Medium',
    completed: false,
    createdBy: 'Tamara',
    photos: [],
  },
  {
    id: '4',
    title: 'Anniversary Dinner',
    description: 'Celebrate our 5th anniversary at the fancy restaurant downtown.',
    date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30, 19, 30),
    category: 'Special Event',
    priority: 'High',
    completed: true,
    createdBy: 'Carlos',
    photos: ['https://placehold.co/600x400.png'],
  },
];


export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useUser();
  const { toast } = useToast();
  const { markAsWatched } = useWatchlist();

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const { data, error } = await supabase.from('tasks').select('*');
      if (error) {
        console.error('Failed to load tasks', error);
        setTasks(initialTasks);
      } else {
        const parsed = data.map((t: any) => ({ ...t, date: new Date(t.date) }));
        setTasks(parsed);
      }
      setIsLoading(false);
    }
    load();
  }, []);


  const addTask = async (newTask: Omit<Task, 'id' | 'completed' | 'createdBy' | 'photos'>) => {
    if (!user) return;
    const taskWithId: Task = {
      ...newTask,
      id: crypto.randomUUID(),
      completed: false,
      createdBy: user,
      photos: [],
    };
    setTasks((prev) => [taskWithId, ...prev]);
    await supabase.from('tasks').insert(taskWithId);
    toast({
      title: "Task Added!",
      description: `"${newTask.title}" has been added to your list.`,
    });
  };

  const toggleComplete = async (taskId: string) => {
    const taskToUpdate = tasks.find((task) => task.id === taskId);

    if (taskToUpdate && !taskToUpdate.completed && taskToUpdate.watchlistItemId) {
      markAsWatched(taskToUpdate.watchlistItemId);
    }

    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );

    await supabase
      .from('tasks')
      .update({ completed: !taskToUpdate?.completed })
      .eq('id', taskId);
  };

  const deleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    await supabase.from('tasks').delete().eq('id', taskId);
    toast({
      title: "Task Removed",
      description: "The task has been deleted.",
      variant: "destructive"
    });
  };

  const addPhoto = async (taskId: string, photoDataUri: string) => {
    setTasks(prev => {
      const newTasks = prev.map(task => {
        if (task.id === taskId) {
          return { ...task, photos: [...(task.photos || []), photoDataUri] };
        }
        return task;
      });
      return newTasks;
    });
    const task = tasks.find(t => t.id === taskId);
    const photos = task ? [...(task.photos || []), photoDataUri] : [photoDataUri];
    await supabase.from('tasks').update({ photos }).eq('id', taskId);
    toast({
      title: "Memory Added!",
      description: "A new photo has been added to your plan.",
    });
  };
  
  return (
    <TaskContext.Provider value={{ tasks, isLoading, addTask, toggleComplete, deleteTask, addPhoto }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
}
