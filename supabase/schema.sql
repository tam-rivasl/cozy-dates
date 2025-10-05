-- Esquema relevante para la configuración de cuenta y parejas.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  theme text,
  confirmed_at timestamptz,
  first_name text,
  last_name text,
  nickname text,
  age smallint check (age >= 0 and age <= 120),
  contact_email text,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  name text,
  invite_code text unique,
  created_at timestamptz default timezone('utc', now())
);

create table if not exists public.profile_couples (
  profile_id uuid references public.profiles(id) on delete cascade,
  couple_id uuid references public.couples(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'declined')),
  role text not null check (role in ('owner', 'member')),
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now()),
  primary key (profile_id, couple_id)
);

create unique index if not exists profile_couples_single_accepted_idx
  on public.profile_couples(profile_id)
  where status = 'accepted';
