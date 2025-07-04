
-- Create the tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  photos TEXT[],
  notes TEXT,
  created_by TEXT NOT NULL,
  watchlist_item_id UUID
);

-- Create the watchlist_items table
CREATE TABLE watchlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  added_by TEXT NOT NULL
);

-- Create the music_notes table
CREATE TABLE music_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  notes TEXT,
  playlist_url TEXT,
  added_by TEXT NOT NULL
);

-- Seed initial data for tasks
INSERT INTO tasks (id, title, description, date, category, priority, completed, created_by, photos, notes, watchlist_item_id)
VALUES
  (gen_random_uuid(), 'Movie Night: "La La Land"', 'Get popcorn, blankets, and enjoy a classic romantic movie at home.', now() + interval '3 days', 'Date Night', 'Medium', false, 'Tamara', '{}', 'Remember to buy the extra buttery popcorn!', null),
  (gen_random_uuid(), 'Plan Summer Vacation', 'Research destinations in Italy. Look up flights and hotels.', now() + interval '7 days', 'Travel Plans', 'High', false, 'Carlos', '{}', 'Focus on Tuscany region.', null),
  (gen_random_uuid(), 'Cook Dinner Together', 'Try that new pasta recipe we found.', now() + interval '1 day', 'To-Do', 'Medium', false, 'Tamara', '{}', null, null),
  (gen_random_uuid(), 'Anniversary Dinner', 'Celebrate our 5th anniversary at the fancy restaurant downtown.', now() - interval '30 days', 'Special Event', 'High', true, 'Carlos', '{"https://placehold.co/600x400.png"}', null, null);

-- Seed initial data for watchlist_items
INSERT INTO watchlist_items (id, title, type, status, added_by, notes)
VALUES
  (gen_random_uuid(), 'Dune: Part Two', 'Movie', 'To Watch', 'Carlos', 'Heard the visuals are amazing.'),
  (gen_random_uuid(), 'Shōgun', 'Series', 'To Watch', 'Tamara', null),
  (gen_random_uuid(), 'Past Lives', 'Movie', 'Watched', 'Tamara', 'So beautiful and sad!');

-- Seed initial data for music_notes
INSERT INTO music_notes (id, title, notes, playlist_url, added_by)
VALUES
  (gen_random_uuid(), 'For your morning coffee ☕', 'Thought you might like this chill playlist to start your day. Love you!', 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M', 'Carlos'),
  (gen_random_uuid(), 'Our Anniversary Songs', 'A collection of songs that remind me of us over the years. Happy anniversary, my love.', 'https://music.youtube.com/playlist?list=PL4fGSI1pDJn5kI81J1fYC0_B_k3qByOU5', 'Tamara');
