-- 0000_initial_schema.sql

-- 1. Create Profiles Table
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  username text NOT NULL,
  avatar_url text,
  updated_at timestamp with time zone,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT profiles_username_key UNIQUE (username),
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);
COMMENT ON TABLE public.profiles IS 'Public profile data for each user.';

-- 2. Create Watchlist Table
CREATE TABLE public.watchlist_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  title text NOT NULL,
  type text NOT NULL,
  status text NOT NULL,
  notes text,
  added_by text NOT NULL,
  CONSTRAINT watchlist_items_pkey PRIMARY KEY (id),
  CONSTRAINT watchlist_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);
COMMENT ON TABLE public.watchlist_items IS 'Items for the couple''s watchlist.';

-- 3. Create Tasks Table
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
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
  watchlist_item_id uuid,
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT tasks_watchlist_item_id_fkey FOREIGN KEY (watchlist_item_id) REFERENCES public.watchlist_items(id) ON DELETE SET NULL
);
COMMENT ON TABLE public.tasks IS 'Individual tasks or date plans.';
COMMENT ON COLUMN public.tasks.created_by IS 'Username of the creator, for display purposes.';

-- 4. Create Music Notes Table
CREATE TABLE public.music_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  title text NOT NULL,
  notes text,
  playlist_url text,
  added_by text NOT NULL,
  CONSTRAINT music_notes_pkey PRIMARY KEY (id),
  CONSTRAINT music_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);
COMMENT ON TABLE public.music_notes IS 'Music notes and playlist dedications.';

-- 5. Set up User Profile Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new.raw_user_meta_data->>'username');
  return new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. Set up Storage Bucket for Avatars
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'avatars'
    ) THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('avatars', 'avatars', true);
    ELSE
        UPDATE storage.buckets SET public = true WHERE name = 'avatars';
    END IF;
END $$;


-- 7. Row Level Security (RLS) Policies

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users." ON public.profiles;
CREATE POLICY "Public profiles are viewable by authenticated users." ON public.profiles
    FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile." ON public.profiles
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- TASKS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tasks are viewable by all authenticated users." ON public.tasks;
CREATE POLICY "Tasks are viewable by all authenticated users." ON public.tasks
    FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can manage their own tasks." ON public.tasks;
CREATE POLICY "Users can manage their own tasks." ON public.tasks
    FOR INSERT, UPDATE, DELETE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- WATCHLIST
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Watchlist is viewable by all authenticated users." ON public.watchlist_items;
CREATE POLICY "Watchlist is viewable by all authenticated users." ON public.watchlist_items
    FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can manage their own watchlist items." ON public.watchlist_items;
CREATE POLICY "Users can manage their own watchlist items." ON public.watchlist_items
    FOR INSERT, UPDATE, DELETE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- MUSIC NOTES
ALTER TABLE public.music_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Music notes are viewable by all authenticated users." ON public.music_notes;
CREATE POLICY "Music notes are viewable by all authenticated users." ON public.music_notes
    FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can manage their own music notes." ON public.music_notes;
CREATE POLICY "Users can manage their own music notes." ON public.music_notes
    FOR INSERT, UPDATE, DELETE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- STORAGE: AVATARS
DROP POLICY IF EXISTS "Allow public read access for avatars" ON storage.objects;
CREATE POLICY "Public read access for avatars" ON storage.objects
    FOR SELECT USING ( bucket_id = 'avatars' );
DROP POLICY IF EXISTS "Allow authenticated users to upload avatars" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload avatars" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK ( bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1] );
DROP POLICY IF EXISTS "Allow authenticated users to update their own avatar" ON storage.objects;
CREATE POLICY "Allow authenticated users to update their own avatar" ON storage.objects
    FOR UPDATE TO authenticated USING ( bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1] );
DROP POLICY IF EXISTS "Allow authenticated users to delete their own avatar" ON storage.objects;
CREATE POLICY "Allow authenticated users to delete their own avatar" ON storage.objects
    FOR DELETE TO authenticated USING ( bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1] );
