
-- Profiles Table
create table public.profiles (
  id uuid not null primary key,
  username text unique,
  avatar_url text,
  updated_at timestamp with time zone default now()
);

alter table public.profiles
  add constraint fk_profiles_id
  foreign key (id) 
  references auth.users(id)
  on delete cascade;

-- Tasks Table
create table public.tasks (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
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
  created_at timestamp with time zone default now()
);

-- Watchlist Items Table
create table public.watchlist_items (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  type text not null,
  status text not null,
  notes text,
  added_by text not null,
  created_at timestamp with time zone default now()
);

-- Music Notes Table
create table public.music_notes (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  notes text not null,
  playlist_url text not null,
  added_by text not null,
  created_at timestamp with time zone default now()
);

-- Function to handle new user
create function public.handle_new_user()
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

-- Trigger for new user
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Indexes for performance
create index idx_tasks_user_id on public.tasks(user_id);
create index idx_watchlist_items_user_id on public.watchlist_items(user_id);
create index idx_music_notes_user_id on public.music_notes(user_id);

-- RLS Policies
-- Profiles
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can update their own profile." on public.profiles for update using (auth.uid() = id);
create policy "Users can delete their own profile." on public.profiles for delete using (auth.uid() = id);

-- Tasks
alter table public.tasks enable row level security;
create policy "Users can perform all operations on their own tasks" on public.tasks for all using (auth.uid() = user_id);

-- Watchlist Items
alter table public.watchlist_items enable row level security;
create policy "Users can perform all operations on their own watchlist items" on public.watchlist_items for all using (auth.uid() = user_id);

-- Music Notes
alter table public.music_notes enable row level security;
create policy "Users can perform all operations on their own music notes" on public.music_notes for all using (auth.uid() = user_id);


-- Storage Policies
-- Avatars
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, '{"image/jpeg","image/png","image/gif"}');

create policy "Avatar images are publicly accessible."
on storage.objects for select
using ( bucket_id = 'avatars' );

create policy "Anyone can upload an avatar."
on storage.objects for insert
with check ( bucket_id = 'avatars' );

create policy "Anyone can update their own avatar."
on storage.objects for update
using ( auth.uid() = owner )
with check ( bucket_id = 'avatars' );

-- Task Photos
insert into storage.buckets (id, name, public)
values ('task_photos', 'task_photos', false);

create policy "Users can view their own task photos."
on storage.objects for select
using ( auth.uid() = owner and bucket_id = 'task_photos' );

create policy "Users can upload task photos."
on storage.objects for insert
with check ( auth.uid() = owner and bucket_id = 'task_photos' );
