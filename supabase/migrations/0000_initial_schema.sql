-- Drop existing objects if they exist
DROP POLICY IF EXISTS "Users can see their partner's tasks" on public.tasks;
DROP POLICY IF EXISTS "Users can manage their own tasks" on public.tasks;
DROP POLICY IF EXISTS "Users can see their partner's watchlist items" on public.watchlist_items;
DROP POLICY IF EXISTS "Users can manage their own watchlist items" on public.watchlist_items;
DROP POLICY IF EXISTS "Users can see their partner's music notes" on public.music_notes;
DROP POLICY IF EXISTS "Users can manage their own music notes" on public.music_notes;
DROP POLICY IF EXISTS "Invitees can update invitations to them" on public.couple_invitations;
DROP POLICY IF EXISTS "Users can update their own invitations" on public.couple_invitations;
DROP POLICY IF EXISTS "Users can see invitations sent to them" on public.couple_invitations;
DROP POLICY IF EXISTS "Users can see their own sent invitations" on public.couple_invitations;
DROP POLICY IF EXISTS "Users can insert their own invitations" on public.couple_invitations;
DROP POLICY IF EXISTS "Users can manage their own partner id" on public.profiles;
DROP POLICY IF EXISTS "Users can see their partner's profile" on public.profiles;
DROP POLICY IF EXISTS "Users can see their own profile" on public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" on public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to upload avatars" on storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read avatars" on storage.objects;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user;
DROP FUNCTION IF EXISTS public.link_partners;
DROP FUNCTION IF EXISTS public.unlink_partners;

DROP TABLE IF EXISTS public.music_notes;
DROP TABLE IF EXISTS public.watchlist_items;
DROP TABLE IF EXISTS public.tasks;
DROP TABLE IF EXISTS public.couple_invitations;
DROP TABLE IF EXISTS public.profiles;

DROP TYPE IF EXISTS public.couple_invitation_status;
DROP TYPE IF EXISTS public.watchlist_type;
DROP TYPE IF EXISTS public.watchlist_status;
DROP TYPE IF EXISTS public.task_category;
DROP TYPE IF EXISTS public.task_priority;

-- Create custom types (ENUMS)
CREATE TYPE public.couple_invitation_status AS ENUM ('pending', 'accepted', 'declined');
CREATE TYPE public.watchlist_type AS ENUM ('Movie', 'Series');
CREATE TYPE public.watchlist_status AS ENUM ('To Watch', 'Watched');
CREATE TYPE public.task_category AS ENUM ('Date Night', 'Travel Plans', 'To-Do', 'Special Event', 'Movie Day');
CREATE TYPE public.task_priority AS ENUM ('High', 'Medium', 'Low');


-- Create Profiles Table
CREATE TABLE public.profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    updated_at timestamp with time zone,
    username text NOT NULL UNIQUE,
    avatar_url text,
    partner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- Create Couple Invitations Table
CREATE TABLE public.couple_invitations (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    inviter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    invitee_email text NOT NULL,
    status public.couple_invitation_status NOT NULL DEFAULT 'pending'
);

-- Create Tasks Table
CREATE TABLE public.tasks (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    title text NOT NULL,
    description text,
    date timestamp with time zone NOT NULL,
    category public.task_category NOT NULL,
    priority public.task_priority NOT NULL,
    completed boolean NOT NULL DEFAULT false,
    photos text[],
    notes text,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_by text NOT NULL,
    watchlist_item_id uuid
);

-- Create Watchlist Items Table
CREATE TABLE public.watchlist_items (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    title text NOT NULL,
    type public.watchlist_type NOT NULL,
    status public.watchlist_status NOT NULL,
    notes text,
    added_by text NOT NULL,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Create Music Notes Table
CREATE TABLE public.music_notes (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    title text NOT NULL,
    notes text NOT NULL,
    playlist_url text NOT NULL,
    added_by text NOT NULL,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Add foreign key constraint to tasks table
ALTER TABLE public.tasks 
ADD CONSTRAINT fk_watchlist_item 
FOREIGN KEY (watchlist_item_id) 
REFERENCES public.watchlist_items(id) ON DELETE SET NULL;


-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$;

-- Trigger to call the function on new user signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- RPC to link partners
CREATE OR REPLACE FUNCTION public.link_partners(inviter_id uuid, invitee_id uuid, p_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update inviter's profile
  UPDATE public.profiles
  SET partner_id = invitee_id
  WHERE id = inviter_id;

  -- Update invitee's profile
  UPDATE public.profiles
  SET partner_id = inviter_id
  WHERE id = invitee_id;

  -- Update invitation status
  UPDATE public.couple_invitations
  SET status = 'accepted'
  WHERE id = p_invitation_id;
END;
$$;

-- RPC to unlink partners
CREATE OR REPLACE FUNCTION public.unlink_partners(user_id_1 uuid, user_id_2 uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update user 1's profile
  UPDATE public.profiles
  SET partner_id = NULL
  WHERE id = user_id_1;

  -- Update user 2's profile
  UPDATE public.profiles
  SET partner_id = NULL
  WHERE id = user_id_2;
END;
$$;


-- Set up Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_notes ENABLE ROW LEVEL SECURITY;


-- Policies for Profiles
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can see their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can see their partner's profile" ON public.profiles FOR SELECT USING (id = (SELECT partner_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can manage their own partner id" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Policies for Couple Invitations
CREATE POLICY "Users can insert their own invitations" ON public.couple_invitations FOR INSERT WITH CHECK (auth.uid() = inviter_id);
CREATE POLICY "Users can see their own sent invitations" ON public.couple_invitations FOR SELECT USING (auth.uid() = inviter_id);
CREATE POLICY "Users can see invitations sent to them" ON public.couple_invitations FOR SELECT USING (auth.email() = invitee_email);
CREATE POLICY "Users can update their own invitations" ON public.couple_invitations FOR UPDATE USING (auth.uid() = inviter_id);
CREATE POLICY "Invitees can update invitations to them" on public.couple_invitations FOR UPDATE USING (auth.email() = invitee_email);

-- Policies for Shared Data (Tasks, Watchlist, Music)
-- Tasks
CREATE POLICY "Users can manage their own tasks" ON public.tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can see their partner's tasks" ON public.tasks FOR SELECT USING (user_id = (SELECT partner_id FROM public.profiles WHERE id = auth.uid()));

-- Watchlist
CREATE POLICY "Users can manage their own watchlist items" ON public.watchlist_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can see their partner's watchlist items" ON public.watchlist_items FOR SELECT USING (user_id = (SELECT partner_id FROM public.profiles WHERE id = auth.uid()));

-- Music Notes
CREATE POLICY "Users can manage their own music notes" ON public.music_notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can see their partner's music notes" ON public.music_notes FOR SELECT USING (user_id = (SELECT partner_id FROM public.profiles WHERE id = auth.uid()));

-- Storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for Storage
CREATE POLICY "Allow authenticated users to read avatars" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'avatars');
CREATE POLICY "Allow authenticated users to upload avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND auth.uid() = (storage.foldername(name))[1]::uuid);
CREATE POLICY "Allow authenticated users to update their own avatar" ON storage.objects FOR UPDATE TO authenticated USING (auth.uid() = (storage.foldername(name))[1]::uuid);
CREATE POLICY "Allow authenticated users to delete their own avatar" ON storage.objects FOR DELETE TO authenticated USING (auth.uid() = (storage.foldername(name))[1]::uuid);
