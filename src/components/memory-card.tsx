'use client';

import type { Task } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { format } from 'date-fns';
import { CalendarDays, User, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { Button } from './ui/button';

export function MemoryCard({ task, onDelete }: { task: Task, onDelete: (id: string) => void }) {
  const creatorAvatarUrl = task.createdBy === 'Tamara' ? '/img/tamara.png' : '/img/carlos.png';

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
          <div>
            <CardTitle className="font-headline text-2xl">{task.title}</CardTitle>
            <CardDescription>{task.description}</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(task.id)}
            aria-label={`Delete memory "${task.title}"`}
            className="text-muted-foreground hover:text-destructive shrink-0"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
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
                        <AvatarImage src={creatorAvatarUrl} alt={task.createdBy} />
                        <AvatarFallback>{task.createdBy.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{task.createdBy}</span>
                </div>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {task.photos && task.photos.length > 0 ? (
          <Carousel className="w-full" opts={{ loop: true }}>
            <CarouselContent className="-ml-4">
              {task.photos.map((photo, index) => (
                <CarouselItem key={index} className="pl-4 md:basis-1/2 lg:basis-1/3">
                  <div className="relative aspect-video">
                    <Image 
                      src={photo} 
                      alt={`Memory photo ${index + 1}`}
                      fill
                      className="rounded-lg object-contain"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {task.photos.length > 1 && (
                <>
                    <CarouselPrevious className="absolute left-2" />
                    <CarouselNext className="absolute right-2" />
                </>
            )}
          </Carousel>
        ) : (
            <p className="text-sm text-muted-foreground">No photos for this memory yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
