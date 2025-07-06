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
    *   Las políticas RLS permiten a un usuario ver sus tareas y las de su pareja (`user_id = auth.uid() OR user_id = get_partner_id()`), pero solo crear, modificar o eliminar las propias.

4.  **Lista de Seguimiento y Notas Musicales Compartidas**
    *   Las tablas `public.watchlist_items` y `public.music_notes` siguen la misma lógica que las tareas.
    *   Los usuarios pueden ver los elementos añadidos por ambos, pero solo gestionar los que ellos mismos crearon, fomentando la colaboración.

5.  **Almacenamiento de Archivos (Avatares)**
    *   Se configuró un bucket de almacenamiento `avatars` público para imágenes de perfil.
    *   Se implementaron políticas que permiten a los usuarios subir, actualizar y eliminar avatares únicamente dentro de una carpeta con su propio `user_id` (`<user_id>/<nombre_archivo>`), garantizando que nadie pueda modificar las imágenes de otros.

6.  **Automatización con Triggers y Funciones SQL**
    *   Se creó una función `handle_new_user()` y un trigger que crea automáticamente un perfil en `public.profiles` cuando se registra un nuevo usuario.
    *   Se implementó una función `get_partner_id()` para simplificar las políticas RLS, permitiendo a las reglas de la base de datos encontrar fácilmente el ID de la pareja del usuario actual.
    *   Se crearon funciones RPC (`link_partners`, `unlink_partners`) para manejar la lógica de emparejamiento de forma atómica y segura.

## Pasos para la migración del frontend

1.  **Obtener las credenciales de Supabase**:
    *   Ve a tu panel de Supabase.
    *   En la configuración del proyecto, busca la sección de API.
    *   Copia la **URL del proyecto** y la **clave pública anónima (anon public key)**.
2.  **Configurar el entorno**:
    *   Crea un archivo `.env` en la raíz de tu proyecto si no existe.
    *   Añade las siguientes líneas, reemplazando los valores con tus credenciales:
        ```
        NEXT_PUBLIC_SUPABASE_URL=TU_URL_DE_SUPABASE
        NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_CLAVE_ANONIMA
        ```
3.  **Ejecutar la migración SQL**:
    *   En tu panel de Supabase, ve al **SQL Editor**.
    *   Copia todo el contenido de `supabase/migrations/0000_initial_schema.sql`.
    *   Pega el contenido en una nueva consulta y haz clic en **"RUN"**. Esto creará todas las tablas, funciones, triggers y políticas de seguridad necesarias.
4. **Desplegar Edge Functions**:
   * Sigue la documentación de Supabase para desplegar las Edge Functions que se encuentran en la carpeta `supabase/functions`. Necesitarás desplegar las carpetas:
     * `invite-partner`
     * `accept-invitation`
     * `decline-invitation`
     * `unpair-partner`
     * `sync-tasks`

¡Con estos pasos, tu aplicación estará lista y conectada a tu backend de Supabase!
