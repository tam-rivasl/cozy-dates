'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Music, PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useUser } from '@/context/UserContext';
import { useMusic } from '@/context/MusicContext';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { AddMusicNoteDialog } from '@/components/add-music-note-dialog';
import { MusicNoteCard } from '@/components/music-note-card';
import { PageHeading } from '@/components/page-heading';

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
          icon={Music}
          title="Musical Notes & Dedications"
          description="Collect the songs, dedications and playlists that soundtrack your love story."
          actions={
            <Button size="lg" onClick={() => setAddDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Dedication
            </Button>
          }
        />

        <AddMusicNoteDialog
          isOpen={isAddDialogOpen}
          onOpenChange={setAddDialogOpen}
          onAddItem={addMusicNote}
        />

        {musicNotes.length > 0 ? (
          <AnimatePresence initial={false}>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {musicNotes.map((note, index) => (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileHover={{ y: -4, scale: 1.01 }}
                >
                  <MusicNoteCard note={note} onDelete={deleteMusicNote} />
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border/60 bg-card/60 p-12 text-center shadow-inner"
          >
            <Music className="h-14 w-14 text-muted-foreground" />
            <p className="text-lg font-medium text-foreground">No musical dedications yet.</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Add a note and share a playlist to set the mood for your next date.
            </p>
          </motion.div>
        )}
      </motion.main>
    </div>
  );
}
