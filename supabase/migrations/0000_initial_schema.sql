-- Drop existing objects to ensure a clean slate
DROP POLICY IF EXISTS "Users can manage their own invitations" ON public.couple_invitations;
DROP POLICY IF EXISTS "Users can view their own invitations" ON public.couple_invitations;
DROP POLICY IF EXISTS "Users can manage their own music notes" ON public.music_notes;
DROP POLICY IF EXISTS "Users can view their own and partner's notes" ON public.music_notes;
DROP POLICY IF EXISTS "Users can manage their own watchlist items" ON public.watchlist_items;
DROP POLICY IF EXISTS "Users can view their own and partner's watchlist" ON public.watchlist_items;
DROP POLICY IF EXISTS "Users can manage their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view their own and partner's tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own and their partner's profile." ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to upload avatars" ON storage.objects;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.link_partners(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.unlink_partners(uuid, uuid);

DROP TABLE IF EXISTS public.couple_invitations;
DROP TABLE IF EXISTS public.music_notes;
DROP TABLE IF EXISTS public.watchlist_items;
DROP TABLE IF EXISTS public.tasks;
DROP TABLE IF EXISTS public.profiles;

DROP TYPE IF EXISTS public.couple_invitation_status;
DROP TYPE IF EXISTS public.task_category;
DROP TYPE IF EXISTS public.task_priority;
DROP TYPE IF EXISTS public.watchlist_type;
DROP TYPE IF EXISTS public.watchlist_status;

-- Recreate types
CREATE TYPE public.couple_invitation_status AS ENUM ('pending', 'accepted', 'declined');
CREATE TYPE public.task_category AS ENUM ('Date Night', 'Travel Plans', 'To-Do', 'Special Event', 'Movie Day');
CREATE TYPE public.task_priority AS ENUM ('High', 'Medium', 'Low');
CREATE TYPE public.watchlist_type AS ENUM ('Movie', 'Series');
CREATE TYPE public.watchlist_status AS ENUM ('To Watch', 'Watched');

-- Recreate tables in the correct order
CREATE TABLE public.profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    updated_at timestamp with time zone,
    username text UNIQUE,
    avatar_url text,
    partner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT username_length CHECK (char_length(username) >= 3)
);
COMMENT ON TABLE public.profiles IS 'Stores user profile information.';

CREATE TABLE public.couple_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    inviter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    invitee_email text NOT NULL,
    status public.couple_invitation_status DEFAULT 'pending' NOT NULL
);
COMMENT ON TABLE public.couple_invitations IS 'Manages invitations between users to become partners.';

CREATE TABLE public.watchlist_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    title text NOT NULL,
    type public.watchlist_type NOT NULL,
    status public.watchlist_status NOT NULL,
    notes text,
    added_by text NOT NULL,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);
COMMENT ON TABLE public.watchlist_items IS 'Stores movies and series for the couple to watch.';

CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    title text NOT NULL,
    description text,
    date timestamp with time zone NOT NULL,
    category public.task_category NOT NULL,
    priority public.task_priority NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    notes text,
    photos text[],
    created_by text NOT NULL,
    watchlist_item_id uuid REFERENCES public.watchlist_items(id) ON DELETE SET NULL,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);
COMMENT ON TABLE public.tasks IS 'Stores shared tasks and date plans for the couple.';

CREATE TABLE public.music_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    title text NOT NULL,
    notes text NOT NULL,
    playlist_url text NOT NULL,
    added_by text NOT NULL,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);
COMMENT ON TABLE public.music_notes IS 'Stores musical dedications and playlists.';

-- Recreate functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new.raw_user_meta_data->>'username');
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.link_partners(inviter_id uuid, invitee_id uuid, p_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update profiles
  UPDATE public.profiles SET partner_id = invitee_id WHERE id = inviter_id;
  UPDATE public.profiles SET partner_id = inviter_id WHERE id = invitee_id;
  
  -- Update invitation status
  UPDATE public.couple_invitations SET status = 'accepted' WHERE id = p_invitation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.unlink_partners(user_id_1 uuid, user_id_2 uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Remove partner link from both profiles
  UPDATE public.profiles SET partner_id = NULL WHERE id = user_id_1;
  UPDATE public.profiles SET partner_id = NULL WHERE id = user_id_2;
  
  -- Optionally, delete or archive past invitations
  DELETE FROM public.couple_invitations 
  WHERE (inviter_id = user_id_1 AND invitee_email = (SELECT email FROM auth.users WHERE id = user_id_2))
     OR (inviter_id = user_id_2 AND invitee_email = (SELECT email FROM auth.users WHERE id = user_id_1));
END;
$$;

-- Recreate triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Re-enable RLS and recreate policies
-- Profiles Table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own and their partner's profile." ON public.profiles
  FOR SELECT USING (auth.uid() = id OR partner_id = auth.uid());
CREATE POLICY "Users can insert their own profile." ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can delete their own profile." ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- Tasks Table
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own and partner's tasks." ON public.tasks
  FOR SELECT USING (user_id = auth.uid() OR user_id = (SELECT partner_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can manage their own tasks." ON public.tasks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Watchlist Items Table
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own and partner's watchlist." ON public.watchlist_items
  FOR SELECT USING (user_id = auth.uid() OR user_id = (SELECT partner_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can manage their own watchlist items." ON public.watchlist_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Music Notes Table
ALTER TABLE public.music_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own and partner's notes." ON public.music_notes
  FOR SELECT USING (user_id = auth.uid() OR user_id = (SELECT partner_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can manage their own music notes." ON public.music_notes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Couple Invitations Table
ALTER TABLE public.couple_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own invitations." ON public.couple_invitations
  FOR SELECT USING (inviter_id = auth.uid() OR invitee_email = auth.email());
CREATE POLICY "Users can manage their own invitations." ON public.couple_invitations
  FOR ALL USING (inviter_id = auth.uid() OR invitee_email = auth.email());

-- Storage Policies
DROP POLICY IF EXISTS "Allow authenticated users to upload avatars" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Allow authenticated users to update their own avatars" ON storage.objects;
CREATE POLICY "Allow authenticated users to update their own avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Allow authenticated users to delete their own avatars" ON storage.objects;
CREATE POLICY "Allow authenticated users to delete their own avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
