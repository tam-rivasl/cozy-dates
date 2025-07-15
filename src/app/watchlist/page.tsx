
'use client';

import { useState, useMemo } from 'react';
import type { WatchlistItem, Task } from '@/lib/types';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { AddWatchlistItemDialog } from '@/components/add-watchlist-item-dialog';
import { WatchlistItemCard } from '@/components/watchlist-item-card';
import { Film, PlusCircle, Loader2, Video } from 'lucide-react';
import { AddTaskDialog } from '@/components/add-task-dialog';

// Mock Data - Replace with your local data fetching logic
const mockWatchlistItems: WatchlistItem[] = [
    { id: '1', title: 'The Bear', type: 'Series', status: 'To Watch', notes: 'Heard great things!', added_by: 'Tamara', user_id: '1', created_at: new Date().toISOString() },
    { id: '2', title: 'Dune: Part Two', type: 'Movie', status: 'To Watch', notes: 'Let\'s see it on a big screen.', added_by: 'Carlos', user_id: '2', created_at: new Date().toISOString() },
    { id: '3', title: 'Shōgun', type: 'Series', status: 'Watched', notes: 'Amazing cinematography.', added_by: 'Carlos', user_id: '2', created_at: new Date().toISOString() },
];


export default function WatchlistPage() {
    const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>(mockWatchlistItems);
    const [isLoading, setIsLoading] = useState(false);
    const [isAddDialogOpen, setAddDialogOpen] = useState(false);
    
    const [isAddPlanDialogOpen, setAddPlanDialogOpen] = useState(false);
    const [initialPlanData, setInitialPlanData] = useState<any>();

    const addWatchlistItem = async (item: Omit<WatchlistItem, 'id' | 'status' | 'added_by' | 'user_id' | 'created_at'>) => {
        const newItem: WatchlistItem = {
            ...item,
            id: Math.random().toString(),
            status: 'To Watch',
            added_by: 'CurrentUser', // Replace with actual user
            user_id: '1', // Replace with actual user ID
            created_at: new Date().toISOString(),
        };
        setWatchlistItems(prev => [newItem, ...prev]);
    };

    const deleteWatchlistItem = async (id: string) => {
        setWatchlistItems(prev => prev.filter(i => i.id !== id));
    };

    const addTask = async (task: Omit<Task, 'id' | 'completed' | 'created_by' | 'photos'| 'user_id' | 'created_at'>) => {
        console.log("Adding movie night task:", task);
        // This is where you'd call your local API to add the task
        // and potentially mark the watchlist item as watched.
    };

    const handlePlanMovieNight = (item: WatchlistItem) => {
        setInitialPlanData({
            title: `Watch "${item.title}"`,
            description: `Movie night for ${item.title}.`,
            notes: item.notes,
            category: 'Movie Day',
            watchlist_item_id: item.id,
        });
        setAddPlanDialogOpen(true);
    };

    const { toWatchItems, watchedItems } = useMemo(() => {
        const toWatch = watchlistItems.filter((item) => item.status === 'To Watch');
        const watched = watchlistItems.filter((item) => item.status === 'Watched');
        return { toWatchItems: toWatch, watchedItems: watched };
    }, [watchlistItems]);


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
