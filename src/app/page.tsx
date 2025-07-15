'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';

export default function HomePage() {

  return (
     <main className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <div className="text-center mb-12">
        <Heart className="h-16 w-16 text-primary mx-auto mb-4" />
        <h1 className="text-4xl sm:text-5xl font-headline font-bold">Cozy Dates</h1>
        <p className="text-muted-foreground text-lg mt-2">Plan your life together.</p>
      </div>

      <div className="flex gap-4">
        <Button asChild size="lg">
          <Link href="/login">Login</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/register">Register</Link>
        </Button>
      </div>
    </main>
  );
}
