
-- ### TAREAS INICIALES: HABILITAR EXTENSIONES Y LIMPIAR (OPCIONAL) ###

-- Habilitar la extensión pgcrypto si no está habilitada (necesaria para gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

-- (Opcional) Borrar tablas existentes para una migración limpia. 
-- ¡CUIDADO! Esto eliminará todos los datos.
/*
DROP TABLE IF EXISTS "public"."tasks" CASCADE;
DROP TABLE IF EXISTS "public"."watchlist_items" CASCADE;
DROP TABLE IF EXISTS "public"."music_notes" CASCADE;
DROP TABLE IF EXISTS "public"."couple_invitations" CASCADE;
DROP TABLE IF EXISTS "public"."profiles" CASCADE;
*/


-- ### TABLA DE PERFILES (PROFILES) ###
-- Almacena datos públicos de los usuarios, extendiendo la tabla auth.users.

CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone,
    "username" "text" UNIQUE,
    "avatar_url" "text",
    "partner_id" "uuid" UNIQUE,
    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "username_length" CHECK (char_length(username) >= 3),
    CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "profiles_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL
);

-- Habilitar RLS
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

-- Políticas para PROFILES
CREATE POLICY "Public profiles are viewable by authenticated users." 
ON "public"."profiles" FOR SELECT 
TO "authenticated"
USING (true);

CREATE POLICY "Users can insert their own profile." 
ON "public"."profiles" FOR INSERT 
TO "authenticated"
WITH CHECK ("auth"."uid"() = "id");

CREATE POLICY "Users can update their own profile." 
ON "public"."profiles" FOR UPDATE 
TO "authenticated"
USING ("auth"."uid"() = "id")
WITH CHECK ("auth"."uid"() = "id");


-- ### TRIGGER PARA CREAR PERFILES AUTOMÁTICAMENTE ###
-- Se ejecuta cada vez que un nuevo usuario se registra en auth.users.

CREATE OR REPLACE FUNCTION "public"."handle_new_user"()
RETURNS "trigger"
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$;

-- Crear el trigger si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END
$$;


-- ### TABLA DE INVITACIONES (COUPLE_INVITATIONS) ###
-- Gestiona las invitaciones pendientes entre usuarios.

