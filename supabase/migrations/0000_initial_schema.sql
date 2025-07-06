-- supabase/migrations/0000_initial_schema.sql

-- Drop existing objects in reverse order of creation to avoid dependency issues
DROP POLICY IF EXISTS "Users can delete their own music notes" ON public.music_notes;
DROP POLICY IF EXISTS "Users can update their own music notes" ON public.music_notes;
DROP POLICY IF EXISTS "Users can insert their own music notes" ON public.music_notes;
DROP POLICY IF EXISTS "Users can view own and partner's music notes" ON public.music_notes;
ALTER TABLE IF EXISTS public.music_notes DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can delete their own watchlist items" ON public.watchlist_items;
DROP POLICY IF EXISTS "Users can update their own watchlist items" ON public.watchlist_items;
DROP POLICY IF EXISTS "Users can insert their own watchlist items" ON public.watchlist_items;
DROP POLICY IF EXISTS "Users can view own and partner's watchlist items" ON public.watchlist_items;
ALTER TABLE IF EXISTS public.watchlist_items DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view own and partner's tasks" ON public.tasks;
ALTER TABLE IF EXISTS public.tasks DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can delete their own invitations" ON public.couple_invitations;
DROP POLICY IF EXISTS "Users can update their own invitation status" ON public.couple_invitations;
DROP POLICY IF EXISTS "Users can insert their own invitations" ON public.couple_invitations;
DROP POLICY IF EXISTS "Users can view their own invitations" ON public.couple_invitations;
ALTER TABLE IF EXISTS public.couple_invitations DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own and partner profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.unlink_partners(user_id_1 uuid, user_id_2 uuid);
DROP FUNCTION IF EXISTS public.link_partners(inviter_id uuid, invitee_id uuid, p_invitation_id uuid);

DROP TABLE IF EXISTS public.music_notes;
DROP TABLE IF EXISTS public.tasks;
DROP TABLE IF EXISTS public.watchlist_items;
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

-- Create profiles table
CREATE TABLE public.profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username text UNIQUE,
    avatar_url text,
    updated_at timestamp with time zone,
    partner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT username_length CHECK (char_length(username) >= 3)
);
COMMENT ON TABLE public.profiles IS 'Stores user profile information.';

-- Create couple_invitations table
CREATE TABLE public.couple_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    inviter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    invitee_email text NOT NULL,
    status public.couple_invitation_status DEFAULT 'pending' NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.couple_invitations IS 'Stores invitations for users to become partners.';

-- Create watchlist_items table
CREATE TABLE public.watchlist_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    title text NOT NULL,
    type public.watchlist_type NOT NULL,
    status public.watchlist_status NOT NULL,
    notes text,
    added_by text NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.watchlist_items IS 'Stores movies and series for couples to watch.';

-- Create tasks table
CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    title text NOT NULL,
    description text,
    date timestamp with time zone NOT NULL,
    category public.task_category NOT NULL,
    priority public.task_priority NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    photos text[],
    notes text,
    created_by text NOT NULL,
    watchlist_item_id uuid REFERENCES public.watchlist_items(id) ON DELETE SET NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.tasks IS 'Stores shared tasks and date plans for couples.';

-- Create music_notes table
CREATE TABLE public.music_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    title text NOT NULL,
    notes text,
    playlist_url text NOT NULL,
    added_by text NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.music_notes IS 'Stores musical dedications between partners.';

-- Function to create a profile for a new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$;

-- Trigger to call handle_new_user on new user sign-up
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- RPC function to link partners
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

-- RPC function to unlink partners
CREATE OR REPLACE FUNCTION public.unlink_partners(user_id_1 uuid, user_id_2 uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update first user's profile
  UPDATE public.profiles
  SET partner_id = NULL
  WHERE id = user_id_1;

  -- Update second user's profile
  UPDATE public.profiles
  SET partner_id = NULL
  WHERE id = user_id_2;
END;
$$;


-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can view own and partner profile" ON public.profiles FOR SELECT USING ((auth.uid() = id) OR (EXISTS ( SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.partner_id = profiles.id)));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for couple_invitations
CREATE POLICY "Users can view their own invitations" ON public.couple_invitations FOR SELECT USING ((auth.uid() = inviter_id) OR (auth.jwt()->>'email' = invitee_email));
CREATE POLICY "Users can insert their own invitations" ON public.couple_invitations FOR INSERT WITH CHECK ((auth.uid() = inviter_id));
CREATE POLICY "Users can update their own invitation status" ON public.couple_invitations FOR UPDATE USING ((auth.jwt()->>'email' = invitee_email) OR (auth.uid() = inviter_id));
CREATE POLICY "Users can delete their own invitations" ON public.couple_invitations FOR DELETE USING ((auth.uid() = inviter_id));

-- RLS Policies for tasks
CREATE POLICY "Users can view own and partner's tasks" ON public.tasks FOR SELECT USING ((auth.uid() = user_id) OR (EXISTS ( SELECT 1 FROM public.profiles p WHERE (p.id = auth.uid()) AND (p.partner_id = tasks.user_id))));
CREATE POLICY "Users can insert their own tasks" ON public.tasks FOR INSERT WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own tasks" ON public.tasks FOR UPDATE USING ((auth.uid() = user_id));
CREATE POLICY "Users can delete their own tasks" ON public.tasks FOR DELETE USING ((auth.uid() = user_id));

-- RLS Policies for watchlist_items
CREATE POLICY "Users can view own and partner's watchlist items" ON public.watchlist_items FOR SELECT USING ((auth.uid() = user_id) OR (EXISTS ( SELECT 1 FROM public.profiles p WHERE (p.id = auth.uid()) AND (p.partner_id = watchlist_items.user_id))));
CREATE POLICY "Users can insert their own watchlist items" ON public.watchlist_items FOR INSERT WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own watchlist items" ON public.watchlist_items FOR UPDATE USING ((auth.uid() = user_id));
CREATE POLICY "Users can delete their own watchlist items" ON public.watchlist_items FOR DELETE USING ((auth.uid() = user_id));

-- RLS Policies for music_notes
CREATE POLICY "Users can view own and partner's music notes" ON public.music_notes FOR SELECT USING ((auth.uid() = user_id) OR (EXISTS ( SELECT 1 FROM public.profiles p WHERE (p.id = auth.uid()) AND (p.partner_id = music_notes.user_id))));
CREATE POLICY "Users can insert their own music notes" ON public.music_notes FOR INSERT WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own music notes" ON public.music_notes FOR UPDATE USING ((auth.uid() = user_id));
CREATE POLICY "Users can delete their own music notes" ON public.music_notes FOR DELETE USING ((auth.uid() = user_id));

-- Create Storage Bucket for Avatars
-- Note: This part cannot be run in the SQL editor directly.
-- You need to create a bucket named 'avatars' in the Supabase Storage section
-- and apply the policies below.

/*
-- Policy: Allow public read access to avatars
CREATE POLICY "Public read access for avatars"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Policy: Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow authenticated users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow authenticated users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
*/
