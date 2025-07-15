# Explicación del Sistema de Gestión de Tareas y Entretenimiento con Supabase

## Resumen del Proyecto
He desarrollado un sistema completo de gestión de tareas y entretenimiento utilizando Supabase como backend. El sistema incluye autenticación de usuarios, gestión de perfiles, un sistema de emparejamiento de parejas, tareas, listas de seguimiento para películas/series y notas musicales. Todo está protegido con políticas de seguridad a nivel de fila (Row Level Security) para garantizar que los usuarios solo puedan acceder a sus datos y a los de su pareja, y modificar únicamente los propios.

## Estructura de la Base de Datos y Lógica de Backend
1.  **Sistema de Autenticación y Perfiles**
    *   Utilizo la tabla `auth.users` nativa de Supabase para la autenticación.
    *   Creé una tabla `public.profiles` vinculada a `auth.users` que almacena:
        *   Nombres de usuario únicos (con validación de longitud mínima).
        *   URLs de avatares.
        *   Un `partner_id` (UUID) que vincula a dos perfiles para formar una pareja.
        *   Timestamp de última actualización.
    *   La tabla está protegida con RLS para que los perfiles sean visibles para el usuario autenticado y su pareja, pero solo editables por sus propietarios.

2.  **Sistema de Emparejamiento de Parejas**
    *   Se creó una tabla `public.couple_invitations` para gestionar las invitaciones.
    *   Un usuario puede enviar una invitación al correo de su pareja.
    *   El destinatario puede aceptar o rechazar la invitación.
    *   Al aceptar, una Edge Function de Supabase actualiza el `partner_id` en ambos perfiles, vinculándolos.
    *   Los usuarios pueden desvincular sus cuentas en cualquier momento.

3.  **Gestión de Tareas Compartidas**
    *   La tabla `public.tasks` almacena tareas con:
        *   Título, descripción, fecha, categoría y prioridad.
        *   Referencia al `user_id` del creador.
    *   Las políticas RLS permiten a un usuario ver sus tareas y las de su pareja (`user_id = auth.uid() OR user_id = (SELECT partner_id FROM public.profiles WHERE id = auth.uid())`), pero solo crear, modificar o eliminar las propias.

4.  **Lista de Seguimiento y Notas Musicales Compartidas**
    *   Las tablas `public.watchlist_items` y `public.music_notes` siguen la misma lógica que las tareas.
    *   Los usuarios pueden ver los elementos añadidos por ambos, pero solo gestionar los que ellos mismos crearon, fomentando la colaboración.

5.  **Almacenamiento de Archivos (Avatares)**
    *   Se configuró un bucket de almacenamiento `avatars` público para imágenes de perfil.
    *   Se implementaron políticas que permiten a los usuarios subir, actualizar y eliminar avatares únicamente dentro de una carpeta con su propio `user_id` (`<user_id>/<nombre_archivo>`), garantizando que nadie pueda modificar las imágenes de otros.

6.  **Automatización con Triggers y Funciones SQL**
    *   Se creó una función `handle_new_user()` y un trigger que crea automáticamente un perfil en `public.profiles` cuando se registra un nuevo usuario.
    *   Se crearon funciones RPC (`link_partners`, `unlink_partners`) para manejar la lógica de emparejamiento de forma atómica y segura.

## Pasos para la migración del frontend

1.  **Obtener las credenciales de Supabase**:
    *   Ve a tu panel de Supabase.
    *   En la configuración del proyecto, busca la sección de API.
    *   Copia la **URL del proyecto** y la **clave pública anónima (anon public key)**.
2.  **Configurar el entorno**:
    *   Copia el archivo `.env.example` a `.env` y reemplaza los valores con tus credenciales:
        ```bash
        cp .env.example .env
        ```
    *   Dentro de `.env` encontrarás variables como `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.
3.  **Ejecutar las migraciones SQL**:
    *   En tu panel de Supabase, ve al **SQL Editor**.
    *   **Paso 1: Schema Inicial.** Copia todo el contenido de `supabase/migrations/0000_initial_schema.sql`. Pega el contenido en una nueva consulta y haz clic en **"RUN"**. Esto creará todas las tablas y políticas de seguridad.
    *   **Paso 2: Funciones y Triggers.** Copia el contenido de `supabase/migrations/0001_functions_and_triggers.sql`. Pega el contenido en una nueva consulta y haz clic en **"RUN"**. Esto añadirá la lógica automatizada a tu base de datos.
4. **Desplegar Edge Functions**:
   * Sigue la documentación de Supabase para desplegar las Edge Functions que se encuentran en la carpeta `supabase/functions`. Necesitarás desplegar las carpetas:
     * `invite-partner`
     * `accept-invitation`
     * `decline-invitation`
     * `unpair-partner`
     * `sync-tasks`
5. **Automatizar despliegues con la CLI**:
   * Instala la [CLI de Supabase](https://supabase.com/docs/guides/cli) y ejecuta:
     ```bash
     npm run supabase:deploy
     ```
   * Este comando enviará las migraciones y publicará las funciones anteriores en tu proyecto.
6. **Compilar con base de datos local**:
   * Para que la base de datos se inicie y se sincronice automáticamente durante el desarrollo, ejecuta:
     ```bash
     npm run dev:db
     ```
   * Al compilar la aplicación de producción se aplicarán las migraciones automáticamente con:
     ```bash
     npm run build
     ```

¡Con estos pasos, tu aplicación estará lista y conectada a tu backend de Supabase!
