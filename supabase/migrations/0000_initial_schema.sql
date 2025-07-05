
-- Habilitar la extensión pgcrypto para generar UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- 1. Tabla de Perfiles de Usuario
-- Almacena información pública de los usuarios, vinculada a la tabla `auth.users`.
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL CHECK (char_length(username) >= 3),
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Tabla de Tareas
-- Almacena las tareas de la pareja.
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  category TEXT,
  priority TEXT,
  completed BOOLEAN DEFAULT false,
  photos TEXT[],
  notes TEXT,
  created_by TEXT,
  watchlist_item_id TEXT
);
COMMENT ON COLUMN public.tasks.user_id IS 'Owner of the task';

-- 3. Tabla de Lista de Seguimiento
-- Para películas y series que la pareja quiere ver.
CREATE TABLE IF NOT EXISTS public.watchlist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  added_by TEXT
);
COMMENT ON COLUMN public.watchlist_items.user_id IS 'Owner of the watchlist item';

-- 4. Tabla de Notas Musicales
-- Para guardar dedicatorias y listas de reproducción.
CREATE TABLE IF NOT EXISTS public.music_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  title TEXT NOT NULL,
  notes TEXT,
  playlist_url TEXT,
  added_by TEXT
);
COMMENT ON COLUMN public.music_notes.user_id IS 'Owner of the music note';

-- 5. Bucket de Almacenamiento para Avatares
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE name = 'avatars'
    ) THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('avatars', 'avatars', true);
    END IF;
END $$;


-- 6. Políticas de Seguridad a Nivel de Fila (RLS)

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_notes ENABLE ROW LEVEL SECURITY;

-- Políticas para la tabla de perfiles
CREATE POLICY "Profiles are viewable by everyone." ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile." ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Políticas para la tabla de tareas
CREATE POLICY "Users can manage their own tasks" ON public.tasks
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all tasks" ON public.tasks
    FOR SELECT
    USING (true);

-- Políticas para la lista de seguimiento
CREATE POLICY "Users can manage their own watchlist items" ON public.watchlist_items
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all watchlist items" ON public.watchlist_items
    FOR SELECT
    USING (true);
    
-- Políticas para las notas musicales
CREATE POLICY "Users can manage their own music notes" ON public.music_notes
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all music notes" ON public.music_notes
    FOR SELECT
    USING (true);

-- 7. Políticas de Almacenamiento para Avatares
CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT USING (
    bucket_id = 'avatars'
);

-- 8. Trigger para Crear Perfil de Usuario Automáticamente
-- Esta función se ejecuta después de que un nuevo usuario se registra en `auth.users`
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
begin
  -- Inserta un nuevo perfil usando el `id` y el `username` de los metadatos del nuevo usuario
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username');
  return new;
end;
$$ language plpgsql security definer;

-- Crear el trigger que llama a la función anterior
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 9. Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_user_id ON public.watchlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_music_notes_user_id ON public.music_notes(user_id);

-- 10. Función para filtrar tareas (Ejemplo de función RPC)
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

-- 11. Vista para tareas con información de usuario
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