CREATE TABLE IF NOT EXISTS "public"."couple_invitations" (
    "id" "uuid" NOT NULL DEFAULT "gen_random_uuid"(),
    "created_at" timestamp with time zone NOT NULL DEFAULT "now"(),
    "inviter_id" "uuid" NOT NULL,
    "invitee_email" "text" NOT NULL,
    "status" "text" NOT NULL DEFAULT 'pending',
    CONSTRAINT "couple_invitations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "couple_invitations_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

-- Habilitar RLS
ALTER TABLE "public"."couple_invitations" ENABLE ROW LEVEL SECURITY;

-- Políticas para COUPLE_INVITATIONS
CREATE POLICY "Users can see invitations sent to or by them."
ON "public"."couple_invitations" FOR SELECT
TO "authenticated"
USING ("auth"."uid"() = "inviter_id" OR "auth"."current_user_email"() = "invitee_email");

CREATE POLICY "Users can create invitations."
ON "public"."couple_invitations" FOR INSERT
TO "authenticated"
WITH CHECK ("auth"."uid"() = "inviter_id");

CREATE POLICY "Users can update their own invitations (e.g., cancel)."
ON "public"."couple_invitations" FOR UPDATE
TO "authenticated"
USING ("auth"."uid"() = "inviter_id");

CREATE POLICY "Invitees can update the status of their invitations."
ON "public"."couple_invitations" FOR UPDATE
TO "authenticated"
USING ("auth"."current_user_email"() = "invitee_email");


-- ### FUNCIÓN AUXILIAR: OBTENER ID DEL COMPAÑERO ###
-- Facilita la escritura de políticas RLS para datos compartidos.

CREATE OR REPLACE FUNCTION "public"."get_partner_id"()
RETURNS "uuid"
LANGUAGE "sql"
SECURITY DEFINER
AS $$
  SELECT partner_id FROM public.profiles WHERE id = auth.uid()
$$;


-- ### TABLA DE TAREAS (TASKS) ###
-- Almacena las tareas y planes de la pareja.

CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" NOT NULL DEFAULT "gen_random_uuid"(),
    "created_at" timestamp with time zone NOT NULL DEFAULT "now"(),
    "title" "text" NOT NULL,
    "description" "text",
    "date" "timestamp" with time zone NOT NULL,
    "category" "text" NOT NULL,
    "priority" "text" NOT NULL,
    "completed" "bool" NOT NULL DEFAULT false,
    "photos" "text"[],
    "notes" "text",
    "created_by" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "watchlist_item_id" "uuid",
    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

-- Habilitar RLS
ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;

-- Políticas para TASKS
CREATE POLICY "Users can view their own tasks and their partner's tasks."
ON "public"."tasks" FOR SELECT
TO "authenticated"
USING (("auth"."uid"() = "user_id") OR (("get_partner_id"() IS NOT NULL) AND ("get_partner_id"() = "user_id")));

CREATE POLICY "Users can create their own tasks."
ON "public"."tasks" FOR INSERT
TO "authenticated"
WITH CHECK ("auth"."uid"() = "user_id");

CREATE POLICY "Users can update their own tasks."
ON "public"."tasks" FOR UPDATE
TO "authenticated"
USING ("auth"."uid"() = "user_id");

CREATE POLICY "Users can delete their own tasks."
ON "public"."tasks" FOR DELETE
TO "authenticated"
USING ("auth"."uid"() = "user_id");


-- ### TABLA DE LISTA DE SEGUIMIENTO (WATCHLIST_ITEMS) ###

CREATE TABLE IF NOT EXISTS "public"."watchlist_items" (
    "id" "uuid" NOT NULL DEFAULT "gen_random_uuid"(),
    "created_at" timestamp with time zone NOT NULL DEFAULT "now"(),
    "title" "text" NOT NULL,
    "type" "text" NOT NULL,
    "status" "text" NOT NULL,
    "notes" "text",
    "added_by" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    CONSTRAINT "watchlist_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "watchlist_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

-- Habilitar RLS
ALTER TABLE "public"."watchlist_items" ENABLE ROW LEVEL SECURITY;

-- Políticas para WATCHLIST_ITEMS
CREATE POLICY "Users can view their own and partner's watchlist."
ON "public"."watchlist_items" FOR SELECT
TO "authenticated"
USING (("auth"."uid"() = "user_id") OR (("get_partner_id"() IS NOT NULL) AND ("get_partner_id"() = "user_id")));

CREATE POLICY "Users can insert their own watchlist items."
ON "public"."watchlist_items" FOR INSERT
TO "authenticated"
WITH CHECK ("auth"."uid"() = "user_id");

CREATE POLICY "Users can update their own watchlist items."
ON "public"."watchlist_items" FOR UPDATE
TO "authenticated"
USING ("auth"."uid"() = "user_id");

CREATE POLICY "Users can delete their own watchlist items."
ON "public"."watchlist_items" FOR DELETE
TO "authenticated"
USING ("auth"."uid"() = "user_id");


-- ### TABLA DE NOTAS MUSICALES (MUSIC_NOTES) ###

CREATE TABLE IF NOT EXISTS "public"."music_notes" (
    "id" "uuid" NOT NULL DEFAULT "gen_random_uuid"(),
    "created_at" timestamp with time zone NOT NULL DEFAULT "now"(),
    "title" "text" NOT NULL,
    "notes" "text",
    "playlist_url" "text",
    "added_by" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    CONSTRAINT "music_notes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "music_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

-- Habilitar RLS
ALTER TABLE "public"."music_notes" ENABLE ROW LEVEL SECURITY;

-- Políticas para MUSIC_NOTES
CREATE POLICY "Users can view their own and partner's music notes."
ON "public"."music_notes" FOR SELECT
TO "authenticated"
USING (("auth"."uid"() = "user_id") OR (("get_partner_id"() IS NOT NULL) AND ("get_partner_id"() = "user_id")));

CREATE POLICY "Users can insert their own music notes."
ON "public"."music_notes" FOR INSERT
TO "authenticated"
WITH CHECK ("auth"."uid"() = "user_id");

CREATE POLICY "Users can update their own music notes."
ON "public"."music_notes" FOR UPDATE
TO "authenticated"
USING ("auth"."uid"() = "user_id");

CREATE POLICY "Users can delete their own music notes."
ON "public"."music_notes" FOR DELETE
TO "authenticated"
USING ("auth"."uid"() = "user_id");


-- ### ALMACENAMIENTO (STORAGE) ###
-- Bucket para avatares de perfil

INSERT INTO "storage"."buckets" (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 4194304, ARRAY['image/jpeg','image/png','image/gif','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Políticas para el bucket AVATARS
CREATE POLICY "Avatar images are publicly accessible." 
ON "storage"."objects" FOR SELECT 
TO "public"
USING ("bucket_id" = 'avatars');

CREATE POLICY "Users can upload their own avatar." 
ON "storage"."objects" FOR INSERT 
TO "authenticated"
WITH CHECK (("bucket_id" = 'avatars') AND ("owner" = "auth"."uid"()) AND (storage.foldername(name))[1] = "auth"."uid"()::text);

CREATE POLICY "Users can update their own avatar." 
ON "storage"."objects" FOR UPDATE 
TO "authenticated"
USING (("bucket_id" = 'avatars') AND ("owner" = "auth"."uid"()) AND (storage.foldername(name))[1] = "auth"."uid"()::text);

CREATE POLICY "Users can delete their own avatar."
ON "storage"."objects" FOR DELETE
TO "authenticated"
USING (("bucket_id" = 'avatars') AND ("owner" = "auth"."uid"()) AND (storage.foldername(name))[1] = "auth"."uid"()::text);


-- ### FUNCIONES RPC ###
-- Lógica de negocio para vincular y desvincular parejas de forma segura.

CREATE OR REPLACE FUNCTION "public"."link_partners"("inviter_id" "uuid", "invitee_id" "uuid", "p_invitation_id" "uuid")
RETURNS "void"
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
BEGIN
  -- Actualizar el perfil del invitador
  UPDATE public.profiles
  SET partner_id = invitee_id
  WHERE id = inviter_id;

  -- Actualizar el perfil del invitado
  UPDATE public.profiles
  SET partner_id = inviter_id
  WHERE id = invitee_id;
  
  -- Actualizar el estado de la invitación
  UPDATE public.couple_invitations
  SET status = 'accepted'
  WHERE id = p_invitation_id;
END;
$$;


CREATE OR REPLACE FUNCTION "public"."unlink_partners"("user_id_1" "uuid", "user_id_2" "uuid")
RETURNS "void"
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
BEGIN
  -- Quitar el partner_id de ambos perfiles
  UPDATE public.profiles
  SET partner_id = NULL
  WHERE id = user_id_1;

  UPDATE public.profiles
  SET partner_id = NULL
  WHERE id = user_id_2;
END;
$$;

