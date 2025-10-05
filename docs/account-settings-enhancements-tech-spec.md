# Tech Spec – Renovación de Configuración de Cuenta

## Contexto
- Consolidar la edición de perfil en Cozy Dates con nuevos campos personales y controles de seguridad.
- Sustituir la creación de pareja desde el cliente por un flujo único basado en códigos de invitación.
- Mejorar la experiencia visual de galerías de fotos (tareas y recuerdos) con previsualizaciones responsivas y visor inmersivo.
- Introducir catálogo de temas actualizado: Automático (default), Terracota y Dark básico.

## Arquitectura y componentes
- **Next.js (app router, client components)** para la UI (`src/app/settings/page.tsx`).
- **Contextos React** (`UserContext`) consumen Supabase y exponen datos de perfil extendidos.
- **Supabase**: Postgres (tabla `profiles` extendida), Edge Function `manage-couple` para vinculación vía código.
- **PhotoGallery** (`src/components/media/photo-gallery.tsx`) reutiliza Radix Dialog + Embla Carousel para visor reutilizable.

## Tecnologías clave
- Next.js 15 + React 18.
- Supabase JS v2 (auth, storage, funciones edge).
- TailwindCSS + diseño temático CSS custom properties.
- Radix UI (Dialog, Tabs, Cards) y Embla Carousel para UI accesible.

## Contratos y datos
- `profiles` añade columnas: `first_name`, `last_name`, `nickname`, `age`, `contact_email`.
- `profileSchema` (Zod) valida y normaliza payload `{ displayName, firstName, lastName, nickname, age, contactEmail, theme }`.
- `passwordSchema` (Zod) exige verificación de contraseña actual + nueva (>=12 chars).
- Edge function `manage-couple` continúa aceptando `action: 'join'` con `inviteCode` y rechaza duplicados vía RLS.

## Seguridad aplicada
- Validaciones Zod en cliente para inputs nuevos (tipado fuerte y mensajes UX).
- Reautenticación con `signInWithPassword` antes de `updateUser({ password })` en Supabase.
- Reversión best-effort de `contact_email` en DB si falla cambio de correo en Auth.
- Persistencia de temas controlada vía `normalizeThemeName` y clases CSS limitadas.
- RLS reforzado: `profiles`, `profile_couples`, `couples` habilitados en `supabase/policies.sql`.

## Plan de pruebas
1. **Unitarias** (`npm run test`):
   - `theme.test.ts` verifica alias, clases CSS y fallback avatars para nuevos temas.
   - Nuevos esquemas Zod se ejercitan indirectamente al serializar formulario.
2. **Manual/UX**:
   - Guardar perfil con campos válidos e inválidos (ver toasts y mensajes).
   - Cambiar contraseña con errores (contraseña corta, confirmación distinta, actual incorrecta).
   - Vinculación de pareja con código válido/erróneo y visualización de estado activo.
   - Revisión de PhotoGallery en Task/Memories (3 previews, overlay +N, visor responsivo).
   - Verificar temas: Automático, Terracota, Dark básico (contrastes, modo oscuro y fallback avatars).

## Referencias oficiales
- [Next.js App Router Docs](https://nextjs.org/docs/app).
- [Supabase Auth JS v2](https://supabase.com/docs/reference/javascript/auth-updateuser).
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).
- [Radix UI Dialog](https://www.radix-ui.com/primitives/docs/components/dialog).
- [Embla Carousel React](https://www.embla-carousel.com/docs/react/).
- [Zod Validation](https://zod.dev/?id=basic-usage).
