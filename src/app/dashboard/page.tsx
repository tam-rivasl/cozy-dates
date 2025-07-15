
'use client';

import { useState, useMemo } from 'react';
import type { Task } from '@/lib/types';
import { Header } from '@/components/header';
import { AddTaskDialog } from '@/components/add-task-dialog';
import { TaskCard } from '@/components/task-card';
import { Button } from '@/components/ui/button';
import { PlusCircle, ClipboardList, Loader2 } from 'lucide-react';
import { GoalsSummary } from '@/components/goals-summary';
import { DateSuggester } from '@/components/date-suggester';

// Mock Data - Replace with your local data fetching logic
const mockTasks: Task[] = [
    { id: '1', title: 'Romantic Dinner', description: 'Cook a fancy dinner together.', date: new Date('2024-08-10T19:00:00'), category: 'Date Night', priority: 'High', completed: false, created_by: 'Tamara', user_id: '1', created_at: new Date().toISOString(), photos: [] },
    { id: '2', title: 'Watch a new movie', description: 'Find something on the watchlist.', date: new Date('2024-08-15T21:00:00'), category: 'Movie Day', priority: 'Medium', completed: false, created_by: 'Carlos', user_id: '2', created_at: new Date().toISOString(), photos: [] },
    { id: '3', title: 'Weekend Getaway Planning', description: 'Plan our trip to the mountains.', date: new Date('2024-08-20T10:00:00'), category: 'Travel Plans', priority: 'High', completed: false, created_by: 'Tamara', user_id: '1', created_at: new Date().toISOString(), photos: [] },
    { id: '4', title: 'Picnic in the Park', description: 'Enjoy the sunny weather.', date: new Date('2024-07-20T13:00:00'), category: 'Date Night', priority: 'Medium', completed: true, created_by: 'Carlos', user_id: '2', created_at: new Date().toISOString(), photos: ['https://placehold.co/600x400.png'] },
];

export default function DashboardPage() {
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [isLoading, setIsLoading] = useState(false);


  const addTask = async (task: Omit<Task, 'id' | 'completed' | 'created_by' | 'photos' | 'user_id' | 'created_at'>) => {
    console.log("Adding task:", task);
    // Here you would typically call your local API to add a task
    const newTask: Task = {
        ...task,
        id: Math.random().toString(36).substring(2, 9),
        completed: false,
        created_by: 'CurrentUser', // Replace with actual user
        photos: [],
        user_id: '1', // Replace with actual user ID
        created_at: new Date().toISOString(),
    };
    setTasks(prev => [newTask, ...prev]);
  };

  const toggleComplete = async (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };
  
  const addPhoto = async (id: string, photoDataUri: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, photos: [...(t.photos || []), photoDataUri] };
      }
      return t;
    }));
  };

  const { upcomingTasks, completedTasks } = useMemo(() => {
    const upcoming = tasks
      .filter((task) => !task.completed)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    const completed = tasks
      .filter((task) => task.completed)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    return { upcomingTasks: upcoming, completedTasks: completed };
  }, [tasks]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 p-4 md:p-8">
        <div className="flex flex-col items-start gap-4 mb-6 sm:flex-row sm:justify-between sm:items-center">
          <h1 className="text-3xl md:text-4xl font-headline">Our Shared Plans</h1>
          <div className="flex gap-2">
            <DateSuggester />
            <Button onClick={() => setAddDialogOpen(true)}>
              <PlusCircle className="mr-2" />
              Add Plan
            </Button>
          </div>
        </div>

        <AddTaskDialog
          isOpen={isAddDialogOpen}
          onOpenChange={setAddDialogOpen}
          onAddTask={addTask}
        />
        
        <div className="mb-8">
          <GoalsSummary tasks={tasks} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-4">
            <h2 className="text-2xl font-headline text-primary">Upcoming Dates & Plans</h2>
            {upcomingTasks.length > 0 ? (
              <div className="space-y-4">
                {upcomingTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggleComplete={toggleComplete}
                    onDelete={deleteTask}
                    onAddPhoto={addPhoto}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 px-6 bg-card rounded-lg shadow-sm">
                 <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">No upcoming plans. Time to add something fun!</p>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-headline text-primary/80">Sweet Memories</h2>
             {completedTasks.length > 0 ? (
              <div className="space-y-4">
                {completedTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggleComplete={toggleComplete}
                    onDelete={deleteTask}
                    onAddPhoto={addPhoto}
                  />
                ))}
              </div>
            ) : (
               <div className="text-center py-12 px-6 bg-card rounded-lg shadow-sm">
                <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">No completed tasks yet. Let's make some memories!</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
