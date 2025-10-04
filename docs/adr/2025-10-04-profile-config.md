# ADR 2025-10-04 – Refactor Perfil y Configuración

## Contexto
El panel de configuración contenía funcionalidades mezcladas, los nombres de temas eran inconsistentes y no existían pruebas automáticas. La restricción del entorno impide instalar nuevas dependencias.

## Decisión
1. **Tabs Perfil/Configuración**: reorganizar `SettingsPage` usando Radix Tabs para separar edición de perfil de la gestión de parejas.
2. **Normalización de temas**: introducir `normalizeThemeName` y renombrar a `Blossom`/`Dark` con paletas actualizadas (Dark adopta terracota/cafés con verdes equilibrados) y compatibilidad con alias legados.
3. **Listados de parejas**: crear `CoupleMembersList` para centralizar la visualización de miembros y estados.
4. **Pruebas con Node `--test`**: compilar subconjunto TS via `tsconfig.test.json` y ejecutar `node --test` evitando dependencias externas.
5. **Ícono inline**: reemplazar `lucide-react` por `UsersGlyph` inline para compatibilidad SSR/tests.

## Consecuencias
- La UI queda modular y responsive, mejorando mantenimiento.
- Tests pueden ejecutarse en entornos restringidos y documentan los contratos críticos.
- Al usar imports relativos se facilita la compilación selectiva.
- Se debe mantener `tsconfig.test.json` en sincronía cuando se agreguen nuevos componentes a probar.
