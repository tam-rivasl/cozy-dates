-- supabase/migrations/0000_initial_schema.sql

-- 0. Drop existing objects to ensure a clean slate.
-- The CASCADE option automatically drops dependent objects.
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.get_partner_id() CASCADE;
DROP FUNCTION IF EXISTS public.link_partners(uuid, uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.unlink_partners(uuid, uuid) CASCADE;

DROP TABLE IF EXISTS public.music_notes CASCADE;
DROP TABLE IF EXISTS public.watchlist_items CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.couple_invitations CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;


-- 1. Create Profiles Table
-- Stores public-facing user data.
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  updated_at timestamptz,
  username text,
  avatar_url text,
  partner_id uuid,
  
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_username_key UNIQUE (username),
  CONSTRAINT username_length CHECK ((char_length(username) >= 3)),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add self-referencing Foreign Key to Profiles for the partner relationship.
-- This is done after table creation to avoid potential circular dependency issues at creation time.
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_partner_id_fkey
  FOREIGN KEY (partner_id)
  REFERENCES public.profiles(id) ON DELETE SET NULL;
  
-- 2. Enable Row Level Security (RLS) for all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 3. Create helper function to get the current user's partner ID
-- This simplifies RLS policies for shared data.
CREATE OR REPLACE FUNCTION public.get_partner_id()
RETURNS uuid AS $$
DECLARE
    partner_uuid uuid;
BEGIN
    SELECT partner_id INTO partner_uuid FROM public.profiles WHERE id = auth.uid();
    RETURN partner_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Couple Invitations Table
CREATE TABLE public.couple_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    inviter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    invitee_email text NOT NULL,
    status public.couple_invitation_status DEFAULT 'pending' NOT NULL
);
ALTER TABLE public.couple_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see their own invitations (sent and received)." ON public.couple_invitations FOR SELECT USING (auth.uid() = inviter_id OR auth.email() = invitee_email);
CREATE POLICY "Users can insert their own invitations." ON public.couple_invitations FOR INSERT WITH CHECK (auth.uid() = inviter_id);
CREATE POLICY "Users can update their own invitations (e.g., cancel)." ON public.couple_invitations FOR UPDATE USING (auth.uid() = inviter_id);

-- 5. Shared Tasks Table
CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    title text NOT NULL,
    description text,
    date timestamptz NOT NULL,
    category text,
    priority text,
    completed boolean DEFAULT false,
    photos text[],
    notes text,
    created_by text NOT NULL,
    watchlist_item_id uuid,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own and their partner's tasks." ON public.tasks FOR SELECT USING ((auth.uid() = user_id) OR (user_id = get_partner_id()));
CREATE POLICY "Users can insert their own tasks." ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tasks." ON public.tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tasks." ON public.tasks FOR DELETE USING (auth.uid() = user_id);


-- 6. Shared Watchlist Table
CREATE TABLE public.watchlist_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    title text NOT NULL,
    type text NOT NULL,
    status text NOT NULL,
    notes text,
    added_by text NOT NULL,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE
);
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own and partner watchlist." ON public.watchlist_items FOR SELECT USING ((auth.uid() = user_id) OR (user_id = get_partner_id()));
CREATE POLICY "Users can insert their own watchlist items." ON public.watchlist_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own watchlist items." ON public.watchlist_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own watchlist items." ON public.watchlist_items FOR DELETE USING (auth.uid() = user_id);

-- 7. Shared Music Notes Table
CREATE TABLE public.music_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    title text NOT NULL,
    notes text,
    playlist_url text,
    added_by text NOT NULL,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE
);
ALTER TABLE public.music_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own and partner music notes." ON public.music_notes FOR SELECT USING ((auth.uid() = user_id) OR (user_id = get_partner_id()));
CREATE POLICY "Users can insert their own music notes." ON public.music_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own music notes." ON public.music_notes FOR DELETE USING (auth.uid() = user_id);


-- 8. Storage: Avatars Bucket
-- Create a public bucket for user avatars.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for Avatars: Users can manage their own avatar in a folder named after their user ID.
CREATE POLICY "Avatar images are publicly accessible." ON storage.objects FOR SELECT USING ( bucket_id = 'avatars' );
CREATE POLICY "Anyone can upload an avatar." ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'avatars' );
CREATE POLICY "Anyone can update their own avatar." ON storage.objects FOR UPDATE USING ( auth.uid() = owner ) WITH CHECK ( bucket_id = 'avatars' );
CREATE POLICY "Anyone can delete their own avatar." ON storage.objects FOR DELETE USING ( auth.uid() = owner );

-- 9. RPC Functions for linking and unlinking partners
-- These are called from Edge Functions to ensure atomicity.
CREATE OR REPLACE FUNCTION public.link_partners(inviter_id uuid, invitee_id uuid, p_invitation_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles SET partner_id = invitee_id WHERE id = inviter_id;
    UPDATE public.profiles SET partner_id = inviter_id WHERE id = invitee_id;
    UPDATE public.couple_invitations SET status = 'accepted' WHERE id = p_invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.unlink_partners(user_id_1 uuid, user_id_2 uuid)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles SET partner_id = NULL WHERE id = user_id_1;
    UPDATE public.profiles SET partner_id = NULL WHERE id = user_id_2;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 10. Trigger to create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Types
create type public.couple_invitation_status as enum ('pending', 'accepted', 'declined');

-- Grant usage on new types and schemas to authenticated users
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON
  public.profiles,
  public.couple_invitations,
  public.tasks,
  public.watchlist_items,
  public.music_notes
TO anon, authenticated, service_role;
