"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Copy, Check, Users, Settings } from "lucide-react";
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
import { logError, logInfo } from "@/lib/logger";

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

export default function SettingsPage() {
  const { user, activeCouple, refreshProfiles, isLoading } = useUser();
  const { toast } = useToast();

  // Derivamos el userId autenticado una sola vez; evita leer `user?.id` por todos lados.
  const userId = user?.id ?? null;

  // Estado UI
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [theme, setTheme] = useState(user?.theme ?? "default");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isCoupleLoading, setIsCoupleLoading] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [coupleNameInput, setCoupleNameInput] = useState("");
  const [copied, setCopied] = useState(false);

  // Mantén el formulario sincronizado si cambia el usuario en contexto.
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName ?? "");
      setTheme(user.theme ?? "default");
      setAvatarFile(null);
    }
  }, [user]);

  // Guardas el tema como null si es "default" para mantener el schema limpio.
  const themeValue = useMemo(
    () => (theme === "default" ? null : theme),
    [theme]
  );

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Inicia sesión</CardTitle>
            <CardDescription>
              Necesitas una cuenta confirmada para acceder a la configuración.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
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
    logInfo("SettingsPage.uploadAvatarIfNeeded", "traer avatar subido", {
      filePath,
      publicData,
    });
    return publicData?.publicUrl ?? null;
  };

  // --- Actions ---

  const handleProfileSave = async () => {
    /**
     * Puntos clave:
     * - RLS en `profiles`: UPDATE permitido solo si `auth.uid() = id`.
     * - Mandamos `eq("id", userId)` para ser explícitos y para evitar updates masivos por error.
     * - No usamos upsert aquí: preferimos fallar si no existe el row (consistencia).
     */
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
          display_name: displayName.trim(),
          theme: themeValue,
          avatar_url: avatarUrl,
          // Opcional: updated_at: new Date().toISOString(),
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
        await supabase.functions.invoke<ManageCoupleResponse>("manage-couple", {
          body: { ...payload, user_id: userId },
        });

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
        name: coupleNameInput || null,
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
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="container flex-1 space-y-8 pb-12 pt-8"
      >
        <PageHeading
          icon={Settings}
          title="Configuración de la cuenta"
          description="Administra tus preferencias personales y compartidas. Todos los cambios quedan registrados en los logs."
        />

        <motion.section layout className="grid gap-6 lg:grid-cols-2">
          <Card className="group h-full rounded-3xl border border-border/40 bg-card/80 shadow-lg shadow-primary/10 backdrop-blur transition-all duration-300 hover:border-primary/30 hover:shadow-2xl">
            <CardHeader>
              <CardTitle>Preferencias de perfil</CardTitle>
              <CardDescription>
                Actualiza tu nombre para mostrar, tema y avatar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Nombre para mostrar</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Tu nombre"
                />
              </div>

              <div className="space-y-2">
                <Label>Tema</Label>
                <Select value={theme ?? "default"} onValueChange={setTheme}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tema" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Automático</SelectItem>
                    <SelectItem value="tamara">Tema Tamara</SelectItem>
                    <SelectItem value="carlos">Tema Carlos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                  PNG/JPG/WebP hasta {MAX_AVATAR_MB} MB.
                </p>
              </div>

              <Button
                onClick={handleProfileSave}
                disabled={isSavingProfile}
                className="w-full"
              >
                {isSavingProfile ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Guardar cambios
              </Button>
            </CardContent>
          </Card>

          <Card className="group h-full rounded-3xl border border-border/40 bg-card/80 shadow-lg shadow-primary/10 backdrop-blur transition-all duration-300 hover:border-primary/30 hover:shadow-2xl">
            <CardHeader>
              <CardTitle>Gestión de pareja</CardTitle>
              <CardDescription>
                Comparte tu código con tu pareja o ingresa el que te
                compartieron para vincularse.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeCouple ? (
                <div className="space-y-4 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5 shadow-inner">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">Pareja activa</p>
                      <p className="text-lg font-headline">
                        {activeCouple.name ?? "Nuestra pareja"}
                      </p>
                    </div>
                    <Users className="h-5 w-5 text-primary" />
                  </div>

                  {activeCouple.inviteCode ? (
                    <div className="flex items-center gap-2">
                      <Input value={activeCouple.inviteCode} readOnly />
                      <Button onClick={handleCopyInvite} variant="secondary">
                        {copied ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Esta pareja aún no tiene código para compartir.
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Tus registros solo permiten una pareja activa a la vez.
                    Contacta soporte si necesitas reiniciar.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aún no tienes una pareja vinculada. Crea una nueva o ingresa
                  el código que te compartieron.
                </p>
              )}

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
                  onChange={(e) =>
                    setInviteCodeInput(e.target.value.toUpperCase())
                  }
                  placeholder="Ej. ABCD1234"
                  disabled={Boolean(activeCouple) || isCoupleLoading}
                />
                <Button
                  onClick={handleJoinCouple}
                  disabled={isCoupleLoading || Boolean(activeCouple)}
                >
                  {isCoupleLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Unirme con código
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.section>
      </motion.main>
    </div>
  );
}








