'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, LogOut, BookHeart, Home, Music, Film, Menu, Settings } from 'lucide-react';

import { useUser } from '@/context/UserContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { logInfo } from '@/lib/logger';
import { getFallbackAvatarForTheme, normalizeThemeName } from '@/lib/theme';

export function Header() {
  const { user, setUser } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  const displayName = user?.displayName ?? 'Invitado';
  const avatarSrc = useMemo(() => {
    logInfo('avatarSrc', 'avatarSrc', { user });
    if (user?.avatarUrl) {
      return user.avatarUrl;
    }

    return getFallbackAvatarForTheme(normalizeThemeName(user?.theme ?? null));
  }, [user]);

  const handleLogout = () => {
    setUser(null);
    signOut().finally(() => {
      router.push('/auth/login');
    });
  };

  const navLinks = [
    { href: '/dashboard', label: 'Home', icon: Home },
    { href: '/memories', label: 'Our Memories', icon: BookHeart },
    { href: '/music', label: 'Musical Notes', icon: Music },
    { href: '/watchlist', label: 'Watchlist', icon: Film },
  ];

  const NavLinksContent = ({ isMobile }: { isMobile?: boolean }) => (
    <nav className={cn(isMobile ? 'flex flex-col space-y-2' : 'hidden md:flex items-center space-x-2')}>
      {navLinks.map((link) => {
        const isActive = pathname.startsWith(link.href);
        return (
          <Link key={link.href} href={link.href} passHref>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'relative overflow-hidden rounded-full px-3 py-2 transition-colors',
                isMobile && 'w-full justify-start text-base',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => isMobile && setMobileMenuOpen(false)}
            >
              <AnimatePresence>
                {isActive ? (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full bg-primary/10"
                    transition={{ type: 'spring', stiffness: 280, damping: 28 }}
                  />
                ) : null}
              </AnimatePresence>
              <span className="relative z-10 flex items-center gap-2">
                <link.icon className="h-4 w-4" />
                {link.label}
              </span>
            </Button>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Heart className="h-8 w-8 text-primary" />
            <span className="hidden cursor-pointer font-headline text-2xl font-bold sm:inline">Cozy Dates</span>
          </Link>
          <NavLinksContent />
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={avatarSrc} alt={displayName} className="object-cover" />
                    <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Hola, {displayName}!</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      Planeemos algo increíble.
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configuración</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Abrir menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] p-4">
                <Link
                  href="/dashboard"
                  className="mb-8 flex items-center gap-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Heart className="h-8 w-8 text-primary" />
                  <span className="font-headline text-2xl font-bold">Cozy Dates</span>
                </Link>
                <NavLinksContent isMobile />
                {user ? (
                  <Button
                    variant="ghost"
                    className="mt-4 w-full justify-start"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      router.push('/settings');
                    }}
                  >
                    <Settings className="mr-2 h-4 w-4" /> Configuración
                  </Button>
                ) : null}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}






