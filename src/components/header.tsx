import { Heart } from 'lucide-react';
import { DateSuggester } from './date-suggester';
import { ThemeToggle } from './theme-toggle';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex items-center">
          <Heart className="h-8 w-8 text-primary mr-2" />
          <span className="font-headline text-2xl font-bold">
            Cozy Dates
          </span>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
            <DateSuggester />
            <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
