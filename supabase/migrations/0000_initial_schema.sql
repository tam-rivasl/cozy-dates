-- 1. Create Profiles Table
-- This table stores public user data and is linked to the auth.users table.
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL CHECK (char_length(username) >= 3),
    avatar_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Function to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to call the function upon new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to automatically update the 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update 'updated_at' on profile modification
CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Create Tasks Table
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    title TEXT NOT NULL,
    description TEXT,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    category TEXT NOT NULL,
    priority TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    photos TEXT[],
    notes TEXT,
    created_by TEXT NOT NULL,
    watchlist_item_id TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 3. Create Watchlist Table
CREATE TABLE public.watchlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    notes TEXT,
    added_by TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 4. Create Music Notes Table
CREATE TABLE public.music_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    title TEXT NOT NULL,
    notes TEXT,
    playlist_url TEXT,
    added_by TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 5. Set up Row Level Security (RLS)

-- Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Tasks RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all tasks." ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own tasks." ON public.tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tasks." ON public.tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tasks." ON public.tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Watchlist RLS
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all watchlist items." ON public.watchlist_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own watchlist items." ON public.watchlist_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own watchlist items." ON public.watchlist_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own watchlist items." ON public.watchlist_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Music Notes RLS
ALTER TABLE public.music_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all music notes." ON public.music_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own music notes." ON public.music_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own music notes." ON public.music_notes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own music notes." ON public.music_notes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 6. Set up Storage for Avatars
-- Ensure the bucket 'avatars' exists and is public
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'avatars'
    ) THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('avatars', 'avatars', true);
    END IF;

    -- If the bucket exists but is not public, update it
    UPDATE storage.buckets SET public = true WHERE id = 'avatars';
END $$;


-- Storage RLS Policies for Avatars
-- Allow anyone to view avatars
CREATE POLICY "Anyone can view avatars." 
ON storage.objects FOR SELECT USING ( bucket_id = 'avatars' );

-- Allow authenticated users to upload their own avatar into a folder named with their user_id
CREATE POLICY "Authenticated users can upload their own avatar." 
ON storage.objects FOR INSERT TO authenticated WITH CHECK ( bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text );

-- Allow users to update their own avatar
CREATE POLICY "Users can update their own avatars." 
ON storage.objects FOR UPDATE TO authenticated USING ( bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text );

-- Allow users to delete their own avatar
CREATE POLICY "Users can delete their own avatars." 
ON storage.objects FOR DELETE TO authenticated USING ( bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text );


-- 7. Create Indexes for performance
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_watchlist_items_user_id ON public.watchlist_items(user_id);
CREATE INDEX idx_music_notes_user_id ON public.music_notes(user_id);
