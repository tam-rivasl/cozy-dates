'use client';

import type { WatchlistItem } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trash2, User as UserIcon, Clapperboard, Tv, StickyNote, CalendarPlus } from 'lucide-react';

interface WatchlistItemCardProps {
  item: WatchlistItem;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
  onPlanMovieNight: (item: WatchlistItem) => void;
}

export function WatchlistItemCard({ item, onToggleStatus, onDelete, onPlanMovieNight }: WatchlistItemCardProps) {
  const creatorAvatarUrl = item.addedBy === 'Tamara' ? '/tamara.svg' : '/carlos.jpg';
  const isWatched = item.status === 'Watched';

  return (
    <Card className={`transition-all duration-300 ${isWatched ? 'bg-card/60' : 'bg-card'}`}>
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-center space-x-3">
             <Checkbox
                id={`item-${item.id}`}
                checked={isWatched}
                onCheckedChange={() => onToggleStatus(item.id)}
                aria-label={`Mark "${item.title}" as ${isWatched ? 'to watch' : 'watched'}`}
                className="w-6 h-6"
              />
            <CardTitle className={`text-xl font-headline ${isWatched ? 'line-through text-muted-foreground' : ''}`}>
              {item.title}
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(item.id)}
            aria-label={`Delete item "${item.title}"`}
            className="text-muted-foreground hover:text-destructive shrink-0"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
         <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center">
              {item.type === 'Movie' ? <Clapperboard className="mr-2 h-4 w-4" /> : <Tv className="mr-2 h-4 w-4" />}
              <Badge variant="secondary">{item.type}</Badge>
            </div>
            <div className="flex items-center">
              <UserIcon className="mr-2 h-4 w-4" />
               <div className="flex items-center gap-2">
                <span>Added by:</span>
                <Avatar className="h-6 w-6">
                  <AvatarImage src={creatorAvatarUrl} alt={item.addedBy} />
                  <AvatarFallback>{item.addedBy.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{item.addedBy}</span>
              </div>
            </div>
          </div>

          {item.notes && (
            <div className="pt-2 border-t">
                <h4 className="flex items-center text-sm font-medium mb-1">
                    <StickyNote className="mr-2 h-4 w-4 text-primary/80" />
                    Notes
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap pl-6">{item.notes}</p>
            </div>
          )}

          {item.status === 'To Watch' && (
            <div className="pt-3 mt-3 border-t">
              <Button variant="outline" size="sm" className="w-full" onClick={() => onPlanMovieNight(item)}>
                  <CalendarPlus className="mr-2 h-4 w-4" />
                  Plan Movie Night
              </Button>
            </div>
          )}
      </CardContent>
    </Card>
  );
}
