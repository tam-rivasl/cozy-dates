
'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import { useMusic } from '@/context/MusicContext';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { AddMusicNoteDialog } from '@/components/add-music-note-dialog';
import { MusicNoteCard } from '@/components/music-note-card';
import { Music, PlusCircle, Loader2 } from 'lucide-react';

export default function MusicPage() {
    const { user, isLoading: isUserLoading } = useUser();
    const { musicNotes, isLoading: areNotesLoading, addMusicNote, deleteMusicNote } = useMusic();
    const router = useRouter();
    const [isAddDialogOpen, setAddDialogOpen] = useState(false);

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/');
        }
    }, [user, isUserLoading, router]);

    if (isUserLoading || areNotesLoading || !user) {
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
                        <Music className="h-10 w-10 text-primary" />
                        <h1 className="text-3xl md:text-4xl font-headline">Musical Notes & Dedications</h1>
                    </div>
                    <Button onClick={() => setAddDialogOpen(true)}>
                        <PlusCircle className="mr-2" />
                        Add Dedication
                    </Button>
                </div>

                <AddMusicNoteDialog
                    isOpen={isAddDialogOpen}
                    onOpenChange={setAddDialogOpen}
                    onAddItem={addMusicNote}
                />

                {musicNotes.length > 0 ? (
                    <div className="space-y-6">
                        {musicNotes.map(note => (
                            <MusicNoteCard 
                                key={note.id}
                                note={note}
                                onDelete={deleteMusicNote}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 px-6 bg-card rounded-lg shadow-sm mt-8">
                        <Music className="mx-auto h-16 w-16 text-muted-foreground" />
                        <p className="mt-4 text-muted-foreground text-lg">No musical dedications yet.</p>
                        <p className="mt-2 text-muted-foreground">Add a note and a playlist to share a special song!</p>
                    </div>
                )}
            </main>
        </div>
    );
}
