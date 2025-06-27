import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { UserProvider } from '@/context/UserContext';
import { TaskProvider } from '@/context/TaskContext';
import { WatchlistProvider } from '@/context/WatchlistContext';
import { MusicProvider } from '@/context/MusicContext';

export const metadata: Metadata = {
  title: 'Cozy Dates',
  description: 'Plan your life together',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="theme-tamara theme-carlos">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#d7cce6" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Alegreya:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground">
        <UserProvider>
          <WatchlistProvider>
            <TaskProvider>
              <MusicProvider>
                {children}
                <Toaster />
              </MusicProvider>
            </TaskProvider>
          </WatchlistProvider>
        </UserProvider>
      </body>
    </html>
  );
}
