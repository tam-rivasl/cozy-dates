'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import type { UserName as User } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const { setUser } = useUser();
  const router = useRouter();

  const handleUserSelect = (user: User) => {
    // Guarda el usuario en el contexto
    setUser(user);
    // Redirige
    router.push('/dashboard');
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <div className="text-center mb-12">
        <Heart className="h-16 w-16 text-primary mx-auto mb-4" />
        <h1 className="text-4xl sm:text-5xl font-headline font-bold">Cozy Dates</h1>
        <p className="text-muted-foreground text-lg mt-2">Who is planning today?</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {['Tamara', 'Carlos'].map((name) => (
          <motion.div
            key={name}
            whileHover={{ scale: 1.05, y: -10 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <Card
              className="w-full max-w-xs sm:w-64 cursor-pointer transition-all hover:shadow-2xl hover:shadow-primary/20"
              onClick={() => handleUserSelect(name as User)}
            >
              <CardContent className="flex flex-col items-center p-6">
                <Avatar className="w-32 h-32 mb-4 border-4 border-primary transition-all">
                  <AvatarImage src={`/img/${name.toLowerCase()}.png`} alt={name} />
                  <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                </Avatar>
                <h2 className="text-2xl font-headline font-bold">{name}</h2>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </main>
  );
}
