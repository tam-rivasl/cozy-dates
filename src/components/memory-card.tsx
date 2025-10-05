'use client';

import { useState } from 'react';
import type { Task } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';
import { CalendarDays, User, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from './ui/button';
import { PhotoGallery } from '@/components/media/photo-gallery';
import { getProfileAvatarSrc, getProfileDisplayName } from '@/lib/profile';

export function MemoryCard({ task, onDelete }: { task: Task; onDelete: (id: string) => Promise<void> }) {
  const creatorName = getProfileDisplayName(task.createdBy);
  const creatorAvatarUrl = getProfileAvatarSrc(task.createdBy);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const handleConfirmDelete = async () => {
    await onDelete(task.id);
    setDeleteDialogOpen(false);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
          <div>
            <CardTitle className="font-headline text-2xl">{task.title}</CardTitle>
            <CardDescription>{task.description}</CardDescription>
          </div>
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete memory "${task.title}"`}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove this memory?</AlertDialogTitle>
                <AlertDialogDescription>
                  {'This action cannot be undone and will permanently remove "' + task.title + '".'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground pt-2">
          <div className="flex items-center">
            <CalendarDays className="mr-2 h-4 w-4" />
            <span>{format(task.date, 'PPP')}</span>
          </div>
          <div className="flex items-center">
            <User className="mr-2 h-4 w-4" />
            <div className="flex items-center gap-2">
              <span>Idea by:</span>
              <Avatar className="h-6 w-6">
                <AvatarImage src={creatorAvatarUrl} alt={creatorName} className="object-cover" />
                <AvatarFallback>{creatorName.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="font-medium">{creatorName}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <PhotoGallery
          photos={task.photos}
          altPrefix="Foto del recuerdo"
          emptyState={<p className="text-sm text-muted-foreground">No photos for this memory yet.</p>}
        />
      </CardContent>
    </Card>
  );
}
