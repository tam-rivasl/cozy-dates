'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, LogOut, BookHeart, Home, Music, Film, Menu } from 'lucide-react';

import { useUser } from '@/context/UserContext';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export function Header() {
  const { profile, signOut } = useUser();
  const pathname = usePathname();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const navLinks = [
    { href: '/dashboard', label: 'Home', icon: Home },
    { href: '/memories', label: 'Our Memories', icon: BookHeart },
    { href: '/music', label: 'Musical Notes', icon: Music },
    { href: '/watchlist', label: 'Watchlist', icon: Film },
  ];
  
  const NavLinksContent = ({ isMobile }: { isMobile?: boolean }) => (
    <nav className={cn(
        isMobile 
        ? "flex flex-col space-y-2" 
        : "hidden md:flex items-center space-x-2"
    )}>
      {navLinks.map(link => (
        <Link key={link.href} href={link.href} passHref>
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn(
              pathname === link.href && 'bg-accent',
              isMobile && 'w-full justify-start text-base'
            )}
            onClick={() => isMobile && setMobileMenuOpen(false)}
          >
            <link.icon className="mr-2 h-4 w-4" />
            {link.label}
          </Button>
        </Link>
      ))}
    </nav>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Heart className="h-8 w-8 text-primary" />
            <span className="font-headline text-2xl font-bold cursor-pointer hidden sm:inline">
              Cozy Dates
            </span>
          </Link>
          <NavLinksContent />
        </div>

        <div className="flex items-center gap-2">
          {profile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                 <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={profile.avatar_url} alt={profile.username} />
                    <AvatarFallback>{profile.username.charAt(0)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Hello, {profile.username}!</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      Time to plan something amazing.
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] p-4">
                  <Link href="/dashboard" className="flex items-center gap-2 mb-8" onClick={() => setMobileMenuOpen(false)}>
                    <Heart className="h-8 w-8 text-primary" />
                    <span className="font-headline text-2xl font-bold">Cozy Dates</span>
                  </Link>
                  <NavLinksContent isMobile={true} />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
