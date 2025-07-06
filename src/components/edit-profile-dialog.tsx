'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import imageCompression from 'browser-image-compression';
import { useUser } from '@/context/UserContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, User, Save } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { useToast } from '@/hooks/use-toast';

interface EditProfileDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const profileSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters long.'),
  avatar: z.any().optional(), // Avatar is optional on edit
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function EditProfileDialog({ isOpen, onOpenChange }: EditProfileDialogProps) {
  const { profile, updateProfile } = useUser();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: profile?.username || '',
      avatar: undefined,
    },
  });

  useEffect(() => {
    if (profile && isOpen) {
      form.reset({ username: profile.username });
      setAvatarPreview(profile.avatar_url);
    }
  }, [profile, form, isOpen]);


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

  const onSubmit = async (data: ProfileFormValues) => {
    setIsLoading(true);
    let avatarFile: File | null = data.avatar?.[0] || null;

    if (avatarFile) {
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
            avatarFile = await imageCompression(avatarFile, options);
        } catch (compressionError) {
             toast({
                variant: 'destructive',
                title: 'Image Processing Error',
                description: 'Could not process the image. Please try a different one.',
              });
              console.error('Image compression error:', compressionError);
              setIsLoading(false);
              return;
        }
    }
    
    const error = await updateProfile(data.username, avatarFile);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message,
      });
    } else {
      toast({
        title: 'Profile Updated!',
        description: 'Your changes have been saved.',
      });
      onOpenChange(false);
    }

    setIsLoading(false);
  };
  
  if (!profile) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Your Profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex justify-center">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarPreview || profile.avatar_url} alt={profile.username} />
                <AvatarFallback>
                  <User className="h-12 w-12" />
                </AvatarFallback>
              </Avatar>
            </div>
            <FormField
                control={form.control}
                name="avatar"
                render={({ field: { onChange, onBlur, name, ref } }) => (
                   <FormItem>
                    <FormLabel>Change Profile Picture</FormLabel>
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
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="Your username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
