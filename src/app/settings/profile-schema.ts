import { z } from "zod";
import { AVAILABLE_THEMES, type AppTheme } from "../../lib/theme";

/**
 * Lista de opciones válidas para el selector de tema en la vista de perfil.
 * Incluimos "default" como fallback para respetar el auto-theme actual.
 */
export const themeOptions = ["default", ...AVAILABLE_THEMES] as const;

export type ThemeOption = (typeof themeOptions)[number];

/**
 * Schema compartido que valida los campos editables del perfil.
 * - `displayName` requiere contenido legible (1..80 caracteres).
 * - `theme` debe pertenecer al catálogo controlado.
 */
export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "El nombre no puede estar vacío")
    .max(80, "Usa un nombre más corto"),
  theme: z.enum(themeOptions),
});

/**
 * Normaliza el valor del selector al tipo persistido en base de datos.
 * Cuando el usuario elige "default" devolvemos `null` para respetar la lógica automática.
 */
export function toPersistedTheme(option: ThemeOption): AppTheme | null {
  if (option === "default") {
    return null;
  }

  return option as AppTheme;
}
