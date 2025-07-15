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

## Pasos para la configuración del backend local con Supabase CLI

1.  **Instalar Supabase CLI**:
    *   Sigue las instrucciones oficiales para [instalar la CLI de Supabase](https://supabase.com/docs/guides/cli) en tu sistema.

2.  **Iniciar Supabase localmente**:
    *   Desde la raíz de este proyecto, ejecuta el siguiente comando:
        ```bash
        supabase start
        ```
    *   Este comando iniciará los contenedores de Docker necesarios para Supabase. Al finalizar, te proporcionará las **credenciales locales**, incluyendo la URL y la `anon_key`.

3.  **Aplicar las migraciones**:
    *   Con Supabase corriendo, aplica las migraciones de la base de datos con el siguiente comando:
        ```bash
        supabase db reset
        ```
    *   Esto ejecutará todos los scripts SQL que se encuentran en la carpeta `supabase/migrations` en el orden correcto.

4. **Desplegar Edge Functions**:
   * Despliega las funciones que se encuentran en la carpeta `supabase/functions` con el siguiente comando:
     ```bash
     supabase functions deploy --no-verify-jwt
     ```
   * El flag `--no-verify-jwt` es útil para el desarrollo local.

¡Con estos pasos, tu backend de Supabase estará corriendo localmente y listo para que conectes tu aplicación frontend!
