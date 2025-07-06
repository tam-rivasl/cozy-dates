-- supabase/migrations/0000_initial_schema.sql

-- Drop existing tables and types in reverse order of dependency
DROP TABLE IF EXISTS public.tasks;
DROP TABLE IF EXISTS public.watchlist_items;
DROP TABLE IF EXISTS public.music_notes;
DROP TABLE IF EXISTS public.couple_invitations;
DROP TABLE IF EXISTS public.profiles;

DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.get_partner_id();
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


-- Profiles Table
CREATE TABLE
  public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    updated_at TIMESTAMPTZ,
    partner_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
    CONSTRAINT username_length CHECK (char_length(username) >= 3)
  );

-- Function to create a profile for a new user
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, updated_at)
  VALUES (new.id, new.raw_user_meta_data->>'username', now());
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on new user sign-up
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Couple Invitations Table
CREATE TABLE
  public.couple_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    inviter_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    invitee_email TEXT NOT NULL,
    status public.couple_invitation_status DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

-- Watchlist Items Table
CREATE TABLE
  public.watchlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    title TEXT NOT NULL,
    type public.watchlist_type NOT NULL,
    status public.watchlist_status NOT NULL DEFAULT 'To Watch',
    notes TEXT,
    added_by TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

-- Tasks Table
CREATE TABLE
  public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    title TEXT NOT NULL,
    description TEXT,
    date TIMESTAMPTZ NOT NULL,
    category public.task_category NOT NULL,
    priority public.task_priority NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    photos TEXT[],
    notes TEXT,
    created_by TEXT NOT NULL,
    watchlist_item_id UUID REFERENCES public.watchlist_items (id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  
-- Music Notes Table
CREATE TABLE
  public.music_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    title TEXT NOT NULL,
    notes TEXT NOT NULL,
    playlist_url TEXT NOT NULL,
    added_by TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );


-- Helper function to get partner ID
CREATE FUNCTION public.get_partner_id()
RETURNS UUID AS $$
DECLARE
  partner_uuid UUID;
BEGIN
  SELECT partner_id INTO partner_uuid
  FROM public.profiles
  WHERE id = auth.uid();
  RETURN partner_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC function to link partners
CREATE OR REPLACE FUNCTION public.link_partners(
    inviter_id_param UUID,
    invitee_id_param UUID,
    p_invitation_id UUID
)
RETURNS void AS $$
BEGIN
    -- Update both profiles
    UPDATE public.profiles
    SET partner_id = invitee_id_param
    WHERE id = inviter_id_param;

    UPDATE public.profiles
    SET partner_id = inviter_id_param
    WHERE id = invitee_id_param;

    -- Update invitation status
    UPDATE public.couple_invitations
    SET status = 'accepted'
    WHERE id = p_invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC function to unlink partners
CREATE OR REPLACE FUNCTION public.unlink_partners(
    user_id_1 UUID,
    user_id_2 UUID
)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles
    SET partner_id = NULL
    WHERE id = user_id_1;

    UPDATE public.profiles
    SET partner_id = NULL
    WHERE id = user_id_2;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RLS Policies
-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile and their partner's profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR auth.uid() = partner_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Couple Invitations
ALTER TABLE public.couple_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see invitations they sent or received" ON public.couple_invitations FOR SELECT USING (auth.uid() = inviter_id OR auth.jwt()->>'email' = invitee_email);
CREATE POLICY "Users can insert their own invitations" ON public.couple_invitations FOR INSERT WITH CHECK (auth.uid() = inviter_id);
CREATE POLICY "Users can update their own invitations" ON public.couple_invitations FOR UPDATE USING (auth.uid() = inviter_id OR auth.jwt()->>'email' = invitee_email);

-- Tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their and their partner's tasks" ON public.tasks FOR SELECT USING (auth.uid() = user_id OR user_id = get_partner_id());
CREATE POLICY "Users can only insert their own tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update their own tasks" ON public.tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can only delete their own tasks" ON public.tasks FOR DELETE USING (auth.uid() = user_id);

-- Watchlist
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their and their partner's watchlist" ON public.watchlist_items FOR SELECT USING (auth.uid() = user_id OR user_id = get_partner_id());
CREATE POLICY "Users can only insert their own watchlist items" ON public.watchlist_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update their own watchlist items" ON public.watchlist_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can only delete their own watchlist items" ON public.watchlist_items FOR DELETE USING (auth.uid() = user_id);

-- Music Notes
ALTER TABLE public.music_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their and their partner's music notes" ON public.music_notes FOR SELECT USING (auth.uid() = user_id OR user_id = get_partner_id());
CREATE POLICY "Users can only insert their own music notes" ON public.music_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update their own music notes" ON public.music_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can only delete their own music notes" ON public.music_notes FOR DELETE USING (auth.uid() = user_id);

-- Storage Bucket and Policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', TRUE, 4194304, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar images are publicly accessible."
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'avatars' );

CREATE POLICY "Anyone can upload an avatar."
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK ( bucket_id = 'avatars' );

CREATE POLICY "Anyone can update their own avatar."
  ON storage.objects FOR UPDATE
  TO authenticated
  USING ( auth.uid() = owner )
  WITH CHECK ( bucket_id = 'avatars' );

CREATE POLICY "Anyone can delete their own avatar."
  ON storage.objects FOR DELETE
  TO authenticated
  USING ( auth.uid() = owner );
