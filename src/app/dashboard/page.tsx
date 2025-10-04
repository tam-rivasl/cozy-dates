'use client';

import { useState, useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarHeart, ClipboardList, Loader2, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Header } from '@/components/header';
import { AddTaskDialog } from '@/components/add-task-dialog';
import { TaskCard } from '@/components/task-card';
import { Button } from '@/components/ui/button';
import { useUser } from '@/context/UserContext';
import { GoalsSummary } from '@/components/goals-summary';
import { useTasks } from '@/context/TaskContext';
import { PageHeading } from '@/components/page-heading';

export default function DashboardPage() {
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const { user, isLoading: isUserLoading } = useUser();
  const { tasks, isLoading: areTasksLoading, addTask, toggleComplete, deleteTask, addPhoto } = useTasks();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_rgba(215,204,230,0.35),_transparent_60%)]">
      <Header />
      <motion.main
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="container flex-1 space-y-8 pb-12 pt-8"
      >
        <PageHeading
          icon={CalendarHeart}
          title="Our Shared Plans"
          description="Organize upcoming adventures, celebrate big wins and keep every shared plan sparkling."
          actions={
            <Button size="lg" onClick={() => setAddDialogOpen(true)}>
              <Sparkles className="mr-2 h-4 w-4" />
              Add Plan
            </Button>
          }
        />

        <AddTaskDialog isOpen={isAddDialogOpen} onOpenChange={setAddDialogOpen} onAddTask={addTask} />

        <motion.section
          layout
          className="rounded-3xl border border-border/40 bg-card/60 p-6 shadow-lg shadow-primary/5 backdrop-blur"
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20%' }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <GoalsSummary tasks={tasks} />
          </motion.div>
        </motion.section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <section className="space-y-4">
            <motion.h2
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-30%' }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="text-2xl font-headline text-primary"
            >
              Upcoming Dates & Plans
            </motion.h2>
            {upcomingTasks.length > 0 ? (
              <AnimatePresence initial={false}>
                {upcomingTasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ y: -4, scale: 1.01 }}
                  >
                    <TaskCard
                      task={task}
                      onToggleComplete={toggleComplete}
                      onDelete={deleteTask}
                      onAddPhoto={addPhoto}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border/60 bg-card/50 p-10 text-center shadow-inner"
              >
                <ClipboardList className="h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium text-foreground">No upcoming plans yet.</p>
                <p className="text-sm text-muted-foreground">
                  Dream up your next date idea and add it with the button above.
                </p>
              </motion.div>
            )}
          </section>

          <section className="space-y-4">
            <motion.h2
              initial={{ opacity: 0, x: 12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-30%' }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="text-2xl font-headline text-primary/80"
            >
              Sweet Memories
            </motion.h2>
            {completedTasks.length > 0 ? (
              <AnimatePresence initial={false}>
                {completedTasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ y: -4, scale: 1.01 }}
                  >
                    <TaskCard
                      task={task}
                      onToggleComplete={toggleComplete}
                      onDelete={deleteTask}
                      onAddPhoto={addPhoto}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border/60 bg-card/50 p-10 text-center shadow-inner"
              >
                <ClipboardList className="h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium text-foreground">No memories just yet.</p>
                <p className="text-sm text-muted-foreground">
                  Mark a plan as complete and add a photo to celebrate it here.
                </p>
              </motion.div>
            )}
          </section>
        </div>
      </motion.main>
    </div>
  );
}
