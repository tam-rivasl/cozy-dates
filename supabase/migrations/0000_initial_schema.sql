-- supabase/migrations/0000_initial_schema.sql

-- Drop existing objects in reverse order of dependency
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.music_notes;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.watchlist_items;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.tasks;
DROP POLICY IF EXISTS "Users can manage their own invitations" ON public.couple_invitations;
DROP POLICY IF EXISTS "Users can view their own profile and their partner's" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

ALTER TABLE IF EXISTS public.tasks DROP CONSTRAINT IF EXISTS tasks_user_id_fkey;
ALTER TABLE IF EXISTS public.tasks DROP CONSTRAINT IF EXISTS tasks_watchlist_item_id_fkey;
ALTER TABLE IF EXISTS public.watchlist_items DROP CONSTRAINT IF EXISTS watchlist_items_user_id_fkey;
ALTER TABLE IF EXISTS public.music_notes DROP CONSTRAINT IF EXISTS music_notes_user_id_fkey;
ALTER TABLE IF EXISTS public.couple_invitations DROP CONSTRAINT IF EXISTS couple_invitations_inviter_id_fkey;
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_partner_id_fkey;
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP TABLE IF EXISTS public.tasks;
DROP TABLE IF EXISTS public.watchlist_items;
DROP TABLE IF EXISTS public.music_notes;
DROP TABLE IF EXISTS public.couple_invitations;
DROP TABLE IF EXISTS public.profiles;

DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.get_partner_id();
DROP FUNCTION IF EXISTS public.link_partners(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.unlink_partners(uuid, uuid);

DROP TYPE IF EXISTS public.couple_invitation_status;
DROP TYPE IF EXISTS public.task_category;
DROP TYPE IF EXISTS public.task_priority;
DROP TYPE IF EXISTS public.watchlist_type;
DROP TYPE IF EXISTS public.watchlist_status;

-- Create ENUM types
CREATE TYPE public.couple_invitation_status AS ENUM (
    'pending',
    'accepted',
    'declined'
);

CREATE TYPE public.task_category AS ENUM (
    'Date Night',
    'Travel Plans',
    'To-Do',
    'Special Event',
    'Movie Day'
);

CREATE TYPE public.task_priority AS ENUM (
    'High',
    'Medium',
    'Low'
);

CREATE TYPE public.watchlist_type AS ENUM (
    'Movie',
    'Series'
);

CREATE TYPE public.watchlist_status AS ENUM (
    'To Watch',
    'Watched'
);

-- Create profiles table
CREATE TABLE public.profiles (
    id uuid NOT NULL,
    updated_at timestamp with time zone,
    username text,
    avatar_url text,
    partner_id uuid,
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT profiles_username_key UNIQUE (username),
    CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT profiles_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT username_length CHECK ((char_length(username) >= 3))
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create couple_invitations table
CREATE TABLE public.couple_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    inviter_id uuid NOT NULL,
    invitee_email character varying NOT NULL,
    status public.couple_invitation_status DEFAULT 'pending' NOT NULL,
    CONSTRAINT couple_invitations_pkey PRIMARY KEY (id),
    CONSTRAINT couple_invitations_inviter_id_fkey FOREIGN KEY (inviter_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);
ALTER TABLE public.couple_invitations ENABLE ROW LEVEL SECURITY;

-- Create tasks table
CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    title text NOT NULL,
    description text,
    date timestamp with time zone NOT NULL,
    category public.task_category,
    priority public.task_priority,
    completed boolean DEFAULT false NOT NULL,
    photos text[],
    notes text,
    created_by text NOT NULL,
    watchlist_item_id uuid,
    user_id uuid,
    CONSTRAINT tasks_pkey PRIMARY KEY (id),
    CONSTRAINT tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create watchlist_items table
CREATE TABLE public.watchlist_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    title text NOT NULL,
    type public.watchlist_type NOT NULL,
    status public.watchlist_status NOT NULL,
    notes text,
    added_by text NOT NULL,
    user_id uuid,
    CONSTRAINT watchlist_items_pkey PRIMARY KEY (id),
    CONSTRAINT watchlist_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;

-- Add foreign key from tasks to watchlist_items
ALTER TABLE public.tasks
ADD CONSTRAINT tasks_watchlist_item_id_fkey
FOREIGN KEY (watchlist_item_id) REFERENCES public.watchlist_items(id) ON DELETE SET NULL;

-- Create music_notes table
CREATE TABLE public.music_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    title text NOT NULL,
    notes text NOT NULL,
    playlist_url text NOT NULL,
    added_by text NOT NULL,
    user_id uuid,
    CONSTRAINT music_notes_pkey PRIMARY KEY (id),
    CONSTRAINT music_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.music_notes ENABLE ROW LEVEL SECURITY;

-- Create function to handle new users
CREATE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$;

-- Create trigger to call the function on new user signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create helper function to get partner ID
CREATE FUNCTION public.get_partner_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT partner_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Create RPC to link partners
CREATE FUNCTION public.link_partners(inviter_id uuid, invitee_id uuid, p_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update profiles
  UPDATE public.profiles SET partner_id = invitee_id WHERE id = inviter_id;
  UPDATE public.profiles SET partner_id = inviter_id WHERE id = invitee_id;
  
  -- Update invitation status
  UPDATE public.couple_invitations SET status = 'accepted' WHERE id = p_invitation_id;
END;
$$;

-- Create RPC to unlink partners
CREATE FUNCTION public.unlink_partners(user_id_1 uuid, user_id_2 uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.profiles SET partner_id = NULL WHERE id = user_id_1;
  UPDATE public.profiles SET partner_id = NULL WHERE id = user_id_2;
END;
$$;


-- Set up Row Level Security (RLS)
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can view their own profile and their partner's" ON public.profiles FOR SELECT USING (auth.uid() = id OR auth.uid() = partner_id);
CREATE POLICY "Users can manage their own invitations" ON public.couple_invitations FOR ALL USING (auth.uid() = inviter_id OR invitee_email = auth.jwt()->>'email');
CREATE POLICY "Enable all access for authenticated users" ON public.tasks FOR ALL USING (auth.uid() = user_id OR auth.uid() = get_partner_id());
CREATE POLICY "Enable all access for authenticated users" ON public.watchlist_items FOR ALL USING (auth.uid() = user_id OR auth.uid() = get_partner_id());
CREATE POLICY "Enable all access for authenticated users" ON public.music_notes FOR ALL USING (auth.uid() = user_id OR auth.uid() = get_partner_id());

-- Set up storage
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
USING ( auth.uid() = owner )
WITH CHECK ( bucket_id = 'avatars' );

CREATE POLICY "Anyone can delete their own avatar."
ON storage.objects FOR DELETE
TO authenticated
USING ( auth.uid() = owner );
