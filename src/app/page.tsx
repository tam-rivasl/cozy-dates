'use client';

// Import necessary hooks from next/navigation for routing
import { useRouter } from 'next/navigation';
// Import the useUser hook from the UserContext to manage user state
import { useUser } from '@/context/UserContext';
// Import the User type definition
import type { User } from '@/lib/types';
// Import UI components from shadcn/ui
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
// Import the Heart icon from lucide-react
import { Heart } from 'lucide-react';
// Import motion from framer-motion for animations
import { motion } from 'framer-motion';

// Define the LoginPage functional component
export default function LoginPage() {
  // Destructure setUser and setTheme from the useUser context hook
  const { setUser, setTheme } = useUser();
  // Initialize the router hook
  const router = useRouter();

  // Define a function to handle user selection
  const handleUserSelect = (user: User) => {
    // Set the selected user in the context
    setUser(user);
    // Apply the corresponding theme
    setTheme(`theme-${user.toLowerCase()}`);
    // Redirect the user to the dashboard page
    router.push('/dashboard');
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <div className="text-center mb-12">
        <Heart className="h-16 w-16 text-primary mx-auto mb-4" />
        <h1 className="text-4xl sm:text-5xl font-headline font-bold">Cozy Dates</h1>
        {/* Subtitle asking who is planning */}
        <p className="text-muted-foreground text-lg mt-2">Who is planning today?</p>
      </div>

      {/* Container for the user selection cards */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* Motion div for animation on hover */}
        <motion.div whileHover={{ scale: 1.05, y: -10 }} transition={{ type: 'spring', stiffness: 300 }}>
          <Card
            className="w-full max-w-xs sm:w-64 cursor-pointer transition-all hover:shadow-2xl hover:shadow-primary/20"
            onClick={() => handleUserSelect('Tamara')}
          >
            {/* Card content for Tamara */}
            <CardContent className="flex flex-col items-center p-6">
              <Avatar className="w-32 h-32 mb-4 border-4 border-primary transition-all">
                <AvatarImage src="/img/tamara.png" alt="Tamara" />
                <AvatarFallback>T</AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-headline font-bold">Tamara</h2>
            </CardContent>
          </Card>
        </motion.div>

        {/* Motion div for animation on hover */}
        <motion.div whileHover={{ scale: 1.05, y: -10 }} transition={{ type: 'spring', stiffness: 300 }}>
          <Card
            className="w-full max-w-xs sm:w-64 cursor-pointer transition-all hover:shadow-2xl hover:shadow-primary/20"
            onClick={() => handleUserSelect('Carlos')}
          >
            {/* Card content for Carlos */}
            <CardContent className="flex flex-col items-center p-6">
              <Avatar className="w-32 h-32 mb-4 border-4 border-primary transition-all">
                <AvatarImage src="/img/carlos.png" alt="Carlos" />
              </Avatar>
              <h2 className="text-2xl font-headline font-bold">Carlos</h2>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
