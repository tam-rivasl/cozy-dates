-- Adds confirmation tracking and enforces single accepted membership per profile.
alter table public.profiles
  add column if not exists confirmed_at timestamptz;

create unique index if not exists profile_couples_single_accepted_idx
  on public.profile_couples(profile_id)
  where status = 'accepted';

-- Ensure users can update and read their own profile information safely.
do 
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Users can update their own profiles'
  ) then
    execute create policy "Users can update their own profiles" on public.profiles
      for update
      using (auth.uid() = id)
      with check (auth.uid() = id);;
  end if;
end;
;

do 
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Users can view their profiles'
  ) then
    execute create policy "Users can view their profiles" on public.profiles
      for select
      using (auth.uid() = id);;
  end if;
end;
;

-- Allow members to inspect their couple memberships.
do 
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profile_couples'
      and policyname = 'Users can view their memberships'
  ) then
    execute create policy "Users can view their memberships" on public.profile_couples
      for select
      using (auth.uid() = profile_id);;
  end if;
end;
;
