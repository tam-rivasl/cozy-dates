'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import type { Task } from '@/lib/types';
import { useUser } from '@/context/UserContext';
import { useToast } from "@/hooks/use-toast";

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

  useEffect(() => {
    try {
      const storedTasks = localStorage.getItem('cozy-tasks');
      if (storedTasks) {
        const parsedTasks = JSON.parse(storedTasks).map((task: Task) => ({
            ...task,
            date: new Date(task.date),
        }));
        setTasks(parsedTasks);
      } else {
        setTasks(initialTasks);
      }
    } catch (e) {
      setTasks(initialTasks);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem('cozy-tasks', JSON.stringify(tasks));
      } catch (e) {
        // LocalStorage not available
      }
    }
  }, [tasks, isLoading]);

  const addTask = (newTask: Omit<Task, 'id' | 'completed' | 'createdBy' | 'photos'>) => {
    if (!user) return;
    const taskWithId: Task = {
      ...newTask,
      id: crypto.randomUUID(),
      completed: false,
      createdBy: user,
      photos: [],
    };
    setTasks((prev) => [taskWithId, ...prev]);
    toast({
      title: "Task Added!",
      description: `"${newTask.title}" has been added to your list.`,
    })
  };

  const toggleComplete = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const deleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
     toast({
      title: "Task Removed",
      description: "The task has been deleted.",
      variant: "destructive"
    })
  };

  const addPhoto = (taskId: string, photoDataUri: string) => {
    setTasks(prev =>
      prev.map(task => {
        if (task.id === taskId) {
          return { ...task, photos: [...(task.photos || []), photoDataUri] };
        }
        return task;
      })
    );
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
