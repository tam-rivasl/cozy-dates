-- Drop existing objects if they exist, in the correct order to avoid dependency errors
DROP POLICY IF EXISTS "Allow authenticated select access" ON "storage"."objects";
DROP POLICY IF EXISTS "Allow individual avatar update" ON "storage"."objects";
DROP POLICY IF EXISTS "Allow individual avatar upload" ON "storage"."objects";
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.get_partner_id();
DROP FUNCTION IF EXISTS public.link_partners(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.unlink_partners(uuid, uuid);

-- Drop tables in reverse order of creation due to foreign keys
DROP TABLE IF EXISTS public.tasks;
DROP TABLE IF EXISTS public.watchlist_items;
DROP TABLE IF EXISTS public.music_notes;
DROP TABLE IF EXISTS public.couple_invitations;
DROP TABLE IF EXISTS public.profiles;

-- Drop custom types
DROP TYPE IF EXISTS public.couple_invitation_status;
DROP TYPE IF EXISTS public.task_category;
DROP TYPE IF EXISTS public.task_priority;
DROP TYPE IF EXISTS public.watchlist_type;
DROP TYPE IF EXISTS public.watchlist_status;


--
-- Create custom types (ENUMS)
--
CREATE TYPE public.couple_invitation_status AS ENUM ('pending', 'accepted', 'declined');
CREATE TYPE public.task_category AS ENUM ('Date Night', 'Travel Plans', 'To-Do', 'Special Event', 'Movie Day');
CREATE TYPE public.task_priority AS ENUM ('High', 'Medium', 'Low');
CREATE TYPE public.watchlist_type AS ENUM ('Movie', 'Series');
CREATE TYPE public.watchlist_status AS ENUM ('To Watch', 'Watched');


--
-- PROFILES TABLE
-- Stores user-specific information
--
CREATE TABLE public.profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username text UNIQUE NOT NULL,
    avatar_url text,
    updated_at timestamp with time zone,
    partner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

--
-- COUPLE INVITATIONS TABLE
-- Manages invitations for pairing accounts
--
CREATE TABLE public.couple_invitations (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    inviter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    invitee_email text NOT NULL,
    status public.couple_invitation_status DEFAULT 'pending' NOT NULL
);

--
-- TASKS TABLE
-- Stores shared tasks for couples
--
CREATE TABLE public.tasks (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_by text NOT NULL,
    title text NOT NULL,
    description text,
    date timestamp with time zone NOT NULL,
    category public.task_category NOT NULL,
    priority public.task_priority NOT NULL,
    completed boolean NOT NULL DEFAULT false,
    photos text[],
    notes text,
    watchlist_item_id uuid
);

--
-- WATCHLIST ITEMS TABLE
-- Stores movies/series for couples to watch
--
CREATE TABLE public.watchlist_items (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    type public.watchlist_type NOT NULL,
    status public.watchlist_status NOT NULL DEFAULT 'To Watch',
    notes text,
    added_by text NOT NULL
);

--
-- MUSIC NOTES TABLE
-- Stores music dedications between partners
--
CREATE TABLE public.music_notes (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    notes text NOT NULL,
    playlist_url text NOT NULL,
    added_by text NOT NULL
);


--
-- SQL FUNCTIONS & TRIGGERS
--
-- Function to create a profile for a new user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username');
  return new;
end;
$$;

-- Trigger to call handle_new_user on new auth.users signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to get the partner's ID securely
create or replace function public.get_partner_id()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  return (select partner_id from public.profiles where id = auth.uid());
end;
$$;

-- RPC to link partners
CREATE OR REPLACE FUNCTION link_partners(
    inviter_id uuid,
    invitee_id uuid,
    p_invitation_id uuid
) RETURNS void AS $$
BEGIN
    -- Update profiles
    UPDATE public.profiles SET partner_id = invitee_id WHERE id = inviter_id;
    UPDATE public.profiles SET partner_id = inviter_id WHERE id = invitee_id;

    -- Update invitation status
    UPDATE public.couple_invitations SET status = 'accepted' WHERE id = p_invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC to unlink partners
CREATE OR REPLACE FUNCTION unlink_partners(
    user_id_1 uuid,
    user_id_2 uuid
) RETURNS void AS $$
BEGIN
    UPDATE public.profiles SET partner_id = NULL WHERE id = user_id_1;
    UPDATE public.profiles SET partner_id = NULL WHERE id = user_id_2;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

--
-- STORAGE
--
insert into storage.buckets
  (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, '{"image/jpeg","image/png","image/gif","image/webp"}')
on conflict (id) do nothing;


--
-- ROW LEVEL SECURITY (RLS)
--

-- PROFILES RLS
alter table public.profiles enable row level security;
drop policy if exists "Allow individual and partner read access" on public.profiles;
create policy "Allow individual and partner read access" on public.profiles for select using (auth.uid() = id or id = public.get_partner_id());
drop policy if exists "Allow individual insert access" on public.profiles;
create policy "Allow individual insert access" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "Allow individual update access" on public.profiles;
create policy "Allow individual update access" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- COUPLE INVITATIONS RLS
alter table public.couple_invitations enable row level security;
drop policy if exists "Allow inviter and invitee read access" on public.couple_invitations;
create policy "Allow inviter and invitee read access" on public.couple_invitations for select using (inviter_id = auth.uid() or invitee_email = auth.email());
drop policy if exists "Allow individual insert access" on public.couple_invitations;
create policy "Allow individual insert access" on public.couple_invitations for insert with check (inviter_id = auth.uid());
drop policy if exists "Allow invitee to update status" on public.couple_invitations;
create policy "Allow invitee to update status" on public.couple_invitations for update using (invitee_email = auth.email());
drop policy if exists "Allow inviter to delete pending invitation" on public.couple_invitations;
create policy "Allow inviter to delete pending invitation" on public.couple_invitations for delete using (inviter_id = auth.uid());

-- TASKS RLS
alter table public.tasks enable row level security;
drop policy if exists "Allow couple read access" on public.tasks;
create policy "Allow couple read access" on public.tasks for select using (auth.uid() = user_id or user_id = public.get_partner_id());
drop policy if exists "Allow individual insert access" on public.tasks;
create policy "Allow individual insert access" on public.tasks for insert with check (auth.uid() = user_id);
drop policy if exists "Allow individual update access" on public.tasks;
create policy "Allow individual update access" on public.tasks for update using (auth.uid() = user_id);
drop policy if exists "Allow individual delete access" on public.tasks;
create policy "Allow individual delete access" on public.tasks for delete using (auth.uid() = user_id);

-- WATCHLIST ITEMS RLS
alter table public.watchlist_items enable row level security;
drop policy if exists "Allow couple read access" on public.watchlist_items;
create policy "Allow couple read access" on public.watchlist_items for select using (auth.uid() = user_id or user_id = public.get_partner_id());
drop policy if exists "Allow individual insert access" on public.watchlist_items;
create policy "Allow individual insert access" on public.watchlist_items for insert with check (auth.uid() = user_id);
drop policy if exists "Allow individual update access" on public.watchlist_items;
create policy "Allow individual update access" on public.watchlist_items for update using (auth.uid() = user_id);
drop policy if exists "Allow individual delete access" on public.watchlist_items;
create policy "Allow individual delete access" on public.watchlist_items for delete using (auth.uid() = user_id);

-- MUSIC NOTES RLS
alter table public.music_notes enable row level security;
drop policy if exists "Allow couple read access" on public.music_notes;
create policy "Allow couple read access" on public.music_notes for select using (auth.uid() = user_id or user_id = public.get_partner_id());
drop policy if exists "Allow individual insert access" on public.music_notes;
create policy "Allow individual insert access" on public.music_notes for insert with check (auth.uid() = user_id);
drop policy if exists "Allow individual delete access" on public.music_notes;
create policy "Allow individual delete access" on public.music_notes for delete using (auth.uid() = user_id);

-- STORAGE RLS
drop policy if exists "Allow authenticated select access" on storage.objects;
create policy "Allow authenticated select access" on storage.objects for select to authenticated using ( bucket_id = 'avatars' );
drop policy if exists "Allow individual avatar upload" on storage.objects;
create policy "Allow individual avatar upload" on storage.objects for insert to authenticated with check ( bucket_id = 'avatars' and owner = auth.uid() );
drop policy if exists "Allow individual avatar update" on storage.objects;
create policy "Allow individual avatar update" on storage.objects for update to authenticated with check ( bucket_id = 'avatars' and owner = auth.uid() );
