'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Task } from '@/lib/types';
import { Header } from '@/components/header';
import { AddTaskDialog } from '@/components/add-task-dialog';
import { TaskCard } from '@/components/task-card';
import { Button } from '@/components/ui/button';
import { PlusCircle, ClipboardList, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import { GoalsSummary } from '@/components/goals-summary';

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
  },
];

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  const { upcomingTasks, completedTasks } = useMemo(() => {
    const upcoming = tasks
      .filter((task) => !task.completed)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    const completed = tasks
      .filter((task) => task.completed)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    return { upcomingTasks: upcoming, completedTasks: completed };
  }, [tasks]);


  const handleAddTask = (newTask: Omit<Task, 'id' | 'completed' | 'createdBy'>) => {
    if (!user) return;
    const taskWithId: Task = {
      ...newTask,
      id: crypto.randomUUID(),
      completed: false,
      createdBy: user,
    };
    setTasks((prev) => [...prev, taskWithId]);
    toast({
      title: "Task Added!",
      description: `"${newTask.title}" has been added to your list.`,
    })
  };
  
  const handleToggleComplete = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
     toast({
      title: "Task Removed",
      description: "The task has been deleted.",
      variant: "destructive"
    })
  };

  if (isLoading || !user) {
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl md:text-4xl font-headline">Our Shared Plans</h1>
          <Button onClick={() => setAddDialogOpen(true)}>
            <PlusCircle className="mr-2" />
            Add Plan
          </Button>
        </div>

        <AddTaskDialog
          isOpen={isAddDialogOpen}
          onOpenChange={setAddDialogOpen}
          onAddTask={handleAddTask}
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
                    onToggleComplete={handleToggleComplete}
                    onDelete={handleDeleteTask}
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
                    onToggleComplete={handleToggleComplete}
                    onDelete={handleDeleteTask}
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
