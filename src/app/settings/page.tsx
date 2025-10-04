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
  action: "create" | "join";
  name?: string | null;
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
        ? "Automático"
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
  const [theme, setTheme] = useState<ThemeOption>(() => {
    const normalized = normalizeThemeName(user?.theme ?? null);
    return normalized ?? "default";
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isCoupleLoading, setIsCoupleLoading] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [coupleNameInput, setCoupleNameInput] = useState("");
  const [copied, setCopied] = useState(false);

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
      const normalizedTheme = normalizeThemeName(user.theme ?? null);
      setTheme(normalizedTheme ?? "default");
      setAvatarFile(null);
    }
  }, [user]);

  // Guardas el tema como null si es "default" para mantener el schema limpio.
  const themeValue = useMemo<AppTheme | null>(() => toPersistedTheme(theme), [
    theme,
  ]);
  const selectedThemeLabel =
    themeValue && THEME_LABELS[themeValue]
      ? `Tema ${THEME_LABELS[themeValue]}`
      : "Automático";

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
    const result = profileSchema.safeParse({ displayName, theme });
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      toast({
        title: "Revisa los campos del perfil",
        description: firstIssue?.message ?? "Completa los datos requeridos.",
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
      });

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          id: userId, // redundante pero explícito (y útil si el server registra columnas)
          display_name: result.data.displayName.trim(),
          theme: themeValue,
          avatar_url: avatarUrl,
        })
        .eq("id", userId);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Perfil actualizado",
        description: "Tus preferencias se guardaron correctamente.",
      });

      await refreshProfiles();
      setAvatarFile(null);
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
      setCoupleNameInput("");
      return data;
    } catch (err) {
      logError("SettingsPage.invokeManageCouple", "Falló manage-couple", err);
      throw err;
    } finally {
      setIsCoupleLoading(false);
    }
  };

  const handleCreateCouple = async () => {
    try {
      logInfo(
        "SettingsPage.handleCreateCouple",
        "Creando pareja desde ajustes",
        {
          userId,
        }
      );
      await invokeManageCouple({
        action: "create",
        name: coupleNameInput.trim() || null,
      });
    } catch (err) {
      logError("SettingsPage.handleCreateCouple", "Error creando pareja", err);
      toast({
        title: "No pudimos crear la pareja",
        description: err instanceof Error ? err.message : "Intenta nuevamente.",
        variant: "destructive",
      });
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
        className="container flex-1 space-y-10 px-4 pb-16 pt-8 sm:px-6 lg:px-10"
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
                <CardContent className="space-y-6">
                  <section className="flex flex-col gap-4 rounded-2xl border border-dashed border-border/40 bg-background/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-20 w-20 border-2 border-primary/40">
                        <AvatarImage
                          src={avatarPreviewUrl ?? user?.avatarUrl ?? undefined}
                          alt={user?.displayName ?? "Avatar"}
                        />
                        <AvatarFallback className="text-lg font-semibold">
                          {user?.displayName?.charAt(0).toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1 text-sm">
                        <p className="font-semibold text-foreground">{user?.displayName}</p>
                        <p className="text-muted-foreground">Cuenta confirmada: {confirmedAtLabel}</p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Los cambios se replican en todos tus dispositivos tras guardar.
                    </div>
                  </section>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Nombre para mostrar</Label>
                      <Input
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Tu nombre"
                        aria-describedby="display-name-helper"
                      />
                      <p id="display-name-helper" className="text-xs text-muted-foreground">
                        Mínimo 1 carácter, máximo 80.
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

                  <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
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
                      <p>No compartas datos sensibles dentro del avatar.</p>
                    </div>
                  </div>

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
                      Agrega o comparte tu código seguro para sincronizar agendas y recuerdos.
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
                      Aún no tienes una pareja vinculada. Crea una nueva o ingresa el código que te compartieron.
                    </p>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3 rounded-2xl border border-border/50 bg-card/60 p-5 shadow-sm">
                      <Label htmlFor="coupleName">Crear pareja nueva</Label>
                      <Input
                        id="coupleName"
                        value={coupleNameInput}
                        onChange={(e) => setCoupleNameInput(e.target.value)}
                        placeholder="Nombre opcional"
                        disabled={Boolean(activeCouple) || isCoupleLoading}
                      />
                      <Button
                        onClick={handleCreateCouple}
                        disabled={isCoupleLoading || Boolean(activeCouple)}
                        className="w-full"
                      >
                        {isCoupleLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Crear pareja
                      </Button>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-border/50 bg-card/60 p-5 shadow-sm">
                      <Label htmlFor="inviteCode">Tengo un código</Label>
                      <Input
                        id="inviteCode"
                        value={inviteCodeInput}
                        onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                        placeholder="Ej. ABCD1234"
                        disabled={Boolean(activeCouple) || isCoupleLoading}
                      />
                      <Button
                        onClick={handleJoinCouple}
                        disabled={isCoupleLoading || Boolean(activeCouple)}
                        className="w-full"
                      >
                        {isCoupleLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Unirme con código
                      </Button>
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
