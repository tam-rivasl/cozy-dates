-- 1. Profiles Table
-- Stores public-facing user data.
create table if not exists public.profiles (
  id uuid not null,
  updated_at timestamp with time zone,
  username text not null,
  avatar_url text,
  partner_id uuid,
  constraint profiles_pkey primary key (id),
  constraint profiles_username_key unique (username),
  constraint profiles_id_fkey foreign key (id) references auth.users (id) on delete cascade,
  constraint profiles_partner_id_fkey foreign key (partner_id) references auth.users (id) on delete set null,
  constraint profiles_partner_id_key unique (partner_id),
  constraint username_length check (char_length(username) >= 3)
);

-- 2. Handle New User Trigger
-- This trigger automatically creates a profile entry when a new user signs up.
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

-- Drop existing trigger if it exists, then create it
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Couple Invitations Table
-- Stores pending invitations between users.
create table if not exists public.couple_invitations (
    id uuid not null default gen_random_uuid(),
    created_at timestamp with time zone not null default now(),
    inviter_id uuid not null,
    invitee_email text not null,
    status text not null default 'pending',
    constraint couple_invitations_pkey primary key (id),
    constraint couple_invitations_inviter_id_fkey foreign key (inviter_id) references auth.users(id) on delete cascade
);

-- 4. Tasks Table
create table if not exists public.tasks (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  title text not null,
  description text,
  date timestamp with time zone not null,
  category text not null,
  priority text not null,
  completed boolean not null default false,
  photos text[],
  notes text,
  created_by text not null,
  watchlist_item_id text,
  user_id uuid not null,
  constraint tasks_pkey primary key (id),
  constraint tasks_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade
);

-- 5. Watchlist Items Table
create table if not exists public.watchlist_items (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  title text not null,
  type text not null,
  status text not null,
  notes text,
  added_by text not null,
  user_id uuid not null,
  constraint watchlist_items_pkey primary key (id),
  constraint watchlist_items_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade
);

-- 6. Music Notes Table
create table if not exists public.music_notes (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  title text not null,
  notes text,
  playlist_url text,
  added_by text not null,
  user_id uuid not null,
  constraint music_notes_pkey primary key (id),
  constraint music_notes_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade
);

-- 7. SQL Helper Function to get partner_id
create or replace function public.get_partner_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select partner_id from public.profiles where id = auth.uid();
$$;

-- 8. Row Level Security (RLS) Policies

-- RLS for profiles
alter table public.profiles enable row level security;
drop policy if exists "Users can see all profiles." on public.profiles;
create policy "Users can see all profiles."
  on public.profiles for select
  to authenticated
  using ( true );

drop policy if exists "Users can insert their own profile." on public.profiles;
create policy "Users can insert their own profile."
  on public.profiles for insert
  with check ( auth.uid() = id );
  
drop policy if exists "Users can update their own profile." on public.profiles;
create policy "Users can update their own profile."
  on public.profiles for update
  using ( auth.uid() = id );

-- RLS for tasks
alter table public.tasks enable row level security;
drop policy if exists "Users can see their own and their partner's tasks" on public.tasks;
create policy "Users can see their own and their partner's tasks"
  on public.tasks for select
  using ( auth.uid() = user_id OR user_id = get_partner_id() );
  
drop policy if exists "Users can only create their own tasks" on public.tasks;
create policy "Users can only create their own tasks"
  on public.tasks for insert
  with check ( auth.uid() = user_id );

drop policy if exists "Users can only update their own tasks" on public.tasks;
create policy "Users can only update their own tasks"
  on public.tasks for update
  using ( auth.uid() = user_id );

drop policy if exists "Users can only delete their own tasks" on public.tasks;
create policy "Users can only delete their own tasks"
  on public.tasks for delete
  using ( auth.uid() = user_id );

-- RLS for watchlist_items
alter table public.watchlist_items enable row level security;
drop policy if exists "Users can see their own and their partner's watchlist" on public.watchlist_items;
create policy "Users can see their own and their partner's watchlist"
  on public.watchlist_items for select
  using ( auth.uid() = user_id OR user_id = get_partner_id() );

drop policy if exists "Users can only create their own watchlist items" on public.watchlist_items;
create policy "Users can only create their own watchlist items"
  on public.watchlist_items for insert
  with check ( auth.uid() = user_id );
  
