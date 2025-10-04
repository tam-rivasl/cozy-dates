'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Task } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Carousel, CarouselApi, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { format } from 'date-fns';
import { CalendarDays, User, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from './ui/button';
import { getProfileAvatarSrc, getProfileDisplayName } from '@/lib/profile';

export function MemoryCard({ task, onDelete }: { task: Task; onDelete: (id: string) => Promise<void> }) {
  const creatorName = getProfileDisplayName(task.createdBy);
  const creatorAvatarUrl = getProfileAvatarSrc(task.createdBy);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isLightboxOpen, setLightboxOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [lightboxApi, setLightboxApi] = useState<CarouselApi | null>(null);

  const handleConfirmDelete = async () => {
    await onDelete(task.id);
    setDeleteDialogOpen(false);
  };

  const openLightboxAt = useCallback((index: number) => {
    setActiveSlide(index);
    setLightboxOpen(true);
  }, []);

  const previewPhotos = useMemo(() => task.photos.slice(0, 4), [task.photos]);

  useEffect(() => {
    if (isLightboxOpen && lightboxApi) {
      lightboxApi.scrollTo(activeSlide, true);
    }
  }, [isLightboxOpen, lightboxApi, activeSlide]);

  useEffect(() => {
    if (!lightboxApi) return;

    const handleSelect = () => setActiveSlide(lightboxApi.selectedScrollSnap());
    lightboxApi.on('select', handleSelect);
    return () => {
      lightboxApi.off('select', handleSelect);
    };
  }, [lightboxApi]);

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
        {task.photos && task.photos.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {previewPhotos.map((photo, index) => {
                const isOverflowTile = index === previewPhotos.length - 1 && task.photos.length > previewPhotos.length;
                return (
                  <button
                    key={photo}
                    type="button"
                    onClick={() => openLightboxAt(index)}
                    className="group relative h-40 w-full overflow-hidden rounded-2xl border border-border/40 bg-muted/30 transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Image
                      src={photo}
                      alt={`Memory photo ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 90vw"
                    />
                    <span className="sr-only">View memory photo {index + 1}</span>
                    {isOverflowTile && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-lg font-semibold text-white">
                        +{task.photos.length - previewPhotos.length}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <Dialog open={isLightboxOpen} onOpenChange={setLightboxOpen}>
              <DialogContent className="max-w-4xl w-full border-none bg-background/95 p-6 sm:rounded-3xl shadow-2xl">
                <Carousel className="w-full" opts={{ loop: true }} setApi={setLightboxApi}>
                  <CarouselContent className="-ml-0">
                    {task.photos.map((photo, index) => (
                      <CarouselItem key={`${photo}-modal`} className="flex justify-center">
                        <div className="relative h-[60vh] w-full max-w-3xl">
                          <Image
                            src={photo}
                            alt={`Memory photo ${index + 1}`}
                            fill
                            className="object-contain rounded-2xl"
                            sizes="100vw"
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {task.photos.length > 1 && (
                    <>
                      <CarouselPrevious className="left-6 top-1/2 -translate-y-1/2" />
                      <CarouselNext className="right-6 top-1/2 -translate-y-1/2" />
                    </>
                  )}
                </Carousel>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No photos for this memory yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
