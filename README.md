# Explicación del Sistema de Gestión de Tareas y Entretenimiento con Supabase

## Resumen del Proyecto
He desarrollado un sistema completo de gestión de tareas y entretenimiento utilizando Supabase como backend. El sistema incluye autenticación de usuarios, gestión de perfiles, tareas, listas de seguimiento para películas/series y notas musicales. Todo está protegido con políticas de seguridad a nivel de fila (Row Level Security) para garantizar que los usuarios solo puedan acceder y modificar sus propios datos.

## Estructura de la Base de Datos
1. **Sistema de Autenticación y Perfiles**
   - Utilizo la tabla `auth.users` nativa de Supabase para la autenticación.
   - Creé una tabla `public.profiles` vinculada a `auth.users` que almacena:
     - Nombres de usuario únicos (con validación de longitud mínima).
     - URLs de avatares.
     - Timestamp de última actualización.
   - La tabla está protegida con RLS para que los perfiles sean visibles públicamente, pero solo editables por sus propietarios.
2. **Gestión de Tareas**
   - La tabla `public.tasks` almacena tareas con:
     - Título, descripción, fecha, categoría y prioridad.
     - Estado de completado.
     - Fotos y notas adicionales.
     - Referencia al propietario (`user_id` vinculado a `auth.users`).
   - Políticas RLS que permiten a usuarios autenticados ver todas las tareas, pero solo modificar las propias.
3. **Lista de Seguimiento de Entretenimiento**
   - La tabla `public.watchlist_items` guarda elementos para ver:
     - Películas y series con su título, tipo y estado.
     - Notas personales sobre cada elemento.
   - Vinculación al propietario con políticas RLS similares a las tareas.
4. **Notas Musicales**
   - La tabla `public.music_notes` permite a los usuarios guardar:
     - Títulos y notas sobre música.
     - URLs de listas de reproducción.
   - Vinculación al propietario con las mismas políticas de seguridad.
5. **Almacenamiento de Archivos**
   - Se configuró un bucket de almacenamiento `avatars` para imágenes de perfil.
   - Se implementaron políticas que permiten:
     - Acceso público para visualizar avatares.
     - Subida, actualización y eliminación de avatares solo para usuarios autenticados y dueños del archivo.
6. **Automatización**
   - Se creó una función `handle_new_user()` y un trigger asociado que:
     - Se activa automáticamente cuando se registra un nuevo usuario.
     - Extrae el nombre de usuario de los metadatos.
     - Crea automáticamente un perfil en `public.profiles`.
7. **Edge Functions**
    - `sync-tasks` permite sincronizar tareas con servicios externos.

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
    *   Pega el contenido en una nueva consulta y haz clic en **"RUN"**.
4. **Desplegar Edge Functions**:
   * Sigue la documentación de Supabase para desplegar las Edge Functions que se encuentran en la carpeta `supabase/functions`.

¡Con estos pasos, tu aplicación estará lista y conectada a tu backend de Supabase!
