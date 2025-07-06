
'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import type { Profile, CoupleInvitation } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface UserContextType {
  user: User | null;
  profile: Profile | null;
  partnerProfile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  invitations: CoupleInvitation[];
  sentInvitation: CoupleInvitation | null;
  signIn: (email: string, pass: string) => Promise<AuthError | null>;
  signUp: (email: string, pass: string, username: string, avatar: File) => Promise<AuthError | null>;
  signOut: () => Promise<void>;
  updateProfile: (username: string, avatarFile: File | null) => Promise<AuthError | null>;
  invitePartner: (email: string) => Promise<void>;
  acceptInvitation: (id: string) => Promise<void>;
  declineInvitation: (id: string) => Promise<void>;
  unpair: () => Promise<void>;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<Profile | null>(null);
  const [invitations, setInvitations] = useState<CoupleInvitation[]>([]);
  const [sentInvitation, setSentInvitation] = useState<CoupleInvitation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') console.error('Error fetching profile:', error);
    setProfile(data);
    return data;
  }, []);

  const fetchPartnerProfile = useCallback(async (partnerId: string) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', partnerId)
        .single();
    if (error) {
        console.error('Error fetching partner profile', error);
        setPartnerProfile(null);
    } else {
        setPartnerProfile(data);
    }
  }, []);
  
  const fetchInvitations = useCallback(async (userEmail: string, userId: string) => {
    if (!userEmail) return;
     const { data, error } = await supabase
      .from('couple_invitations')
      .select('*, profiles (id, username, avatar_url)')
      .or(`invitee_email.eq.${userEmail},inviter_id.eq.${userId}`)
      .eq('status', 'pending');
      
    if (error) {
        toast({ title: 'Error fetching invitations', description: error.message, variant: 'destructive' });
    } else {
        setInvitations(data.filter(inv => inv.invitee_email === userEmail));
        setSentInvitation(data.find(inv => inv.inviter_id === userId) || null);
    }
  }, [toast]);


  useEffect(() => {
    const getSessionAndProfile = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const userProfile = await fetchProfile(currentUser.id);
        if (userProfile?.partner_id) {
            await fetchPartnerProfile(userProfile.partner_id);
        } else {
            setPartnerProfile(null);
        }
        await fetchInvitations(currentUser.email!, currentUser.id);
      }
      setIsLoading(false);
    };

    getSessionAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
        const newUser = session?.user ?? null;
        setSession(session);
        setUser(newUser);
        
        if (newUser) {
            const userProfile = await fetchProfile(newUser.id);
            if (userProfile?.partner_id) {
                await fetchPartnerProfile(userProfile.partner_id);
            } else {
                setPartnerProfile(null);
            }
             await fetchInvitations(newUser.email!, newUser.id);
            if(window.location.pathname === '/login' || window.location.pathname === '/register' || window.location.pathname === '/') {
                router.push('/dashboard');
            }
        } else {
            setProfile(null);
            setPartnerProfile(null);
            setInvitations([]);
            setSentInvitation(null);
            router.push('/login');
        }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router, fetchProfile, fetchPartnerProfile, fetchInvitations]);

  const signIn = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    return error;
  };

  const signUp = async (email: string, pass: string, username: string, avatarFile: File) => {
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
    if (!authData.user) return new Error('User not created despite no auth error.');
      
    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${authData.user.id}/${fileName}`;
  
    const { error: uploadError } = await supabase
      .storage
      .from('avatars')
      .upload(filePath, avatarFile, { cacheControl: '3600', upsert: true });
  
    if (uploadError) return uploadError;
  
    const { data: publicUrlData } = supabase
      .storage
      .from('avatars')
      .getPublicUrl(filePath);
        
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
        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, avatarFile, { cacheControl: '3600', upsert: true });
        if (uploadError) return uploadError;
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        avatar_url = publicUrlData.publicUrl;
    }
    const { error } = await supabase.from('profiles').update({ username, avatar_url, updated_at: new Date().toISOString() }).eq('id', user.id);
    if (!error) await fetchProfile(user.id);
    return error;
  };

  const invitePartner = async (email: string) => {
    if (!session) return;
    const { error } = await supabase.functions.invoke('invite-partner', {
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: { invitee_email: email },
    });
    if (error) {
        toast({ title: 'Invitation Failed', description: "Failed to send a request to the Edge Function", variant: 'destructive' });
    } else {
        toast({ title: 'Invitation Sent!', description: `Your invitation to ${email} has been sent.` });
        await fetchInvitations(user!.email!, user!.id);
    }
  };

  const acceptInvitation = async (id: string) => {
    if (!session) return;
    const { error } = await supabase.functions.invoke('accept-invitation', {
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: { invitation_id: id },
    });
     if (error) {
        toast({ title: 'Failed to Accept', description: "Failed to send a request to the Edge Function", variant: 'destructive' });
    } else {
        toast({ title: 'Invitation Accepted!', description: "You are now paired!" });
        if(user) {
            const p = await fetchProfile(user.id);
            if(p?.partner_id) await fetchPartnerProfile(p.partner_id);
            await fetchInvitations(user.email!, user.id);
        }
    }
  };
  
  const declineInvitation = async (id: string) => {
      if (!session) return;
      const { error } = await supabase.functions.invoke('decline-invitation', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { invitation_id: id },
      });
      if (error) {
          toast({ title: 'Action Failed', description: "Failed to send a request to the Edge Function", variant: 'destructive' });
      } else {
          toast({ title: 'Invitation Declined', variant: 'destructive' });
          await fetchInvitations(user!.email!, user!.id);
      }
  };
  
  const unpair = async () => {
      if (!session) return;
      const { error } = await supabase.functions.invoke('unpair-partner', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
       if (error) {
          toast({ title: 'Failed to Unpair', description: "Failed to send a request to the Edge Function", variant: 'destructive' });
      } else {
          toast({ title: 'Successfully Unpaired', variant: 'destructive' });
          setPartnerProfile(null);
          if (user) await fetchProfile(user.id);
      }
  };

  const value = {
    session, user, profile, partnerProfile, isLoading, invitations, sentInvitation,
    signIn, signOut, signUp, updateProfile, invitePartner, acceptInvitation, declineInvitation, unpair,
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
