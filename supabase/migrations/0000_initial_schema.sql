-- Create Profiles table
CREATE TABLE public.profiles (
  id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  username text NOT NULL,
  avatar_url text,
  PRIMARY KEY (id),
  UNIQUE (username),
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Create Tasks table
CREATE TABLE public.tasks (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
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
    watchlist_item_id text,
    owner_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    PRIMARY KEY (id)
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view all tasks." ON public.tasks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert their own tasks." ON public.tasks FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own tasks." ON public.tasks FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own tasks." ON public.tasks FOR DELETE USING (auth.uid() = owner_id);

-- Create Watchlist Items table
CREATE TABLE public.watchlist_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    title text NOT NULL,
    type text NOT NULL,
    status text NOT NULL,
    notes text,
    added_by text NOT NULL,
    owner_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    PRIMARY KEY (id)
);
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view all watchlist items." ON public.watchlist_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert their own watchlist items." ON public.watchlist_items FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own watchlist items." ON public.watchlist_items FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own watchlist items." ON public.watchlist_items FOR DELETE USING (auth.uid() = owner_id);

-- Create Music Notes table
CREATE TABLE public.music_notes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    title text NOT NULL,
    notes text NOT NULL,
    playlist_url text NOT NULL,
    added_by text NOT NULL,
    owner_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    PRIMARY KEY (id)
);
ALTER TABLE public.music_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view all music notes." ON public.music_notes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert their own music notes." ON public.music_notes FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own music notes." ON public.music_notes FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own music notes." ON public.music_notes FOR DELETE USING (auth.uid() = owner_id);


-- Set up Storage for Avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar images are publicly accessible."
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

CREATE POLICY "Anyone can upload an avatar."
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'avatars' );

CREATE POLICY "Anyone can update their own avatar."
ON storage.objects FOR UPDATE
TO authenticated
USING ( auth.uid() = owner );

-- Function and Trigger to create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Set up initial data
-- Note: You should create users through the app's sign-up form.
-- The following inserts are examples. You will need to replace the `owner_id`
-- with actual user UUIDs from your `auth.users` table after they sign up.
-- For simplicity, this sample data is commented out. You can add data
-- directly through the app's UI.

/*
-- Example user UUIDs (replace with your actual user UUIDs)
--'tamara_uuid_goes_here'
--'carlos_uuid_goes_here'

-- Populate tasks
INSERT INTO public.tasks (title, description, date, category, priority, completed, created_by, owner_id, photos, notes) VALUES
('Movie Night: "La La Land"', 'Get popcorn, blankets, and enjoy a classic romantic movie at home.', (now() + interval '3 days'), 'Date Night', 'Medium', false, 'Tamara', 'tamara_uuid_goes_here', '{}', 'Remember to buy the extra buttery popcorn!'),
('Plan Summer Vacation', 'Research destinations in Italy. Look up flights and hotels.', (now() + interval '7 days'), 'Travel Plans', 'High', false, 'Carlos', 'carlos_uuid_goes_here', '{}', 'Focus on Tuscany region.'),
('Cook Dinner Together', 'Try that new pasta recipe we found.', (now() + interval '1 day'), 'To-Do', 'Medium', false, 'Tamara', 'tamara_uuid_goes_here', '{}', NULL),
('Anniversary Dinner', 'Celebrate our 5th anniversary at the fancy restaurant downtown.', (now() - interval '30 days'), 'Special Event', 'High', true, 'Carlos', 'carlos_uuid_goes_here', '{"https://placehold.co/600x400.png"}', NULL);

-- Populate watchlist_items
INSERT INTO public.watchlist_items (title, type, status, added_by, owner_id, notes) VALUES
('Dune: Part Two', 'Movie', 'To Watch', 'Carlos', 'carlos_uuid_goes_here', 'Heard the visuals are amazing.'),
('Shōgun', 'Series', 'To Watch', 'Tamara', 'tamara_uuid_goes_here', NULL),
('Past Lives', 'Movie', 'Watched', 'Tamara', 'tamara_uuid_goes_here', 'So beautiful and sad!');

-- Populate music_notes
INSERT INTO public.music_notes (title, notes, playlist_url, added_by, owner_id) VALUES
('For your morning coffee ☕', 'Thought you might like this chill playlist to start your day. Love you!', 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M', 'Carlos', 'carlos_uuid_goes_here'),
('Our Anniversary Songs', 'A collection of songs that remind me of us over the years. Happy anniversary, my love.', 'https://music.youtube.com/playlist?list=PL4fGSI1pDJn5kI81J1fYC0_B_k3qByOU5', 'Tamara', 'tamara_uuid_goes_here');
*/

