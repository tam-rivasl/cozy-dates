'use client';

import { useState, useEffect } from 'react';
import type { Task, Profile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { format } from 'date-fns';
import { CalendarDays, User, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { Button } from './ui/button';

// Mock data - replace with your local data fetching
const mockProfiles: { [key: string]: Profile } = {
  'Tamara': { id: '1', username: 'Tamara', avatar_url: 'https://placehold.co/100x100.png', updated_at: '', partner_id: '2' },
  'Carlos': { id: '2', username: 'Carlos', avatar_url: 'https://placehold.co/100x100.png', updated_at: '', partner_id: '1' },
  'CurrentUser': { id: '1', username: 'Tamara', avatar_url: 'https://placehold.co/100x100.png', updated_at: '', partner_id: '2' },
};

export function MemoryCard({ task, onDelete }: { task: Task, onDelete: (id: string) => void }) {
  const [createdByProfile, setCreatedByProfile] = useState<Profile | null>(null);
  
  // This would be your auth user's profile
  const profile = mockProfiles['CurrentUser'];

  useEffect(() => {
    // In a real app, you might fetch this profile if it's not already loaded
    setCreatedByProfile(mockProfiles[task.created_by] || null);
  }, [task.created_by]);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
          <div>
            <CardTitle className="font-headline text-2xl">{task.title}</CardTitle>
            <CardDescription>{task.description}</CardDescription>
          </div>
          { task.created_by === profile?.username &&
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(task.id)}
              aria-label={`Delete memory "${task.title}"`}
              className="text-muted-foreground hover:text-destructive shrink-0"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          }
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
                        <AvatarImage src={createdByProfile?.avatar_url} alt={task.created_by} />
                        <AvatarFallback>{task.created_by.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{task.created_by}</span>
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
