'use client';

import { Heart, LogOut, BookHeart, Home, Music, Film } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


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
    { href: '/music', label: 'Musical Notes', icon: Music },
    { href: '/watchlist', label: 'Watchlist', icon: Film },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center">
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
        </div>

        <div className="flex items-center">
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                   <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={avatarUrl} alt={user} />
                      <AvatarFallback>{user.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">Hello, {user}!</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        Time to plan something amazing.
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Switch User</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
        </div>
      </div>
    </header>
  );
}