drop policy if exists "Users can only update their own watchlist items" on public.watchlist_items;
create policy "Users can only update their own watchlist items"
  on public.watchlist_items for update
  using ( auth.uid() = user_id );

drop policy if exists "Users can only delete their own watchlist items" on public.watchlist_items;
create policy "Users can only delete their own watchlist items"
  on public.watchlist_items for delete
  using ( auth.uid() = user_id );

-- RLS for music_notes
alter table public.music_notes enable row level security;
drop policy if exists "Users can see their own and their partner's music notes" on public.music_notes;
create policy "Users can see their own and their partner's music notes"
  on public.music_notes for select
  using ( auth.uid() = user_id OR user_id = get_partner_id() );

drop policy if exists "Users can only create their own music notes" on public.music_notes;
create policy "Users can only create their own music notes"
  on public.music_notes for insert
  with check ( auth.uid() = user_id );

drop policy if exists "Users can only update their own music notes" on public.music_notes;
create policy "Users can only update their own music notes"
  on public.music_notes for update
  using ( auth.uid() = user_id );

drop policy if exists "Users can only delete their own music notes" on public.music_notes;
create policy "Users can only delete their own music notes"
  on public.music_notes for delete
  using ( auth.uid() = user_id );

-- RLS for couple_invitations
alter table public.couple_invitations enable row level security;
drop policy if exists "Users can create invitations" on public.couple_invitations;
create policy "Users can create invitations"
  on public.couple_invitations for insert
  to authenticated
  with check ( auth.uid() = inviter_id );
  
drop policy if exists "Users can see invitations sent to them" on public.couple_invitations;
create policy "Users can see invitations sent to them"
  on public.couple_invitations for select
  to authenticated
  using ( invitee_email = auth.email() );
  
drop policy if exists "Users can update their own invitations" on public.couple_invitations;
create policy "Users can update their own invitations"
  on public.couple_invitations for update
  to authenticated
  using ( invitee_email = auth.email() );


-- 9. Storage Bucket and Policies
-- Create 'avatars' bucket if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'avatars'
    ) THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('avatars', 'avatars', true);
    END IF;
END $$;

-- Policies for 'avatars' bucket
-- Allow public read access to all avatars
drop policy if exists "Anyone can view avatars" on storage.objects;
create policy "Anyone can view avatars"
on storage.objects
for select
to public
using ( bucket_id = 'avatars' );

-- Allow authenticated users to upload their own avatar into a folder named with their user_id
drop policy if exists "Users can upload their own avatars" on storage.objects;
create policy "Users can upload their own avatars"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars' and
  auth.uid() = (storage.foldername(name))[1]::uuid
);

-- Allow authenticated users to update their own avatar
drop policy if exists "Users can update their own avatars" on storage.objects;
create policy "Users can update their own avatars"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars' and
  auth.uid() = (storage.foldername(name))[1]::uuid
);

-- Allow authenticated users to delete their own avatar
drop policy if exists "Users can delete their own avatars" on storage.objects;
create policy "Users can delete their own avatars"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars' and
  auth.uid() = (storage.foldername(name))[1]::uuid
);


-- 10. RPC Functions for Partner Linking/Unlinking

create or replace function public.link_partners(inviter_id uuid, invitee_id uuid, p_invitation_id uuid)
returns void as $$
begin
  -- Update inviter's profile
  update public.profiles
  set partner_id = invitee_id
  where id = inviter_id;

  -- Update invitee's profile
  update public.profiles
  set partner_id = inviter_id
  where id = invitee_id;
  
  -- Update invitation status
  update public.couple_invitations
  set status = 'accepted'
  where id = p_invitation_id;
end;
$$ language plpgsql security definer;


create or replace function public.unlink_partners(user_id_1 uuid, user_id_2 uuid)
returns void as $$
begin
  -- Remove partner link from user 1
  update public.profiles
  set partner_id = null
  where id = user_id_1;

  -- Remove partner link from user 2
  update public.profiles
  set partner_id = null
  where id = user_id_2;
  
  -- Optionally, delete or archive the invitation
  delete from public.couple_invitations
  where (inviter_id = user_id_1 and invitee_email = (select email from auth.users where id = user_id_2))
     or (inviter_id = user_id_2 and invitee_email = (select email from auth.users where id = user_id_1));

end;
$$ language plpgsql security definer;
