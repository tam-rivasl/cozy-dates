-- Create the profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile."
  ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Trigger to create a profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new.raw_user_meta_data->>'username');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Set up storage for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar images are publicly accessible."
  ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can upload an avatar."
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anyone can update their own avatar."
  ON storage.objects FOR UPDATE USING (auth.uid() = owner) WITH CHECK (bucket_id = 'avatars');


-- Create tasks table
CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_by text,
    title text NOT NULL,
    description text,
    date timestamp with time zone NOT NULL,
    category text,
    priority text,
    completed boolean DEFAULT false,
    photos text[],
    notes text,
    watchlist_item_id text,
    created_at timestamp with time zone DEFAULT now()
);

-- RLS for tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tasks." 
  ON public.tasks FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own tasks." 
  ON public.tasks FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own tasks." 
  ON public.tasks FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own tasks." 
  ON public.tasks FOR DELETE USING (auth.uid() = owner_id);

-- Create watchlist_items table
CREATE TABLE public.watchlist_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    type text NOT NULL,
    status text NOT NULL,
    notes text,
    added_by text,
    created_at timestamp with time zone DEFAULT now()
);

-- RLS for watchlist_items
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own watchlist items" 
  ON public.watchlist_items FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own watchlist items" 
  ON public.watchlist_items FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watchlist items" 
  ON public.watchlist_items FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watchlist items" 
  ON public.watchlist_items FOR DELETE USING (auth.uid() = user_id);

-- Create music_notes table
CREATE TABLE public.music_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title text,
    notes text,
    playlist_url text,
    added_by text,
    created_at timestamp with time zone DEFAULT now()
);

-- RLS for music_notes
ALTER TABLE public.music_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own music notes" 
  ON public.music_notes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own music notes" 
  ON public.music_notes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own music notes" 
  ON public.music_notes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own music notes" 
  ON public.music_notes FOR DELETE USING (auth.uid() = user_id);


-- Create indexes for performance
CREATE INDEX idx_tasks_owner_id ON public.tasks(owner_id);
CREATE INDEX idx_watchlist_items_user_id ON public.watchlist_items(user_id);
CREATE INDEX idx_music_notes_user_id ON public.music_notes(user_id);

-- Create function to filter tasks
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
        owner_id = auth.uid()
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
    public.profiles p ON t.owner_id = p.id;
