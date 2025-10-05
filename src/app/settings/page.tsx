"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Copy, Check, Settings, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { Header } from "@/components/header";
import { PageHeading } from "@/components/page-heading";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CoupleMembersList } from "@/components/profile/couple-members-list";
import { logError, logInfo } from "@/lib/logger";
import {
  THEME_LABELS,
  normalizeThemeName,
  type AppTheme,
} from "@/lib/theme";
import {
  passwordSchema,
  profileSchema,
  themeOptions,
  toPersistedTheme,
  type ThemeOption,
} from "./profile-schema";

/**
 * Importante sobre seguridad/RLS:
 * - Nunca confiamos en "user_id" llegado desde el cliente en el servidor.
 * - Aun así, lo enviamos en el payload para trazabilidad y DX de logs.
 * - Del lado servidor (Edge Function y/o DB RLS) se DEBE verificar que `payload.user_id === auth.uid()`.
 */
interface ManageCoupleRequest {
  action: "join";
  inviteCode?: string;
  /** Enviamos para trazabilidad; el servidor debe validar contra auth.uid() */
  user_id: string;
}

interface ManageCoupleResponse {
  couple: { id: string; name: string | null; inviteCode: string | null } | null;
  membershipStatus: "accepted" | "pending" | "declined";
  membershipRole: "owner" | "member" | null;
}

const MAX_AVATAR_MB = 5;
const ACCEPTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

const themeSelectItems: Array<{ value: ThemeOption; label: string }> = themeOptions.map(
  (value) => {
    const label =
      value === "default"
        ? "Automático (recomendado)"
        : `Tema ${THEME_LABELS[value as AppTheme]}`;

    return { value, label };
  }
);

