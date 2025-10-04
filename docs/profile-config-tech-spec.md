# Tech Spec – Perfil y Configuración

## Contexto
La vista de configuración mezclaba acciones de perfil con la gestión de parejas, usaba nombres de temas obsoletos (Tamara/Carlos) y carecía de pruebas automatizadas. Además, los íconos de avatar se recortaban y no existía documentación operativa para los nuevos flujos.

## Alcance
- Separar la UI en pestañas **Perfil** y **Configuración**.
- Normalizar temas a **Blossom** y **Dark** con nuevas paletas (Dark ahora usa terracota, cafés profundos y verdes bosque accesibles).
- Mostrar miembros de pareja(s) y permitir copiar/invitar con código.
- Ajustar componente `Avatar` para evitar deformaciones.
- Agregar pruebas Node `--test` (unitarias + integración renderToStaticMarkup).
- Añadir documentación auxiliar (README, Runbook, ADR, C4, Tech Spec).

## Arquitectura & Flujos
- `SettingsPage` (client component) consume `UserContext` y renderiza pestañas usando Radix Tabs.
- Nueva UI `CoupleMembersList` centraliza la visualización de parejas/miembros.
- Utilidad `theme.ts` concentra normalización y mapeo de clases, compartida por frontend y tests.
- Pruebas: `npm run test` compila subconjunto TS (`tsconfig.test.json`) a `dist-test` y ejecuta Node `--test`.

```
UserContext -> SettingsPage (Tabs) -> Perfil (Formulario + Summary) -> Supabase
                                   -> Configuración (Invites/Join) -> Edge Function manage-couple
CoupleMembersList <- members/memberships <- Supabase profile_couples
```

## Tecnologías
- Next.js 15 (app router), React 18, Radix UI, Tailwind.
- Node `--test` + TypeScript compiler para pruebas sin dependencias adicionales.
- Supabase JS v2 para storage y funciones.

## Contratos & Datos
- `profiles` tabla: campos usados `id`, `display_name`, `avatar_url`, `theme` (normalizado).
- `profile_couples` y `couples`: lectura de `status`, `role`, `invite_code`.
- Edge Function `manage-couple`: recibe `{ action, name?, inviteCode?, user_id }`.

## Seguridad
- Validación con Zod en formulario de perfil (nombre y tema).
- Guardas existentes de Supabase (RLS) siguen aplicando; se enfatiza logging de `user_id`.
- Copia de código usa `navigator.clipboard` con fallback y evita exponer secretos.

## Experiencia de Usuario
- Perfil: formulario responsive, summary de cuenta y lista de miembros.
- Configuración: cards independientes para copiar código, crear y unirse.
- Avatar: `object-cover` + centrado para mantener proporciones.
- Tema **Dark** actualizado a gama terracota/café con acentos verdes para sesiones nocturnas.

## Plan de Pruebas
- `npm run lint`, `npm run typecheck` (manual).
- `npm run test`: compila tests TS -> JS y ejecuta Node `--test` (unit + integración).
- Validación manual responsiva en breakpoints móviles/desktop.

## Riesgos y Mitigaciones
- **Compatibilidad de temas antiguos**: `normalizeThemeName` mantiene alias (`tamara`→`blossom`, `carlos`→`dark`).
- **Dependencias bloqueadas**: se evitó instalar librerías nuevas usando Node `--test` y wrappers inline.
- **SSR icons**: se reemplazó dependencia de `lucide-react` por ícono inline.

## Referencias
- [Next.js App Router Docs](https://nextjs.org/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Node.js Test Runner](https://nodejs.org/docs/latest/api/test.html)
- [Radix UI Tabs](https://www.radix-ui.com/primitives/docs/components/tabs)
