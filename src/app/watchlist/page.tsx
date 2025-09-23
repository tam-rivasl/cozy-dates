'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import { useWatchlist } from '@/context/WatchlistContext';
import { useTasks } from '@/context/TaskContext';
import type { WatchlistItem } from '@/lib/types';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { AddWatchlistItemDialog } from '@/components/add-watchlist-item-dialog';
import { WatchlistItemCard } from '@/components/watchlist-item-card';
import { Film, PlusCircle, Loader2, Video } from 'lucide-react';
import { AddTaskDialog } from '@/components/add-task-dialog';

type PlanSeed = {
  title?: string;
  description?: string;
  notes?: string;
  category?: 'Date Night' | 'Travel Plans' | 'To-Do' | 'Special Event' | 'Movie Day';
  priority?: 'High' | 'Medium' | 'Low';
  date?: Date;
  watchlistItemId?: string;
};

export default function WatchlistPage() {
    const { user, isLoading: isUserLoading } = useUser();
    const { watchlistItems, isLoading: areItemsLoading, addWatchlistItem, deleteWatchlistItem } = useWatchlist();
    const { addTask } = useTasks();
    const router = useRouter();
    const [isAddDialogOpen, setAddDialogOpen] = useState(false);

    const [isAddPlanDialogOpen, setAddPlanDialogOpen] = useState(false);
    const [initialPlanData, setInitialPlanData] = useState<PlanSeed | undefined>();

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/');
        }
    }, [user, isUserLoading, router]);

    const handlePlanMovieNight = (item: WatchlistItem) => {
        setInitialPlanData({
            title: item.title,
            description: 'Dia de pelis',
            notes: item.notes ?? '',
            category: 'Movie Day',
            watchlistItemId: item.id,
        });
        setAddPlanDialogOpen(true);
    };

    const { toWatchItems, watchedItems } = useMemo(() => {
        const toWatch = watchlistItems.filter((item) => item.status === 'To Watch');
        const watched = watchlistItems.filter((item) => item.status === 'Watched');
        return { toWatchItems: toWatch, watchedItems: watched };
    }, [watchlistItems]);


    if (isUserLoading || areItemsLoading || !user) {
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
                    <div className="flex items-center gap-4">
                        <Film className="h-10 w-10 text-primary" />
                        <h1 className="text-3xl md:text-4xl font-headline">Our Watchlist</h1>
                    </div>
                    <Button onClick={() => setAddDialogOpen(true)}>
                        <PlusCircle className="mr-2" />
                        Add Item
                    </Button>
                </div>
                
                <AddWatchlistItemDialog 
                    isOpen={isAddDialogOpen}
                    onOpenChange={setAddDialogOpen}
                    onAddItem={addWatchlistItem}
                />

                <AddTaskDialog 
                    isOpen={isAddPlanDialogOpen}
                    onOpenChange={setAddPlanDialogOpen}
                    onAddTask={addTask}
                    initialData={initialPlanData}
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div className="space-y-4">
                        <h2 className="text-2xl font-headline text-primary">To Watch</h2>
                        {toWatchItems.length > 0 ? (
                            <div className="space-y-4">
                                {toWatchItems.map((item) => (
                                    <WatchlistItemCard
                                        key={item.id}
                                        item={item}
                                        onDelete={deleteWatchlistItem}
                                        onPlanMovieNight={handlePlanMovieNight}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 px-6 bg-card rounded-lg shadow-sm">
                                <Video className="mx-auto h-12 w-12 text-muted-foreground" />
                                <p className="mt-4 text-muted-foreground">Nothing to watch yet. Add a movie or series!</p>
                            </div>
                        )}
                    </div>
                     <div className="space-y-4">
                        <h2 className="text-2xl font-headline text-primary/80">Watched</h2>
                         {watchedItems.length > 0 ? (
                            <div className="space-y-4">
                                {watchedItems.map((item) => (
                                    <WatchlistItemCard
                                        key={item.id}
                                        item={item}
                                        onDelete={deleteWatchlistItem}
                                        onPlanMovieNight={handlePlanMovieNight}
                                    />
                                ))}
                            </div>
                        ) : (
                           <div className="text-center py-12 px-6 bg-card rounded-lg shadow-sm">
                            <Video className="mx-auto h-12 w-12 text-muted-foreground" />
                            <p className="mt-4 text-muted-foreground">No movies or series watched yet.</p>
                          </div>
                        )}
                    </div>
                </div>

            </main>
        </div>
    );
}




