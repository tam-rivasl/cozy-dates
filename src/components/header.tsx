'use client';

import { Heart, LogOut } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

export function Header() {
  const { user, setUser } = useUser();
  const router = useRouter();

  const handleLogout = () => {
    setUser(null);
    router.push('/');
  };

  const avatarUrl = user === 'Tamara' 
    ? "/tamara.svg" 
    : "/carlos.svg";
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex items-center">
          <Heart className="h-8 w-8 text-primary mr-2" />
          <span className="font-headline text-2xl font-bold">
            Cozy Dates
          </span>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
            {user && (
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={avatarUrl} alt={user} />
                  <AvatarFallback>{user.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <span className="font-medium">Hello, {user}!</span>
                </div>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2" />
              Switch User
            </Button>
        </div>
      </div>
    </header>
  );
}
