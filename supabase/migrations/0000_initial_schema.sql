-- supabase/migrations/0000_initial_schema.sql

-- Drop existing objects if they exist
DROP POLICY IF EXISTS "Users can see their own and their partner's profiles." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own and their partner's tasks." ON public.tasks;
DROP POLICY IF EXISTS "Users can only insert their own tasks." ON public.tasks;
DROP POLICY IF EXISTS "Users can only update their own tasks." ON public.tasks;
DROP POLICY IF EXISTS "Users can only delete their own tasks." ON public.tasks;
DROP POLICY IF EXISTS "Users can view their own and partner's items" ON public.watchlist_items;
DROP POLICY IF EXISTS "Users can only insert their own items" ON public.watchlist_items;
DROP POLICY IF EXISTS "Users can only update their own items" ON public.watchlist_items;
DROP POLICY IF EXISTS "Users can only delete their own items" ON public.watchlist_items;
DROP POLICY IF EXISTS "Users can view their own and partner's notes" ON public.music_notes;
DROP POLICY IF EXISTS "Users can only insert their own notes" ON public.music_notes;
DROP POLICY IF EXISTS "Users can only update their own notes" ON public.music_notes;
DROP POLICY IF EXISTS "Users can only delete their own notes" ON public.music_notes;
DROP POLICY IF EXISTS "Users can view their own invitations" ON public.couple_invitations;
DROP POLICY IF EXISTS "Users can insert their own invitations" ON public.couple_invitations;
DROP POLICY IF EXISTS "Users can update their own invitations" ON public.couple_invitations;
DROP POLICY IF EXISTS "Users can delete their own invitations" ON public.couple_invitations;

DROP FUNCTION IF EXISTS public.get_partner_id();
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.link_partners(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.unlink_partners(uuid, uuid);

DROP TABLE IF EXISTS public.couple_invitations;
DROP TABLE IF EXISTS public.tasks;
DROP TABLE IF EXISTS public.watchlist_items;
DROP TABLE IF EXISTS public.music_notes;
DROP TABLE IF EXISTS public.profiles;

-- Create public.profiles table
CREATE TABLE public.profiles (
    id uuid NOT NULL,
    updated_at timestamp with time zone,
    username text NOT NULL,
    avatar_url text,
    partner_id uuid,
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT profiles_username_key UNIQUE (username),
    CONSTRAINT username_length CHECK ((char_length(username) >= 3)),
    CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT profiles_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Create public.couple_invitations table
CREATE TABLE public.couple_invitations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    inviter_id uuid NOT NULL,
    invitee_email text NOT NULL,
    status public.couple_invitation_status NOT NULL DEFAULT 'pending'::public.couple_invitation_status,
    CONSTRAINT couple_invitations_pkey PRIMARY KEY (id),
    CONSTRAINT couple_invitations_inviter_id_fkey FOREIGN KEY (inviter_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Create public.tasks table
CREATE TABLE public.tasks (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
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
    user_id uuid NOT NULL,
    CONSTRAINT tasks_pkey PRIMARY KEY (id),
    CONSTRAINT tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create public.watchlist_items table
CREATE TABLE public.watchlist_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    title text NOT NULL,
    type text NOT NULL,
    status text NOT NULL,
    notes text,
    added_by text NOT NULL,
    user_id uuid NOT NULL,
    CONSTRAINT watchlist_items_pkey PRIMARY KEY (id),
    CONSTRAINT watchlist_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create public.music_notes table
CREATE TABLE public.music_notes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    title text NOT NULL,
    notes text,
    playlist_url text,
    added_by text NOT NULL,
    user_id uuid NOT NULL,
    CONSTRAINT music_notes_pkey PRIMARY KEY (id),
    CONSTRAINT music_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- SQL Functions & Triggers
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (new.id, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.get_partner_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select partner_id from public.profiles where id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.link_partners(
    inviter_id uuid,
    invitee_id uuid,
    p_invitation_id uuid
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update profiles
    UPDATE public.profiles SET partner_id = invitee_id WHERE id = inviter_id;
    UPDATE public.profiles SET partner_id = inviter_id WHERE id = invitee_id;

    -- Update invitation status
    UPDATE public.couple_invitations SET status = 'accepted' WHERE id = p_invitation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.unlink_partners(
    user_id_1 uuid,
    user_id_2 uuid
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.profiles SET partner_id = NULL WHERE id = user_id_1;
    UPDATE public.profiles SET partner_id = NULL WHERE id = user_id_2;
END;
$$;

-- Row Level Security (RLS) Policies

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own and their partner's profiles."
ON public.profiles
FOR SELECT USING (
  auth.uid() = id OR auth.uid() = partner_id
);

CREATE POLICY "Users can insert their own profile."
ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile."
ON public.profiles
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);


-- Couple Invitations
ALTER TABLE public.couple_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invitations"
ON public.couple_invitations
FOR SELECT USING (
  inviter_id = auth.uid() OR invitee_email = auth.email()
);

CREATE POLICY "Users can insert their own invitations"
ON public.couple_invitations
FOR INSERT WITH CHECK (
  inviter_id = auth.uid()
);

CREATE POLICY "Users can update their own invitations"
ON public.couple_invitations
FOR UPDATE USING (
  inviter_id = auth.uid() OR invitee_email = auth.email()
);

CREATE POLICY "Users can delete their own invitations"
ON public.couple_invitations
FOR DELETE USING (
  inviter_id = auth.uid()
);

-- Tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own and their partner's tasks."
ON public.tasks
FOR SELECT USING (
  user_id = auth.uid() OR user_id = get_partner_id()
);

CREATE POLICY "Users can only insert their own tasks."
ON public.tasks
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can only update their own tasks."
ON public.tasks
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can only delete their own tasks."
ON public.tasks
FOR DELETE USING (user_id = auth.uid());

-- Watchlist Items
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own and partner's items"
ON public.watchlist_items
FOR SELECT USING (
    user_id = auth.uid() OR user_id = get_partner_id()
);

CREATE POLICY "Users can only insert their own items"
ON public.watchlist_items
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can only update their own items"
ON public.watchlist_items
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can only delete their own items"
ON public.watchlist_items
FOR DELETE USING (user_id = auth.uid());

-- Music Notes
ALTER TABLE public.music_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own and partner's notes"
ON public.music_notes
FOR SELECT USING (
    user_id = auth.uid() OR user_id = get_partner_id()
);

CREATE POLICY "Users can only insert their own notes"
ON public.music_notes
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can only update their own notes"
ON public.music_notes
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can only delete their own notes"
ON public.music_notes
FOR DELETE USING (user_id = auth.uid());

-- Storage Policies
-- Avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, '{"image/jpeg","image/png","image/gif","image/webp"}')
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
