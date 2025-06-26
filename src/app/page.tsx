'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import type { User } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const { setUser } = useUser();
  const router = useRouter();

  const handleUserSelect = (user: User) => {
    setUser(user);
    router.push('/dashboard');
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <div className="text-center mb-12">
        <Heart className="h-16 w-16 text-primary mx-auto mb-4" />
        <h1 className="text-5xl font-headline font-bold">Cozy Dates</h1>
        <p className="text-muted-foreground text-lg mt-2">Who is planning today?</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <motion.div whileHover={{ scale: 1.05, y: -10 }} transition={{ type: 'spring', stiffness: 300 }}>
          <Card
            className="w-64 cursor-pointer transition-all hover:shadow-2xl hover:shadow-primary/20"
            onClick={() => handleUserSelect('Tamara')}
          >
            <CardContent className="flex flex-col items-center p-6">
              <Avatar className="w-32 h-32 mb-4 border-4 border-transparent group-hover:border-primary transition-all">
                <AvatarImage src="https://placehold.co/128x128.png" alt="Tamara" data-ai-hint="woman smiling" />
                <AvatarFallback>T</AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-headline font-bold">Tamara</h2>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.05, y: -10 }} transition={{ type: 'spring', stiffness: 300 }}>
          <Card
            className="w-64 cursor-pointer transition-all hover:shadow-2xl hover:shadow-primary/20"
            onClick={() => handleUserSelect('Carlos')}
          >
            <CardContent className="flex flex-col items-center p-6">
              <Avatar className="w-32 h-32 mb-4 border-4 border-transparent group-hover:border-primary transition-all">
                <AvatarImage src="https://placehold.co/128x128.png" alt="Carlos" data-ai-hint="man smiling" />
                <AvatarFallback>C</AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-headline font-bold">Carlos</h2>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
