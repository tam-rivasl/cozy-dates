# ADR 2025-03-17 – Revisión de Configuración de Cuenta y Temas

## Contexto
- La vista de configuración necesitaba más datos personales (edad, nombre legal, apodo) y gestión segura de credenciales.
- Existían dos flujos para parejas: crear y unirse; el backend solo garantiza unicidad vía `manage-couple` + RLS.
- La galería de fotos usaba múltiples implementaciones duplicadas y sin experiencia consistente.
- El catálogo de temas debía reflejar nueva identidad (Automático, Terracota, Dark básico) reemplazando el antiguo "dark".

## Decisión
1. **Formulario unificado**: ampliar `profiles` y el UI para capturar datos personales + correo editable; añadir cambio de contraseña con reautenticación.
2. **Couples solo por código**: eliminar la opción de creación directa desde cliente; mantener `manage-couple` con `action: 'join'` y reforzar mensajes UX.
3. **PhotoGallery reutilizable**: extraer componente genérico que limita a 3 previews, muestra `+N` y usa Dialog/Carousel con fondo difuminado.
4. **Temas renombrados**: mapear alias legados a `terracota`, añadir `dark-basic`, `theme-automatic` default y actualizar clases CSS/Tests.

## Consecuencias
- Nuevas columnas en `profiles` requieren migración (`supabase/migrations/20250317T120000_profile_extended_fields.sql`).
- UserContext y componentes deben cargar/normalizar campos extra; se actualizan tests de temas.
- PhotoGallery centraliza la experiencia visual y reduce duplicación; dependencia en Dialog overlay difuminado.
- Usuarios existentes mantienen compatibilidad gracias a `normalizeThemeName` y alias legados.

## Alternativas consideradas
- Mantener botón de "crear pareja" y delegar restricción al backend → descartado por UX confuso.
- Implementar lightbox con librería externa → descartado para evitar dependencias adicionales.
- Guardar "Automático" como tema persistido → se prefirió mapear a `null` para no romper clientes antiguos.

## Estado
Aceptado.
