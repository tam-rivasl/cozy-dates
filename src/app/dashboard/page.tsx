
'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Task } from '@/lib/types';
import { Header } from '@/components/header';
import { AddTaskDialog } from '@/components/add-task-dialog';
import { TaskCard } from '@/components/task-card';
import { Button } from '@/components/ui/button';
import { PlusCircle, ClipboardList, Loader2 } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import { GoalsSummary } from '@/components/goals-summary';
import { useTasks } from '@/context/TaskContext';
import { DateSuggester } from '@/components/date-suggester';

export default function DashboardPage() {
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const { user, isLoading: isUserLoading } = useUser();
  const { tasks, isLoading: areTasksLoading, addTask, toggleComplete, deleteTask, addPhoto } = useTasks();
  const router = useRouter();

  const { upcomingTasks, completedTasks } = useMemo(() => {
    const upcoming = tasks
      .filter((task) => !task.completed)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    const completed = tasks
      .filter((task) => task.completed)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    return { upcomingTasks: upcoming, completedTasks: completed };
  }, [tasks]);

  if (isUserLoading || areTasksLoading || !user) {
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
