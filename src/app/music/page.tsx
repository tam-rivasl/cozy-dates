'use client';

import { useMemo, useEffect } from 'react';
import { useTasks } from '@/context/TaskContext';
import { useUser } from '@/context/UserContext';
import { Header } from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Music, Loader2, ListMusic, CalendarDays, User, ExternalLink, MessageSquareQuote } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export default function MusicPage() {
    const { user, isLoading: isUserLoading } = useUser();
    const { tasks, isLoading: areTasksLoading } = useTasks();
    const router = useRouter();

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/');
        }
    }, [user, isUserLoading, router]);

    const tasksWithPlaylists = useMemo(() => {
        return tasks
            .filter(task => !!task.playlistUrl)
            .sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [tasks]);

    if (isUserLoading || areTasksLoading || !user) {
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
                <div className="flex items-center gap-4 mb-6">
                    <Music className="h-10 w-10 text-primary" />
                    <h1 className="text-3xl md:text-4xl font-headline">Musical Notes & Dedications</h1>
                </div>

                {tasksWithPlaylists.length > 0 ? (
                    <div className="space-y-6">
                        {tasksWithPlaylists.map(task => {
                            const creatorAvatarUrl = task.createdBy === 'Tamara' ? '/tamara.svg' : '/carlos.svg';
                            return (
                                <Card key={task.id}>
                                    <CardHeader>
                                        <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                                            <div>
                                                <CardTitle className="font-headline text-xl">{task.title}</CardTitle>
                                                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pt-2">
                                                    <div className="flex items-center">
                                                        <CalendarDays className="mr-2 h-4 w-4" />
                                                        <span>{format(task.date, 'PPP')}</span>
                                                    </div>
                                                    <div className="flex items-center">
                                                        <User className="mr-2 h-4 w-4" />
                                                        <div className="flex items-center gap-2">
                                                            <span>Note from:</span>
                                                            <Avatar className="h-6 w-6">
                                                                <AvatarImage src={creatorAvatarUrl} alt={task.createdBy} />
                                                                <AvatarFallback>{task.createdBy.charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                            <span className="font-medium">{task.createdBy}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button asChild variant="outline" className="mt-2 md:mt-0 w-full md:w-auto">
                                                <a href={task.playlistUrl} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink className="mr-2" />
                                                    Open Playlist
                                                </a>
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    {task.notes && (
                                      <CardContent>
                                        <div className="border-l-4 border-accent pl-4 py-2 bg-accent/20 rounded-r-md">
                                            <div className="flex items-start gap-3">
                                                <MessageSquareQuote className="h-5 w-5 text-accent-foreground/60 mt-1 flex-shrink-0" />
                                                <blockquote className="italic text-accent-foreground/90">
                                                    "{task.notes}"
                                                </blockquote>
                                            </div>
                                        </div>
                                      </CardContent>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-20 px-6 bg-card rounded-lg shadow-sm mt-8">
                        <ListMusic className="mx-auto h-16 w-16 text-muted-foreground" />
                        <p className="mt-4 text-muted-foreground text-lg">No musical notes yet.</p>
                        <p className="mt-2 text-muted-foreground">Add a note and a playlist link to a plan to see it here!</p>
                    </div>
                )}
                 <Card className="mt-8 bg-accent/50 border-dashed">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 font-headline text-lg">
                            <Music className="text-primary"/>
                            Connect Your Music Accounts
                        </CardTitle>
                        <CardDescription>
                            Soon you'll be able to connect your Spotify or YouTube Music accounts to automatically create and share playlists for your dates!
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row gap-4">
                        <Button disabled>Connect Spotify</Button>
                        <Button disabled>Connect YouTube Music</Button>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
