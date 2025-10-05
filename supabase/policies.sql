-- Políticas RLS necesarias para la configuración de cuenta.

alter table public.profiles enable row level security;
alter table public.profile_couples enable row level security;
alter table public.couples enable row level security;

do
$$
begin
  if not exists (
    select 1
      from pg_policies
     where schemaname = 'public'
       and tablename = 'profiles'
       and policyname = 'Users can view their profiles'
  ) then
    execute 'create policy "Users can view their profiles" on public.profiles for select using (auth.uid() = id)';
  end if;
end;
$$;

do
$$
begin
  if not exists (
    select 1
      from pg_policies
     where schemaname = 'public'
       and tablename = 'profiles'
       and policyname = 'Users can update their own profiles'
  ) then
    execute 'create policy "Users can update their own profiles" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id)';
  end if;
end;
$$;

do
$$
begin
  if not exists (
    select 1
      from pg_policies
     where schemaname = 'public'
       and tablename = 'profile_couples'
       and policyname = 'Users can view their memberships'
  ) then
    execute 'create policy "Users can view their memberships" on public.profile_couples for select using (auth.uid() = profile_id)';
  end if;
end;
$$;

do
$$
begin
  if not exists (
    select 1
      from pg_policies
     where schemaname = 'public'
       and tablename = 'profile_couples'
       and policyname = 'Users manage their memberships'
  ) then
    execute 'create policy "Users manage their memberships" on public.profile_couples for insert with check (auth.uid() = profile_id)';
  end if;
end;
$$;

do
$$
begin
  if not exists (
    select 1
      from pg_policies
     where schemaname = 'public'
       and tablename = 'profile_couples'
       and policyname = 'Users manage their memberships updates'
  ) then
    execute 'create policy "Users manage their memberships updates" on public.profile_couples for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id)';
  end if;
end;
$$;

do
$$
begin
  if not exists (
    select 1
      from pg_policies
     where schemaname = 'public'
       and tablename = 'couples'
       and policyname = 'Users can read couples for accepted membership'
  ) then
    execute 'create policy "Users can read couples for accepted membership" on public.couples for select using (exists (select 1 from public.profile_couples pc where pc.couple_id = couples.id and pc.profile_id = auth.uid() and pc.status = ''accepted''))';
  end if;
end;
$$;
