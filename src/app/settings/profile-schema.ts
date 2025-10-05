import { z } from "zod";
import { AVAILABLE_THEMES, type AppTheme } from "../../lib/theme";

/**
 * Lista de opciones válidas para el selector de tema en la vista de perfil.
 * Incluimos "default" como fallback para respetar el auto-theme actual.
 */
export const themeOptions = ["default", ...AVAILABLE_THEMES] as const;

export type ThemeOption = (typeof themeOptions)[number];

const optionalNameField = z
  .string()
  .trim()
  .max(80, "Usa un texto más corto")
  .transform((value) => (value.length === 0 ? null : value));

const ageField = z
  .preprocess((value) => {
    if (typeof value === "number") {
      return Number.isFinite(value) ? Math.trunc(value) : null;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length === 0) return null;
      const parsed = Number.parseInt(trimmed, 10);
      return Number.isFinite(parsed) ? parsed : Number.NaN;
    }

    return null;
  }, z.number().int().min(0, "La edad debe ser mayor o igual a 0").max(120, "La edad máxima es 120 años").nullable());

/**
 * Schema compartido que valida los campos editables del perfil.
 */
export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "El nombre no puede estar vacío")
    .max(80, "Usa un nombre más corto"),
  firstName: optionalNameField,
  lastName: optionalNameField,
  nickname: optionalNameField,
  age: ageField,
  contactEmail: z
    .string()
    .trim()
    .email("Ingresa un correo electrónico válido"),
  theme: z.enum(themeOptions),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

export const passwordSchema = z
  .object({
    currentPassword: z
      .string()
      .trim()
      .min(8, "La contraseña actual debe tener al menos 8 caracteres"),
    newPassword: z
      .string()
      .trim()
      .min(12, "Usa al menos 12 caracteres en la nueva contraseña"),
    confirmPassword: z
      .string()
      .trim()
      .min(1, "Confirma la nueva contraseña"),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        path: ["confirmPassword"],
        code: z.ZodIssueCode.custom,
        message: "Las contraseñas no coinciden",
      });
    }

    if (data.currentPassword === data.newPassword) {
      ctx.addIssue({
        path: ["newPassword"],
        code: z.ZodIssueCode.custom,
        message: "La nueva contraseña debe ser distinta a la actual",
      });
    }
  });

export type PasswordFormData = z.infer<typeof passwordSchema>;

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
