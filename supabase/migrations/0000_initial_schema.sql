-- Create the profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    avatar_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
-- Add a constraint to ensure username is not empty
ALTER TABLE public.profiles ADD CONSTRAINT username_length CHECK (char_length(username) >= 3);

-- Create the tasks table
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    category TEXT,
    priority TEXT,
    completed BOOLEAN DEFAULT false,
    photos TEXT[],
    notes TEXT,
    created_by TEXT,
    watchlist_item_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create the watchlist_items table
CREATE TABLE public.watchlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT,
    status TEXT,
    notes TEXT,
    added_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create the music_notes table
CREATE TABLE public.music_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    notes TEXT,
    playlist_url TEXT,
    added_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);


-- Function to create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to call the function on new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security for all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_notes ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Allow service role to create profiles, needed for the trigger
DROP POLICY IF EXISTS "Service role can create profiles" ON public.profiles;
CREATE POLICY "Service role can create profiles" ON public.profiles
    FOR INSERT 
    TO authenticated, anon, service_role
    WITH CHECK (true);

-- Policies for tasks
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
CREATE POLICY "Users can view their own tasks" ON public.tasks
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own tasks" ON public.tasks;
CREATE POLICY "Users can insert their own tasks" ON public.tasks
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
CREATE POLICY "Users can update their own tasks" ON public.tasks
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;
CREATE POLICY "Users can delete their own tasks" ON public.tasks
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Policies for watchlist_items
DROP POLICY IF EXISTS "Users can view their own watchlist items" ON public.watchlist_items;
CREATE POLICY "Users can view their own watchlist items" ON public.watchlist_items
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own watchlist items" ON public.watchlist_items;
CREATE POLICY "Users can insert their own watchlist items" ON public.watchlist_items
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own watchlist items" ON public.watchlist_items;
CREATE POLICY "Users can update their own watchlist items" ON public.watchlist_items
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own watchlist items" ON public.watchlist_items;
CREATE POLICY "Users can delete their own watchlist items" ON public.watchlist_items
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Policies for music_notes
DROP POLICY IF EXISTS "Users can view their own music notes" ON public.music_notes;
CREATE POLICY "Users can view their own music notes" ON public.music_notes
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own music notes" ON public.music_notes;
CREATE POLICY "Users can insert their own music notes" ON public.music_notes
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own music notes" ON public.music_notes;
CREATE POLICY "Users can update their own music notes" ON public.music_notes
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own music notes" ON public.music_notes;
CREATE POLICY "Users can delete their own music notes" ON public.music_notes
    FOR DELETE TO authenticated USING (auth.uid() = user_id);


-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_user_id ON public.watchlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_music_notes_user_id ON public.music_notes(user_id);

-- Create custom function for filtering tasks
CREATE OR REPLACE FUNCTION public.get_tasks_by_category_and_priority(
    category_filter text,
    priority_filter text
) RETURNS SETOF public.tasks
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT *
    FROM public.tasks
    WHERE 
        (category_filter IS NULL OR category = category_filter) AND
        (priority_filter IS NULL OR priority = priority_filter) AND
        user_id = auth.uid()
    ORDER BY date ASC;
$$;

-- Create view for tasks with user info
CREATE OR REPLACE VIEW public.tasks_with_user_info
WITH (security_invoker=on)
AS
SELECT 
    t.*,
    p.username as owner_username,
    p.avatar_url as owner_avatar
FROM 
    public.tasks t
JOIN 
    public.profiles p ON t.user_id = p.id;

-- 1. Create the 'avatars' bucket if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE name = 'avatars'
    ) THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('avatars', 'avatars', true); -- Set to true for public access
    END IF;
END $$;

-- 2. Drop existing RLS policies for 'avatars' bucket to avoid conflicts
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload avatars with their user ID" ON storage.objects;


-- 3. Create new RLS policies for the 'avatars' bucket
CREATE POLICY "Users can upload their own avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view avatars"
ON storage.objects
FOR SELECT
TO authenticated, anon
USING (
    bucket_id = 'avatars'
);
