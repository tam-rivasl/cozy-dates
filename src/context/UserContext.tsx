
'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import type { Profile } from '@/lib/types';
import { useRouter } from 'next/navigation';

interface UserContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, pass: string) => Promise<AuthError | null>;
  signUp: (email: string, pass: string, username: string, avatar: File) => Promise<AuthError | null>;
  signOut: () => Promise<void>;
  updateProfile: (username: string, avatarFile: File | null) => Promise<AuthError | null>;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      setIsLoading(false);
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
        if(window.location.pathname === '/login' || window.location.pathname === '/register' || window.location.pathname === '/') {
          router.push('/dashboard');
        }
      } else {
        setProfile(null);
        router.push('/login');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching profile:', error);
    }
    setProfile(data);
  };
  
  const signIn = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    return error;
  };

  const signUp = async (email: string, pass: string, username: string, avatarFile: File) => {
    // 1. Sign up the user. The trigger will create the initial profile.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          username: username,
        }
      }
    });
  
    if (authError) return authError;
    if (!authData.user) {
      // This case should ideally not happen if authError is null.
      // But as a safeguard:
      return new Error('User not created despite no auth error.');
    }
      
    // 2. Upload the avatar.
    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${authData.user.id}/${fileName}`;
  
    const { error: uploadError } = await supabase
      .storage
      .from('avatars')
      .upload(filePath, avatarFile, {
        cacheControl: '3600',
        upsert: true,
      });
  
    if (uploadError) return uploadError;
  
    // 3. Get the public URL for the avatar.
    const { data: publicUrlData } = supabase
      .storage
      .from('avatars')
      .getPublicUrl(filePath);
        
    // 4. Update the newly created profile with the avatar URL.
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        avatar_url: publicUrlData.publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', authData.user.id);
  
    return profileError;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updateProfile = async (username: string, avatarFile: File | null) => {
    if (!user) return new Error("User not authenticated");

    let avatar_url = profile?.avatar_url;

    if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, avatarFile, {
                cacheControl: '3600',
                upsert: true,
            });

        if (uploadError) return uploadError;

        const { data: publicUrlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);
        
        avatar_url = publicUrlData.publicUrl;
    }

    const { error } = await supabase
        .from('profiles')
        .update({
            username,
            avatar_url,
            updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    
    if (!error) {
      await fetchProfile(user.id);
    }
    
    return error;
  };

  const value = {
    session,
    user,
    profile,
    isLoading,
    signIn,
    signOut,
    signUp,
    updateProfile,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
