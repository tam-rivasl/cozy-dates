
'use client';

import { useMemo, useEffect } from 'react';
import { useTasks } from '@/context/TaskContext';
import { useUser } from '@/context/UserContext';
import { Header } from '@/components/header';
import { MemoryCard } from '@/components/memory-card';
import { BookHeart, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MemoriesPage() {
    const { user, isLoading: isUserLoading } = useUser();
    const { tasks, isLoading: areTasksLoading, deleteTask } = useTasks();
    const router = useRouter();

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/');
        }
    }, [user, isUserLoading, router]);

    const memories = useMemo(() => {
        return tasks
            .filter(task => task.completed && task.photos && task.photos.length > 0)
            .sort((a, b) => b.date.getTime() - a.date.getTime());
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
                <div className="flex items-center gap-4 mb-6">
                    <BookHeart className="h-10 w-10 text-primary" />
                    <h1 className="text-3xl md:text-4xl font-headline">Our Sweet Memories</h1>
                </div>

                {memories.length > 0 ? (
                    <div className="space-y-8">
                        {memories.map(task => (
                            <MemoryCard key={task.id} task={task} onDelete={deleteTask} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 px-6 bg-card rounded-lg shadow-sm mt-8">
                        <BookHeart className="mx-auto h-16 w-16 text-muted-foreground" />
                        <p className="mt-4 text-muted-foreground text-lg">No memories with photos yet.</p>
                        <p className="mt-2 text-muted-foreground">Complete a plan and add some photos to see them here!</p>
                    </div>
                )}
            </main>
        </div>
    );
}