export default function SettingsPage() {
  const {
    user,
    activeCouple,
    members,
    memberships,
    refreshProfiles,
    isLoading,
  } = useUser();
  const { toast } = useToast();

  // Derivamos el userId autenticado una sola vez; evita leer `user?.id` por todos lados.
  const userId = user?.id ?? null;

  // Estado UI controlado del formulario y operaciones asíncronas.
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [age, setAge] = useState(user?.age ? String(user.age) : "");
  const [contactEmail, setContactEmail] = useState(
    user?.contactEmail ?? user?.accountEmail ?? ""
  );
  const [theme, setTheme] = useState<ThemeOption>(() => {
    const normalized = normalizeThemeName(user?.theme ?? null);
    return normalized ?? "default";
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isCoupleLoading, setIsCoupleLoading] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const confirmedAtLabel = useMemo(() => {
    if (!user?.confirmedAt) return "Pendiente de confirmación";
    try {
      return new Intl.DateTimeFormat("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date(user.confirmedAt));
    } catch (error) {
      logError(
        "SettingsPage.confirmedAt",
        "No pudimos formatear la fecha de confirmación",
        error
      );
      return user.confirmedAt;
    }
  }, [user?.confirmedAt]);

  // Mantén el formulario sincronizado si cambia el usuario en contexto.
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName ?? "");
      setFirstName(user.firstName ?? "");
      setLastName(user.lastName ?? "");
      setNickname(user.nickname ?? "");
      setAge(user.age != null ? String(user.age) : "");
      setContactEmail(user.contactEmail ?? user.accountEmail ?? "");
      const normalizedTheme = normalizeThemeName(user.theme ?? null);
      setTheme(normalizedTheme ?? "default");
      setAvatarFile(null);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [user]);

  // Guardas el tema como null si es "default" para mantener el schema limpio.
  const themeValue = useMemo<AppTheme | null>(() => toPersistedTheme(theme), [
    theme,
  ]);
  const selectedThemeLabel =
    themeValue && THEME_LABELS[themeValue]
      ? `Tema ${THEME_LABELS[themeValue]}`
      : "Automático (recomendado)";

  const avatarPreviewUrl = useMemo(() => {
    if (!avatarFile) return null;
    return URL.createObjectURL(avatarFile);
  }, [avatarFile]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  if (isLoading) {
    return (
      <div className="relative flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_rgba(215,204,230,0.35),_transparent_60%)]">
        <Header />
        <main className="flex flex-1 items-center justify-center px-4 py-16">
          <span className="inline-flex items-center gap-3 rounded-full bg-background/80 px-6 py-3 text-sm font-medium shadow-lg shadow-primary/10">
            <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
            Cargando preferencias seguras…
          </span>
        </main>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="relative flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_rgba(215,204,230,0.35),_transparent_60%)]">
        <Header />
        <main className="flex flex-1 items-center justify-center px-4 py-16">
          <Card className="w-full max-w-md rounded-3xl border border-border/40 bg-card/80 text-center shadow-xl shadow-primary/5 backdrop-blur">
            <CardHeader>
              <CardTitle>Inicia sesión</CardTitle>
              <CardDescription>
                Necesitas una cuenta confirmada para acceder a la configuración.
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  // --- Helpers ---

  const validateAvatarFile = (file: File) => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      throw new Error("Formato inválido. Usa PNG/JPG/WebP.");
    }
    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > MAX_AVATAR_MB) {
      throw new Error(`El avatar supera ${MAX_AVATAR_MB} MB.`);
    }
  };

  const uploadAvatarIfNeeded = async (): Promise<string | null> => {
    if (!avatarFile) return user?.avatarUrl ?? null;

    validateAvatarFile(avatarFile);

    const ext = (avatarFile.name.split(".").pop() ?? "png").toLowerCase();
    // Convención de storage: /<userId>/<timestamp>.<ext>
    const filePath = `${userId}/${Date.now()}.${ext}`;

    logInfo("SettingsPage.handleProfileSave", "Subiendo nuevo avatar", {
      filePath,
    });

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, avatarFile, {
        cacheControl: "3600",
        upsert: true,
        contentType: avatarFile.type || "image/png",
      });

    if (uploadError) {
      logError(
        "SettingsPage.handleProfileSave",
        "Error subiendo avatar",
        uploadError
      );
      throw uploadError;
    }

    const { data: publicData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);
    logInfo("SettingsPage.uploadAvatarIfNeeded", "Avatar publicado", {
      filePath,
      publicData,
    });
    return publicData?.publicUrl ?? null;
  };

  // --- Actions ---

  const handleProfileSave = async () => {
    const result = profileSchema.safeParse({
      displayName,
      firstName,
      lastName,
      nickname,
      age,
      contactEmail,
      theme,
    });
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      toast({
        title: "Revisa los campos del perfil",
        description:
          messages.length > 0
            ? messages.join("\n")
            : "Completa los datos requeridos.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSavingProfile(true);

      const avatarUrl = await uploadAvatarIfNeeded();

      logInfo("SettingsPage.handleProfileSave", "Actualizando perfil", {
        userId,
        theme: themeValue,
        hasAvatar: Boolean(avatarFile),
      });

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          id: userId, // redundante pero explícito (y útil si el server registra columnas)
          display_name: result.data.displayName.trim(),
          first_name: result.data.firstName,
          last_name: result.data.lastName,
          nickname: result.data.nickname,
          age: result.data.age,
          contact_email: result.data.contactEmail,
          theme: themeValue,
          avatar_url: avatarUrl,
        })
        .eq("id", userId);

      if (updateError) {
        throw updateError;
      }

      const previousEmail = user?.accountEmail ?? user?.contactEmail ?? null;
      const emailChanged = result.data.contactEmail !== previousEmail;
      if (emailChanged) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: result.data.contactEmail,
        });

        if (emailError) {
          void supabase
            .from("profiles")
            .update({ contact_email: previousEmail })
            .eq("id", userId);
          throw new Error(
            emailError.message ??
              "No pudimos actualizar el correo electrónico. Intenta nuevamente."
          );
        }
      }

      toast({
        title: "Perfil actualizado",
        description: emailChanged
          ? "Tus datos se guardaron. Revisa tu bandeja para confirmar el nuevo correo."
          : "Tus datos personales y preferencias se guardaron correctamente.",
      });

      await refreshProfiles();
      setAvatarFile(null);
      setContactEmail(result.data.contactEmail);
    } catch (err) {
      logError(
        "SettingsPage.handleProfileSave",
        "No pudimos guardar el perfil",
        err
      );
      toast({
        title: "No pudimos guardar los cambios",
        description:
          err instanceof Error
            ? err.message
            : "Intenta nuevamente en unos minutos.",
        variant: "destructive",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword && !newPassword && !confirmPassword) {
      toast({
        title: "Completa los campos de contraseña",
        description: "Ingresa tu contraseña actual y la nueva contraseña para continuar.",
        variant: "destructive",
      });
      return;
    }

    const passwordResult = passwordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    });

    if (!passwordResult.success) {
      const messages = passwordResult.error.issues.map((issue) => issue.message);
      toast({
        title: "No pudimos actualizar la contraseña",
        description: messages.join("\n"),
        variant: "destructive",
      });
      return;
    }

    const authEmail = user?.accountEmail ?? user?.contactEmail ?? contactEmail;

    try {
      setIsUpdatingPassword(true);

      if (!authEmail) {
        throw new Error("No encontramos un correo autenticado para validar tu sesión.");
      }

      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: passwordResult.data.currentPassword,
      });

      if (reauthError) {
        throw new Error("La contraseña actual no es válida.");
      }

      const { error: passwordError } = await supabase.auth.updateUser({
        password: passwordResult.data.newPassword,
      });

      if (passwordError) {
        throw new Error(
          passwordError.message ?? "No pudimos actualizar la contraseña."
        );
      }

      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña se cambió correctamente.",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      logError(
        "SettingsPage.handlePasswordChange",
        "No pudimos actualizar la contraseña",
        err
      );
      toast({
        title: "No pudimos actualizar la contraseña",
        description:
          err instanceof Error
            ? err.message
            : "Intenta nuevamente en unos minutos.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const invokeManageCouple = async (
    payload: Omit<ManageCoupleRequest, "user_id">
  ) => {
    /**
     * Enviamos `user_id` para trazabilidad y DX, pero el servidor debe validar con `auth.uid()`.
     * En supabase-js v2, `functions.invoke` ya adjunta el JWT de la sesión actual automáticamente.
     */
    setIsCoupleLoading(true);
    try {
      const { data, error } =
        await supabase.functions.invoke<ManageCoupleResponse>(
          "manage-couple",
          {
            body: { ...payload, user_id: userId },
          }
        );

      if (error) {
        throw new Error(error.message ?? "No pudimos procesar la solicitud.");
      }

      logInfo("SettingsPage.invokeManageCouple", "Acción completada", payload);

      toast({
        title: "Actualizamos tu relación",
        description: "Sincronizamos la configuración de pareja.",
      });

      await refreshProfiles();
      setInviteCodeInput("");
      return data;
    } catch (err) {
      logError("SettingsPage.invokeManageCouple", "Falló manage-couple", err);
      throw err;
    } finally {
      setIsCoupleLoading(false);
    }
  };

  const handleJoinCouple = async () => {
    const normalizedCode = inviteCodeInput.trim().toUpperCase();
    if (normalizedCode.length < 4) {
      toast({
        title: "Código demasiado corto",
        description: "Verifica el código compartido por tu pareja.",
        variant: "destructive",
      });
      return;
    }

    try {
      logInfo("SettingsPage.handleJoinCouple", "Uniéndose a pareja", {
        inviteCode: normalizedCode,
        userId,
      });
      await invokeManageCouple({ action: "join", inviteCode: normalizedCode });
    } catch (err) {
      logError(
        "SettingsPage.handleJoinCouple",
        "Error uniéndose a pareja",
        err
      );
      toast({
        title: "No pudimos unirte a esa pareja",
        description:
          err instanceof Error
            ? err.message
            : "Verifica el código e intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  const handleCopyInvite = async () => {
    if (!activeCouple?.inviteCode) return;

    await navigator.clipboard.writeText(activeCouple.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Código copiado",
      description: "Comparte el código con tu pareja.",
    });
  };

  // --- UI ---

  return (
    <div className="relative flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_rgba(215,204,230,0.35),_transparent_60%)]">
      <Header />
      <motion.main
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="mx-auto flex w-full max-w-7xl flex-1 flex-col space-y-10 px-4 pb-16 pt-8 sm:px-6 lg:px-12 xl:px-16"
      >
        <PageHeading
          icon={Settings}
          title="Configuración de la cuenta"
          description="Gestiona tu perfil personal y la relación en pareja con total trazabilidad."
        />

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="flex w-full flex-wrap gap-2 overflow-x-auto rounded-full bg-muted/60 p-1 text-muted-foreground">
            <TabsTrigger
              value="profile"
              className="flex min-w-[140px] flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Perfil
            </TabsTrigger>
            <TabsTrigger
              value="configuration"
              className="flex min-w-[140px] flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition"
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              Configuración
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6 focus-visible:outline-none">
            <motion.section layout className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <Card className="h-full rounded-3xl border border-border/40 bg-card/80 shadow-xl shadow-primary/5 backdrop-blur">
                <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle>Preferencias de perfil</CardTitle>
                    <CardDescription>
                      Actualiza tu información personal y el tema visual preferido.
                    </CardDescription>
                  </div>
                  <div className="rounded-full bg-muted/60 px-4 py-1 text-xs font-medium text-muted-foreground">
                    {selectedThemeLabel}
                  </div>
                </CardHeader>
                <CardContent className="space-y-8">
                  <section className="flex flex-col gap-4 rounded-2xl border border-dashed border-border/40 bg-background/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-20 w-20 border-2 border-primary/40">
                        <AvatarImage
                          src={avatarPreviewUrl ?? user?.avatarUrl ?? undefined}
                          alt={user?.displayName ?? "Avatar"}
                        />
                        <AvatarFallback className="text-lg font-semibold">
                          {(user?.nickname ?? user?.displayName ?? "?").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1 text-sm">
                        <p className="font-semibold text-foreground">{user?.nickname ?? user?.displayName}</p>
                        <p className="text-muted-foreground">Cuenta confirmada: {confirmedAtLabel}</p>
                        {user?.contactEmail ? (
                          <p className="text-muted-foreground">Correo activo: {user.contactEmail}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Los cambios se replican en todos tus dispositivos tras guardar.
                    </div>
                  </section>

                  <div className="grid gap-6 xl:grid-cols-2">
                    <section className="space-y-4 rounded-2xl border border-border/40 bg-background/70 p-5 shadow-inner shadow-primary/5">
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground">Identidad</h3>
                        <p className="text-xs text-muted-foreground">Estos campos se comparten únicamente con tu pareja.</p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">Nombre</Label>
                          <Input
                            id="firstName"
                            autoComplete="given-name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="Ej. Ana"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Apellido</Label>
                          <Input
                            id="lastName"
                            autoComplete="family-name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Ej. Gómez"
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="nickname">Apodo</Label>
                          <Input
                            id="nickname"
                            autoComplete="nickname"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="Cómo te llama tu pareja"
                          />
                          <p className="text-xs text-muted-foreground">Opcional. Usaremos el apodo en tarjetas y recordatorios.</p>
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="displayName">Nombre para mostrar</Label>
                          <Input
                            id="displayName"
                            autoComplete="name"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Tu nombre público"
                            aria-describedby="display-name-helper"
                          />
                          <p id="display-name-helper" className="text-xs text-muted-foreground">
                            Mínimo 1 carácter, máximo 80. Es el nombre que verá tu pareja en la app.
                          </p>
                        </div>
                      </div>
                    </section>
                    <section className="space-y-4 rounded-2xl border border-border/40 bg-background/70 p-5 shadow-inner shadow-primary/5">
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground">Contacto y preferencias</h3>
                        <p className="text-xs text-muted-foreground">Controla cómo nos comunicamos contigo y el estilo visual.</p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="contactEmail">Correo electrónico</Label>
                          <Input
                            id="contactEmail"
                            type="email"
                            autoComplete="email"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            placeholder="tu@email.com"
                          />
                          <p className="text-xs text-muted-foreground">
                            Si lo modificas, te enviaremos un correo para confirmar el cambio.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="age">Edad</Label>
                          <Input
                            id="age"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={age}
                            onChange={(e) => {
                              const next = e.target.value.replace(/[^0-9]/g, "").slice(0, 3);
                              setAge(next);
                            }}
                            placeholder="Ej. 29"
                            aria-describedby="age-helper"
                          />
                          <p id="age-helper" className="text-xs text-muted-foreground">
                            Opcional. Valores entre 0 y 120 años.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="theme">Tema</Label>
                          <Select value={theme} onValueChange={(value) => setTheme(value as ThemeOption)}>
                            <SelectTrigger id="theme">
                              <SelectValue placeholder="Selecciona un tema" />
                            </SelectTrigger>
                            <SelectContent>
                              {themeSelectItems.map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                  {item.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </section>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                    <div className="space-y-2">
                      <Label htmlFor="avatar">Avatar</Label>
                      <Input
                        id="avatar"
                        type="file"
                        accept={ACCEPTED_IMAGE_TYPES.join(",")}
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          setAvatarFile(file);
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        PNG/JPG/WebP hasta {MAX_AVATAR_MB} MB. El recorte se ajusta automáticamente.
                      </p>
                    </div>
                    <div className="space-y-1 rounded-2xl border border-border/40 bg-muted/40 p-3 text-xs text-muted-foreground">
                      <p className="font-semibold text-foreground">Buenas prácticas</p>
                      <p>Utiliza imágenes centradas para optimizar el recorte circular.</p>
                      <p>Evita compartir datos sensibles dentro del avatar.</p>
                    </div>
                  </div>

                  <section className="space-y-4 rounded-2xl border border-border/40 bg-background/70 p-5 shadow-inner shadow-primary/5">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground">Actualizar contraseña</h3>
                        <p className="text-xs text-muted-foreground">
                          Usa al menos 12 caracteres y combina mayúsculas, minúsculas y símbolos para mayor seguridad.
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Contraseña actual</Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          autoComplete="current-password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">Nueva contraseña</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          autoComplete="new-password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePasswordChange}
                        disabled={isUpdatingPassword}
                      >
                        {isUpdatingPassword ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Cambiar contraseña
                      </Button>
                    </div>
                  </section>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      onClick={handleProfileSave}
                      disabled={isSavingProfile}
                      className="w-full sm:w-auto"
                    >
                      {isSavingProfile ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Guardar cambios
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <CoupleMembersList
                currentUserId={userId}
                members={members}
                memberships={memberships}
                activeCouple={activeCouple}
              />
            </motion.section>
          </TabsContent>

          <TabsContent
            value="configuration"
            className="space-y-6 focus-visible:outline-none"
          >
            <motion.section layout className="grid gap-6 lg:grid-cols-2">
              <Card className="h-full rounded-3xl border border-border/40 bg-card/80 shadow-xl shadow-primary/5 backdrop-blur">
                <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle>Gestión de pareja</CardTitle>
                    <CardDescription>
                      Vincula tu cuenta con el código compartido por tu pareja y mantén los datos sincronizados.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <Settings className="h-3.5 w-3.5" aria-hidden="true" />
                    Gestión activa
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {activeCouple ? (
                    <div className="space-y-4 rounded-2xl border border-primary/30 bg-primary/5 p-5 shadow-inner">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Pareja activa</p>
                          <p className="text-lg font-headline text-foreground">
                            {activeCouple.name ?? "Nuestra pareja"}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Vinculo replicado en todos los dispositivos.
                        </div>
                      </div>

                      {activeCouple.inviteCode ? (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <Input value={activeCouple.inviteCode} readOnly aria-label="Código de invitación activo" />
                          <Button onClick={handleCopyInvite} variant="secondary" className="sm:w-auto">
                            {copied ? (
                              <Check className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <Copy className="h-4 w-4" aria-hidden="true" />
                            )}
                            <span className="sr-only">Copiar código</span>
                          </Button>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Esta pareja aún no tiene código para compartir.
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground">
                        Solo se permite una pareja activa por usuario. Contacta soporte para reinicios.
                      </p>
                    </div>
                  ) : (
                    <p className="rounded-2xl border border-dashed border-border/40 bg-background/60 p-4 text-sm text-muted-foreground">
                      Aún no tienes una pareja vinculada. Solicita el código de invitación a tu pareja y actívalo para comenzar a compartir recuerdos.
                    </p>
                  )}

                  <div className="space-y-3 rounded-2xl border border-border/50 bg-card/60 p-5 shadow-sm">
                    <Label htmlFor="inviteCode">Tengo un código de pareja</Label>
                    <Input
                      id="inviteCode"
                      value={inviteCodeInput}
                      onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                      placeholder="Ej. ABCD1234"
                      disabled={Boolean(activeCouple) || isCoupleLoading}
                    />
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <Button
                        onClick={handleJoinCouple}
                        disabled={isCoupleLoading || Boolean(activeCouple)}
                        className="w-full sm:w-auto"
                      >
                        {isCoupleLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Vincular pareja
                      </Button>
                      <p className="text-xs text-muted-foreground sm:ml-3">
                        El titular puede compartir el código desde esta misma sección.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="h-full rounded-3xl border border-border/40 bg-card/80 shadow-xl shadow-primary/5 backdrop-blur">
                <CardHeader>
                  <CardTitle>Recomendaciones de seguridad</CardTitle>
                  <CardDescription>
                    Sigue estas mejores prácticas para proteger tus datos y los de tu pareja.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    • Nunca compartas tu código en redes públicas. Usa canales cifrados o mensajería directa.
                  </p>
                  <p>
                    • Revoca el acceso desde soporte si detectas actividad sospechosa.
                  </p>
                  <p>
                    • Mantén tus dispositivos actualizados y con bloqueo biométrico.
                  </p>
                </CardContent>
              </Card>
            </motion.section>
          </TabsContent>
        </Tabs>
      </motion.main>
    </div>
  );
}
