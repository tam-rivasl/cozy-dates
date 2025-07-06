-- supabase/migrations/0000_initial_schema.sql

-- 1. PROFILES TABLE
-- This table stores public-facing user data.
-- It's linked to the auth.users table.

CREATE TABLE public.profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username text NOT NULL UNIQUE CHECK (char_length(username) >= 3),
    avatar_url text,
    updated_at timestamp with time zone,
    partner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Comments on Profiles table columns
COMMENT ON COLUMN public.profiles.id IS 'User ID, references auth.users';
COMMENT ON COLUMN public.profiles.username IS 'Public username, must be unique';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to the user''s profile picture';
COMMENT ON COLUMN public.profiles.updated_at IS 'Timestamp of the last profile update';
COMMENT ON COLUMN public.profiles.partner_id IS 'UUID of the linked partner, if any';

-- 2. COUPLE INVITATIONS TABLE
-- This table manages the invitations between users to become partners.

CREATE TABLE public.couple_invitations (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    inviter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    invitee_email text NOT NULL,
    status public.couple_invitation_status NOT NULL DEFAULT 'pending'
);

-- Comments on Couple Invitations table columns
COMMENT ON COLUMN public.couple_invitations.inviter_id IS 'The user who sent the invitation.';
COMMENT ON COLUMN public.couple_invitations.invitee_email IS 'The email of the user being invited.';
COMMENT ON COLUMN public.couple_invitations.status IS 'The status of the invitation (pending, accepted, declined).';


-- 3. TASKS TABLE
-- Stores tasks or date plans created by users.

CREATE TABLE public.tasks (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    title text NOT NULL,
    description text,
    date timestamp with time zone NOT NULL,
    category text NOT NULL,
    priority text NOT NULL,
    completed boolean NOT NULL DEFAULT false,
    photos text[],
    notes text,
    created_by text NOT NULL,
    watchlist_item_id text,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Comments on Tasks table columns
COMMENT ON COLUMN public.tasks.created_by IS 'Username of the user who created the task.';
COMMENT ON COLUMN public.tasks.user_id IS 'The user who owns this task.';


-- 4. WATCHLIST ITEMS TABLE
-- Stores movies and series for the couple's watchlist.

CREATE TABLE public.watchlist_items (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    title text NOT NULL,
    type text NOT NULL, -- 'Movie' or 'Series'
    status text NOT NULL, -- 'To Watch' or 'Watched'
    notes text,
    added_by text NOT NULL,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Comments on Watchlist Items table columns
COMMENT ON COLUMN public.watchlist_items.added_by IS 'Username of the user who added the item.';
COMMENT ON COLUMN public.watchlist_items.user_id IS 'The user who owns this watchlist item.';


-- 5. MUSIC NOTES TABLE
-- Stores musical dedications with playlist links.

CREATE TABLE public.music_notes (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    title text NOT NULL,
    notes text,
    playlist_url text,
    added_by text NOT NULL,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Comments on Music Notes table columns
COMMENT ON COLUMN public.music_notes.added_by IS 'Username of the user who added the note.';
COMMENT ON COLUMN public.music_notes.user_id IS 'The user who owns this music note.';


-- 6. SETUP ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_notes ENABLE ROW LEVEL SECURITY;


-- 7. SQL FUNCTIONS
-- Helper function to get the current user's partner ID.

CREATE OR REPLACE FUNCTION public.get_partner_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT partner_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Function to link two partners
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


-- 8. RLS POLICIES

-- Profiles RLS
CREATE POLICY "Allow authenticated users to view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow user to insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Allow user to update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Couple Invitations RLS
CREATE POLICY "Allow user to see their own invitations" ON public.couple_invitations FOR SELECT USING (inviter_id = auth.uid() OR invitee_email = auth.email());
CREATE POLICY "Allow user to create invitations" ON public.couple_invitations FOR INSERT WITH CHECK (inviter_id = auth.uid());
CREATE POLICY "Allow user to update their own sent invitations" ON public.couple_invitations FOR UPDATE USING (inviter_id = auth.uid());
CREATE POLICY "Allow invitee to update invitation status" ON public.couple_invitations FOR UPDATE USING (invitee_email = auth.email());


-- Shared Data RLS (for tasks, watchlist, music)
-- These policies allow a user to see their own data AND their partner's data.
CREATE POLICY "Allow couple to view shared tasks" ON public.tasks FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id = public.get_partner_id());
CREATE POLICY "Allow couple to view shared watchlist" ON public.watchlist_items FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id = public.get_partner_id());
CREATE POLICY "Allow couple to view shared music notes" ON public.music_notes FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id = public.get_partner_id());

-- These policies only allow users to manage THEIR OWN data.
CREATE POLICY "Allow user to manage their own tasks" ON public.tasks FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Allow user to manage their own watchlist items" ON public.watchlist_items FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Allow user to manage their own music notes" ON public.music_notes FOR ALL USING (user_id = auth.uid());


-- 9. TRIGGERS
-- Trigger to create a profile when a new user signs up.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new.raw_user_meta_data ->> 'username');
  return new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 10. STORAGE
-- Create a bucket for avatars with public access.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for avatar storage:
-- Allow anyone to view avatars.
CREATE POLICY "Allow public read access to avatars"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Allow a user to upload an avatar into their own folder.
-- The folder is named after their user ID.
CREATE POLICY "Allow user to upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'avatars' AND auth.uid() = (storage.foldername(name))[1]::uuid );

-- Allow a user to update their own avatar.
CREATE POLICY "Allow user to update their own avatar"
ON storage.objects FOR UPDATE
USING ( auth.uid() = (storage.foldername(name))[1]::uuid );
