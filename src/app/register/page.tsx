'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Heart, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/UserContext';

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters long.'),
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  avatar: z.any().refine((files) => files?.length === 1, 'Avatar image is required.'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { signUp } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      avatar: undefined,
    },
  });

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    const { email, password, username, avatar } = data;
    const avatarFile = avatar[0];

    if (!avatarFile) {
        toast({
            variant: "destructive",
            title: "Avatar Missing",
            description: "Please select a profile picture.",
        });
        setIsLoading(false);
        return;
    }
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(avatarFile.type)) {
        toast({
            variant: "destructive",
            title: "Invalid File Type",
            description: "Please use JPG, PNG, GIF, or WebP.",
        });
        setIsLoading(false);
        return;
    }
    
    if (avatarFile.size > 4 * 1024 * 1024) { // 4MB
        toast({
            variant: "destructive",
            title: "File Too Large",
            description: "The avatar image must be smaller than 4MB.",
        });
        setIsLoading(false);
        return;
    }

    try {
      const options = {
        maxSizeMB: 4,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      }
      
      const compressedFile = await imageCompression(avatarFile, options);
      
      const error = await signUp(email, password, username, compressedFile);

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Registration Failed',
          description: error.message.includes('permission') ? 'You do not have permission to perform this action.' : error.message,
        });
      } else {
        toast({
          title: 'Registration Successful!',
          description: "Welcome to Cozy Dates! Please check your email to confirm your account.",
        });
        router.push('/login');
      }
    } catch (compressionError) {
       toast({
          variant: 'destructive',
          title: 'Image Processing Error',
          description: 'Could not process the image. Please try a different one.',
        });
        console.error('Image compression error:', compressionError);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <Heart className="h-12 w-12 text-primary mx-auto mb-2" />
          <CardTitle className="text-3xl font-headline">Create an Account</CardTitle>
          <CardDescription>Join Cozy Dates to start planning with your partner.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="avatar"
                render={({ field: { onChange, onBlur, name, ref } }) => (
                   <FormItem>
                    <FormLabel>Profile Picture</FormLabel>
                     <FormControl>
                       <Input
                         type="file"
                         accept="image/*"
                         ref={ref}
                         name={name}
                         onBlur={onBlur}
                         onChange={(e) => {
                           onChange(e.target.files);
                           handleAvatarChange(e);
                         }}
                       />
                     </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {avatarPreview && (
                <div className="flex justify-center">
                  <img src={avatarPreview} alt="Avatar Preview" className="h-24 w-24 rounded-full object-cover" />
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Create Account'}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
