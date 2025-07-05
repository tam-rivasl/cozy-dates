-- Create Profiles Table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL CHECK (char_length(username) >= 3),
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for Profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Handle new user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username', NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- Create Tasks Table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  photos TEXT[],
  notes TEXT,
  created_by TEXT NOT NULL,
  watchlist_item_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for Tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Policies for Tasks
CREATE POLICY "Users can manage their own tasks" ON public.tasks
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all tasks" ON public.tasks
  FOR SELECT
  TO authenticated
  USING (true);


-- Create Watchlist Items Table
CREATE TABLE public.watchlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  added_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for Watchlist
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;

-- Policies for Watchlist
CREATE POLICY "Users can manage their own watchlist" ON public.watchlist_items
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all watchlist items" ON public.watchlist_items
  FOR SELECT
  TO authenticated
  USING (true);


-- Create Music Notes Table
CREATE TABLE public.music_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  playlist_url TEXT,
  added_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for Music Notes
ALTER TABLE public.music_notes ENABLE ROW LEVEL SECURITY;

-- Policies for Music Notes
CREATE POLICY "Users can manage their own music notes" ON public.music_notes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all music notes" ON public.music_notes
  FOR SELECT
  TO authenticated
  USING (true);


-- Create Storage Bucket for Avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Policies for Avatars Storage
CREATE POLICY "Avatar images are publicly accessible." ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can upload an avatar." ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anyone can update their own avatar." ON storage.objects
  FOR UPDATE
  USING (auth.uid() = owner)
  WITH CHECK (bucket_id = 'avatars');


-- Add foreign key constraint to tasks table
ALTER TABLE public.tasks
ADD CONSTRAINT fk_watchlist_item
FOREIGN KEY (watchlist_item_id)
REFERENCES public.watchlist_items(id)
ON DELETE SET NULL;


-- Add indexes for performance
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_watchlist_items_user_id ON public.watchlist_items(user_id);
CREATE INDEX idx_music_notes_user_id ON public.music_notes(user_id);
