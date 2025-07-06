
-- Drop existing policies and functions if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile and their partner's profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can view their partner's profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Partners can view each other's tasks." ON public.tasks;
DROP POLICY IF EXISTS "Users can only manage their own tasks." ON public.tasks;
DROP POLICY IF EXISTS "Partners can view each other's watchlist items." ON public.watchlist_items;
DROP POLICY IF EXISTS "Users can only manage their own watchlist items." ON public.watchlist_items;
DROP POLICY IF EXISTS "Partners can view each other's music notes." ON public.music_notes;
DROP POLICY IF EXISTS "Users can only manage their own music notes." ON public.music_notes;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." on public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." on public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." on public.profiles;

DROP TABLE IF EXISTS public.music_notes;
DROP TABLE IF EXISTS public.watchlist_items;
DROP TABLE IF EXISTS public.tasks;
DROP TABLE IF EXISTS public.couple_invitations;
DROP TABLE IF EXISTS public.profiles;

DROP FUNCTION IF EXISTS public.get_partner_id();
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.link_partners(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.unlink_partners(uuid, uuid);

DROP TYPE IF EXISTS public.couple_invitation_status;
DROP TYPE IF EXISTS public.task_category;
DROP TYPE IF EXISTS public.task_priority;
DROP TYPE IF EXISTS public.watchlist_type;
DROP TYPE IF EXISTS public.watchlist_status;


-- Create custom types (ENUMS)
CREATE TYPE public.couple_invitation_status AS ENUM ('pending', 'accepted', 'declined');
CREATE TYPE public.task_category AS ENUM ('Date Night', 'Travel Plans', 'To-Do', 'Special Event', 'Movie Day');
CREATE TYPE public.task_priority AS ENUM ('High', 'Medium', 'Low');
CREATE TYPE public.watchlist_type AS ENUM ('Movie', 'Series');
CREATE TYPE public.watchlist_status AS ENUM ('To Watch', 'Watched');


-- Create Profiles Table
CREATE TABLE public.profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username text UNIQUE,
    avatar_url text,
    updated_at timestamp with time zone,
    partner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT username_length CHECK (char_length(username) >= 3)
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create Couple Invitations Table
CREATE TABLE public.couple_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    inviter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    invitee_email text NOT NULL,
    status public.couple_invitation_status DEFAULT 'pending' NOT NULL
);
ALTER TABLE public.couple_invitations ENABLE ROW LEVEL SECURITY;

-- Create Tasks Table
CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    title text NOT NULL,
    description text,
    date timestamp with time zone NOT NULL,
    category public.task_category NOT NULL,
    priority public.task_priority NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    photos text[],
    notes text,
    created_by text,
    watchlist_item_id text,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create Watchlist Items Table
CREATE TABLE public.watchlist_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    title text NOT NULL,
    type public.watchlist_type NOT NULL,
    status public.watchlist_status DEFAULT 'To Watch'::public.watchlist_status NOT NULL,
    notes text,
    added_by text,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;

-- Create Music Notes Table
CREATE TABLE public.music_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    title text NOT NULL,
    notes text,
    playlist_url text,
    added_by text,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.music_notes ENABLE ROW LEVEL SECURITY;

-- SQL Functions
-- Creates a profile for a new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new.raw_user_meta_data->>'username');
  RETURN new;
END;
$$;

-- Function to link partners
CREATE OR REPLACE FUNCTION public.link_partners(inviter_id uuid, invitee_id uuid, p_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update profiles
  UPDATE public.profiles SET partner_id = invitee_id WHERE id = inviter_id;
  UPDATE public.profiles SET partner_id = inviter_id WHERE id = invitee_id;
  
  -- Update invitation status
  UPDATE public.couple_invitations SET status = 'accepted' WHERE id = p_invitation_id;
END;
$$;

-- Function to unlink partners
CREATE OR REPLACE FUNCTION public.unlink_partners(user_id_1 uuid, user_id_2 uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles SET partner_id = NULL WHERE id = user_id_1;
  UPDATE public.profiles SET partner_id = NULL WHERE id = user_id_2;
END;
$$;


-- Triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- RLS Policies
-- Profiles
CREATE POLICY "Users can view their own profile." ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can view their partner's profile." ON public.profiles FOR SELECT USING (id = (SELECT partner_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Couple Invitations
CREATE POLICY "Users can manage their own invitations." ON public.couple_invitations
  FOR ALL USING (inviter_id = auth.uid() OR invitee_email = auth.email());

-- Tasks
CREATE POLICY "Partners can view each other's tasks." ON public.tasks FOR SELECT USING (user_id = auth.uid() OR user_id = (SELECT partner_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can only manage their own tasks." ON public.tasks FOR (INSERT, UPDATE, DELETE) WITH CHECK (user_id = auth.uid());

-- Watchlist Items
CREATE POLICY "Partners can view each other's watchlist items." ON public.watchlist_items FOR SELECT USING (user_id = auth.uid() OR user_id = (SELECT partner_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can only manage their own watchlist items." ON public.watchlist_items FOR (INSERT, UPDATE, DELETE) WITH CHECK (user_id = auth.uid());

-- Music Notes
CREATE POLICY "Partners can view each other's music notes." ON public.music_notes FOR SELECT USING (user_id = auth.uid() OR user_id = (SELECT partner_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can only manage their own music notes." ON public.music_notes FOR (INSERT, UPDATE, DELETE) WITH CHECK (user_id = auth.uid());


-- Storage
-- Create a public bucket for avatars if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- RLS for Avatars
-- Allow public read access to all avatars
DROP POLICY IF EXISTS "Allow public read access to avatars" ON storage.objects;
CREATE POLICY "Allow public read access to avatars" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'avatars');

-- Allow users to manage their own folder
DROP POLICY IF EXISTS "Allow user to manage their own avatar folder" ON storage.objects;
CREATE POLICY "Allow user to manage their own avatar folder" ON storage.objects FOR (INSERT, UPDATE, DELETE) TO authenticated USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
) WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
);
