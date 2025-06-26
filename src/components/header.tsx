'use client';

import { Heart, LogOut, BookHeart, Home, Music } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function Header() {
  const { user, setUser } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    setUser(null);
    router.push('/');
  };

  const avatarUrl = user === 'Tamara' 
    ? "/tamara.svg" 
    : "/carlos.svg";
  
  const navLinks = [
    { href: '/dashboard', label: 'Home', icon: Home },
    { href: '/memories', label: 'Our Memories', icon: BookHeart },
    { href: '/music', label: 'Our Playlists', icon: Music },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex items-center">
          <Heart className="h-8 w-8 text-primary mr-2" />
          <Link href="/dashboard">
            <span className="font-headline text-2xl font-bold cursor-pointer">
              Cozy Dates
            </span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center space-x-2">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} passHref>
              <Button variant="ghost" size="sm" className={cn(pathname === link.href && 'bg-accent')}>
                <link.icon className="mr-2 h-4 w-4" />
                {link.label}
              </Button>
            </Link>
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end space-x-2 md:space-x-4">
            {user && (
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={avatarUrl} alt={user} />
                  <AvatarFallback>{user.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="text-sm hidden md:block">
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
