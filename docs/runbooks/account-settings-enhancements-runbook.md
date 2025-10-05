# Runbook – Configuración de Cuenta y Galerías

## Objetivo
Responder rápidamente a incidentes relacionados con edición de perfil, cambio de contraseña, vinculación de pareja y galerías.

## Checklist inicial
1. **Estado Supabase**
   - Panel → Health → Postgres/Storage.
   - Revisión de `profiles`, `profile_couples`, `couples` (latencia, errores 4xx/5xx).
2. **Logs front-end (Vercel/hosting)**
   - Buscar `SettingsPage`/`PhotoGallery` en consola para detectar toasts de error recurrentes.
3. **Edge Functions**
   - Logs `manage-couple` (Dashboard → Functions → Logs) buscando errores de RLS o códigos inexistentes.

## Troubleshooting
| Síntoma | Diagnóstico | Acción |
| --- | --- | --- |
| Error al guardar perfil / toast rojo | `profiles` sin permisos o validación Zod falló | Verificar payload en consola, revisar RLS (`supabase/policies.sql`). |
| Cambio de correo no persiste | `updateUser` devuelve error | Confirmar correo válido, revisar logs Supabase Auth. Reintentar; de ser necesario revertir `profiles.contact_email` al valor anterior. |
| Cambio de contraseña rechaza contraseña actual | `signInWithPassword` falla | Confirmar usuario autenticado (`auth.getUser`). Pedir reautenticación y reintentar. |
| No se puede vincular pareja | Código inválido o usuario ya vinculado | Revisar logs `manage-couple`, confirmar que `profile_couples` no tenga un `status='accepted'` previo. |
| Galería no abre visor | Error en PhotoGallery o recursos 404 | Revisar consola y network tab (imagen 404). Confirmar permisos en bucket `avatars`/fotos. |

## Logs clave
- `SettingsPage.*` (console.info/error) para operaciones de perfil, invitaciones y contraseñas.
- `manage-couple` (Edge Function) para join codes.
- `supabase.auth` eventos (Dashboard → Auth → Logs) para cambios de email/password.

## Métricas/Alertas sugeridas
- Conteo de errores `manage-couple` por código > N en 15min.
- Tasa de fallos en `updateUser` > 5% (Auth logs).
- Latencia de `profiles` > 500 ms promedio.
- SLO UX: menos de 1% de sesiones con toast destructivo en `SettingsPage`.

## Límites conocidos
- `age` validado entre 0 y 120 (Zod y constraint `smallint`).
- Supabase Auth exige contraseñas ≥ 12 caracteres tras esta versión.
- Solo un `profile_couples` con `status='accepted'` por usuario (índice parcial).
- PhotoGallery muestra máximo 3 miniaturas; resto disponible en visor.
