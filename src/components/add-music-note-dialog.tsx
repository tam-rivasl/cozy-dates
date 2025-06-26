'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import type { MusicNote } from '@/lib/types';

interface AddMusicNoteDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddItem: (item: Omit<MusicNote, 'id' | 'addedBy'>) => void;
}

const itemSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title is too long'),
  notes: z.string().min(1, 'A dedication note is required.').max(500, 'Note is too long'),
  playlistUrl: z.string().url({ message: "Please enter a valid playlist URL." }),
});

type ItemFormValues = z.infer<typeof itemSchema>;

export function AddMusicNoteDialog({ isOpen, onOpenChange, onAddItem }: AddMusicNoteDialogProps) {
  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      title: '',
      notes: '',
      playlistUrl: '',
    },
  });

  const onSubmit = (data: ItemFormValues) => {
    onAddItem(data);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a Musical Note</DialogTitle>
          <DialogDescription>
            Share a playlist with a special someone.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Songs that remind me of you" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Dedication</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Write a sweet message..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="playlistUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Playlist Link</FormLabel>
                  <FormControl>
                    <Input placeholder="https://open.spotify.com/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Add Dedication</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
