'use client';

import { useRef, useState } from 'react';
import type { Task } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarDays, Tag, Flag, Trash2, User, Camera } from 'lucide-react';
import { format } from 'date-fns';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { getProfileAvatarSrc, getProfileDisplayName } from '@/lib/profile';

interface TaskCardProps {
  task: Task;
  onToggleComplete: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddPhoto: (id: string, photoDataUri: string) => Promise<void>;
}

export function TaskCard({ task, onToggleComplete, onDelete, onAddPhoto }: TaskCardProps) {
  const priorityColors = {
    High: 'bg-red-500/80 hover:bg-red-500',
    Medium: 'bg-yellow-500/80 hover:bg-yellow-500',
    Low: 'bg-green-500/80 hover:bg-green-500',
  } as const;

  const creatorName = getProfileDisplayName(task.createdBy);
  const creatorAvatarUrl = getProfileAvatarSrc(task.createdBy);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleAddPhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleConfirmDelete = async () => {
    await onDelete(task.id);
    setDeleteDialogOpen(false);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Invalid File Type',
        description: 'Please upload an image file (e.g., JPG, PNG, GIF).',
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUri = reader.result as string;
      await onAddPhoto(task.id, dataUri);
    };
    reader.readAsDataURL(file);

    if (event.target) {
      event.target.value = '';
    }
  };

  return (
    <Card className={`transition-all duration-300 ${task.completed ? 'bg-card/60 dark:bg-card/40' : 'bg-card'}`}>
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-center space-x-3">
            <Checkbox
              id={`task-${task.id}`}
              checked={task.completed}
              onCheckedChange={() => onToggleComplete(task.id)}
              aria-label={`Mark "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`}
              className="w-6 h-6"
            />
            <CardTitle className={`text-xl font-headline ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
              {task.title}
            </CardTitle>
          </div>
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={'Delete task "' + task.title + '"'}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove this plan?</AlertDialogTitle>
                <AlertDialogDescription>
                  {'Esta acción no se puede deshacer y eliminará "' + task.title + '" de forma permanente.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDelete}>Eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        {task.description && (
          <CardDescription className={`pt-2 ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
            {task.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <div className="flex items-center">
            <CalendarDays className="mr-2 h-4 w-4" />
            <span>{format(task.date, 'PPP p')}</span>
          </div>
          <div className="flex items-center">
            <Tag className="mr-2 h-4 w-4" />
            <Badge variant="secondary">{task.category}</Badge>
          </div>
          <div className="flex items-center">
            <Flag className="mr-2 h-4 w-4" />
            <Badge className={`${priorityColors[task.priority]} text-white`}>{task.priority}</Badge>
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

        {task.completed && (
          <div className="w-full pt-4 border-t">
            <div className="flex justify-between items-center w-full mb-2">
              <h4 className="text-sm font-medium">Memories</h4>
              <div>
                <Button variant="outline" size="sm" onClick={handleAddPhotoClick}>
                  <Camera className="mr-2 h-4 w-4" />
                  Add Photo
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>
            {task.photos && task.photos.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {task.photos.slice(0, 4).map((photo, index) => (
                  <div key={photo} className="relative aspect-square">
                    <Image
                      src={photo}
                      alt={`Memory ${index + 1}`}
                      width={100}
                      height={100}
                      className="rounded-md object-cover w-full h-full"
                    />
                    {index === 3 && task.photos.length > 4 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-md">
                        <span className="text-white font-bold text-lg">+{task.photos.length - 4}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No photos added yet.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


