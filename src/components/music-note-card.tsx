'use client';

import type { MusicNote } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trash2, User, ExternalLink, MessageSquareQuote } from 'lucide-react';

interface MusicNoteCardProps {
  note: MusicNote;
  onDelete: (id: string) => void;
}

export function MusicNoteCard({ note, onDelete }: MusicNoteCardProps) {
  const creatorAvatarUrl = note.addedBy === 'Tamara' ? '/tamara.svg' : '/carlos.svg';

  return (
    <Card>
        <CardHeader>
            <div className="flex justify-between items-start gap-4">
                <CardTitle className="font-headline text-xl">{note.title}</CardTitle>
                 <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(note.id)}
                    aria-label={`Delete note "${note.title}"`}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                >
                    <Trash2 className="h-5 w-5" />
                </Button>
            </div>
             <div className="flex items-center pt-2">
                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Dedicated by:</span>
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={creatorAvatarUrl} alt={note.addedBy} />
                        <AvatarFallback>{note.addedBy.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{note.addedBy}</span>
                </div>
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
             <div className="border-l-4 border-accent pl-4 py-2 bg-accent/20 rounded-r-md">
                <div className="flex items-start gap-3">
                    <MessageSquareQuote className="h-5 w-5 text-accent-foreground/60 mt-1 flex-shrink-0" />
                    <blockquote className="italic text-accent-foreground/90">
                        "{note.notes}"
                    </blockquote>
                </div>
            </div>
            <Button asChild>
                <a href={note.playlistUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2" />
                    Open Playlist
                </a>
            </Button>
        </CardContent>
    </Card>
  );
}
