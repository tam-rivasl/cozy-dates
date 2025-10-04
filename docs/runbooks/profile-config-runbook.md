# Runbook – Perfil y Configuración

## Objetivo
Resolver incidencias en la vista de Perfil/Configuración, sincronización de parejas y gestión de temas.

## Checks Rápidos
1. **Logs de consola**: verificar warnings en `UserContext` y `SettingsPage` (browser + server logs de Supabase).
2. **Health Supabase**: confirmar disponibilidad de tablas `profiles`, `profile_couples`, función `manage-couple`.
3. **Storage avatars**: revisar bucket `avatars` cuando el cambio de imagen falle (permisos RLS, tamaño >5MB).

## Troubleshooting
| Problema | Diagnóstico | Acción |
| --- | --- | --- |
| Código de pareja no se copia | `navigator.clipboard` undefined | Se notifica al usuario; sugerir copiar manualmente o revisar permisos HTTPS. |
| Usuario no ve miembros | Revisar `profile_couples` status (`pending/declined`). | Ejecutar `refreshProfiles()` desde consola o depurar RLS. |
| Tema incorrecto | Revisar campo `theme` en `profiles`. | Normalizar con `normalizeThemeName` o actualizar en DB (`blossom`/`dark`). |

## Logs útiles
- `SettingsPage.handleProfileSave`, `SettingsPage.handleJoinCouple` (info/error).
- `UserContext.loadProfiles` para ver membership y aplicación de temas.

## Métricas y Alertas sugeridas
- Conteo de errores en función `manage-couple`.
- Upload failures en bucket `avatars` (> 1/min alerta).
- Distribución de `theme` para detectar valores legacy.

## Límites conocidos
- Solo una pareja activa por usuario (UI comunica restricción).
- Tamaño máximo avatar 5MB (`MAX_AVATAR_MB`).
- Entorno restringido impide nuevas dependencias; usar pipeline Node `--test`.
