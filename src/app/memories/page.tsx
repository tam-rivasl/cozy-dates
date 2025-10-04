'use client';

import { useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookHeart, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useTasks } from '@/context/TaskContext';
import { useUser } from '@/context/UserContext';
import { Header } from '@/components/header';
import { MemoryCard } from '@/components/memory-card';
import { PageHeading } from '@/components/page-heading';

export default function MemoriesPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const { tasks, isLoading: areTasksLoading, deleteTask } = useTasks();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const memories = useMemo(
    () =>
      tasks
        .filter((task) => task.completed && task.photos && task.photos.length > 0)
        .sort((a, b) => b.date.getTime() - a.date.getTime()),
    [tasks],
  );

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
          icon={BookHeart}
          title="Our Sweet Memories"
          description="Revisit the dates you have dreamt up together and relive every captured moment."
        />

        {memories.length > 0 ? (
          <AnimatePresence>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {memories.map((task, index) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, delay: index * 0.06 }}
                  whileHover={{ y: -4, scale: 1.005 }}
                >
                  <MemoryCard task={task} onDelete={deleteTask} />
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border/60 bg-card/60 p-12 text-center shadow-inner"
          >
            <BookHeart className="h-16 w-16 text-muted-foreground" />
            <p className="text-lg font-medium text-foreground">No memories with photos yet.</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Complete a plan and add your favourite photos to keep the sweetest stories in one place.
            </p>
          </motion.div>
        )}
      </motion.main>
    </div>
  );
}

