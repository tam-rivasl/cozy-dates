import { logWarn } from './logger';

/**
 * Lista de temas disponibles para la experiencia de Cozy Dates.
 * Mantener sincronizado con la configuración de Tailwind/CSS.
 */
export type AppTheme = 'blossom' | 'terracota' | 'dark-basic';

const LEGACY_THEME_ALIASES: Record<string, AppTheme> = {
  blossom: 'blossom',
  tamara: 'blossom',
  'theme-blossom': 'blossom',
  dark: 'terracota',
  terracota: 'terracota',
  terracotta: 'terracota',
  carlos: 'terracota',
  'theme-dark': 'terracota',
  'theme-terracota': 'terracota',
  'dark-basic': 'dark-basic',
  darkbasic: 'dark-basic',
  'theme-dark-basic': 'dark-basic',
};

const THEME_CLASS_REGISTRY: Record<AppTheme, string[]> = {
  blossom: ['theme-blossom'],
  terracota: ['theme-terracota'],
  'dark-basic': ['dark', 'theme-dark-basic'],
};

/**
 * Normaliza cualquier valor que venga de Supabase o del cliente para mapearlo a los nombres actuales.
 * Retorna `null` si el valor no es reconocido.
 */
export function normalizeThemeName(rawTheme: string | null | undefined): AppTheme | null {
  if (!rawTheme) return null;
  const cleaned = rawTheme.trim().toLowerCase();
  if (!cleaned) return null;

  if (cleaned === 'automatic' || cleaned === 'default') {
    return null;
  }

  const mapped = LEGACY_THEME_ALIASES[cleaned];
  if (!mapped) {
    logWarn('theme.normalizeThemeName', 'Tema desconocido, retornamos null', { rawTheme });
    return null;
  }

  return mapped;
}

/**
 * Determina si un tema requiere las clases de modo oscuro global.
 */
export function isDarkTheme(theme: AppTheme | null): boolean {
  return theme === 'dark-basic';
}

/**
 * Obtiene las clases CSS que se deben aplicar al elemento root para un tema dado.
 */
export function getThemeClassList(theme: AppTheme | null): string[] {
  if (!theme) return [];
  return THEME_CLASS_REGISTRY[theme] ?? [];
}

/**
 * Devuelve la ruta del avatar ilustrativo sugerido para cada tema.
 */
export function getFallbackAvatarForTheme(theme: AppTheme | null): string | undefined {
  if (theme === 'blossom') return '/img/blossom.png';
  if (theme === 'terracota') return '/img/carlos.png';
  if (theme === 'dark-basic') return '/img/dark.png';
  return undefined;
}

/**
 * Permite exponer los nombres válidos para controles de UI (Select, etc.).
 */
export const AVAILABLE_THEMES: AppTheme[] = ['blossom', 'terracota', 'dark-basic'];

export const THEME_LABELS: Record<AppTheme, string> = {
  blossom: 'Blossom',
  terracota: 'Terracota',
  'dark-basic': 'Dark básico',
};

