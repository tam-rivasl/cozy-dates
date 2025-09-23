'use client';

import { useState } from 'react';
import { Loader2, Copy, Check, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { logError, logInfo } from '@/lib/logger';

interface ManageCoupleRequest {
  action: 'create' | 'join';
  name?: string | null;
  inviteCode?: string;
}

interface ManageCoupleResponse {
  couple: {
    id: string;
    name: string | null;
    inviteCode: string | null;
  } | null;
  membershipStatus: 'accepted' | 'pending' | 'declined';
  membershipRole: 'owner' | 'member' | null;
}

export default function SettingsPage() {
  const { user, activeCouple, refreshProfiles } = useUser();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [theme, setTheme] = useState(user?.theme ?? 'default');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isCoupleLoading, setIsCoupleLoading] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [coupleNameInput, setCoupleNameInput] = useState('');
  const [copied, setCopied] = useState(false);

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Inicia sesion</CardTitle>
            <CardDescription>Necesitas una cuenta confirmada para acceder a la configuracion.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  const handleProfileSave = async () => {
    try {
      setIsSavingProfile(true);
      let avatarUrl = user.avatarUrl;

      if (avatarFile) {
        const extension = avatarFile.name.split('.').pop()?.toLowerCase() ?? 'png';
        const filePath = `${user.id}/${Date.now()}.${extension}`;

        logInfo('SettingsPage.handleProfileSave', 'Subiendo nuevo avatar', { filePath });
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { cacheControl: '3600', upsert: true });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        avatarUrl = publicData?.publicUrl ?? avatarUrl;
      }

      const themeValue = theme === 'default' ? null : theme;

      logInfo('SettingsPage.handleProfileSave', 'Actualizando perfil', {
        userId: user.id,
        theme: themeValue,
      });

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          theme: themeValue,
          avatar_url: avatarUrl,
        })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: 'Perfil actualizado',
        description: 'Tus preferencias se guardaron correctamente.',
      });

      await refreshProfiles();
      setAvatarFile(null);
    } catch (error) {
      logError('SettingsPage.handleProfileSave', 'No pudimos guardar el perfil', error);
      toast({
        title: 'No pudimos guardar los cambios',
        description: 'Intenta nuevamente en unos minutos.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const invokeManageCouple = async (payload: ManageCoupleRequest) => {
    setIsCoupleLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<ManageCoupleResponse>('manage-couple', {
        body: payload,
      });

      if (error) {
        throw new Error(error.message ?? 'No pudimos procesar la solicitud.');
      }

      logInfo('SettingsPage.invokeManageCouple', 'Accion completada', payload);

      toast({
        title: 'Actualizamos tu relacion',
        description: 'Sincronizamos la configuracion de pareja.',
      });

      await refreshProfiles();
      setInviteCodeInput('');
      setCoupleNameInput('');
      return data;
    } catch (error) {
      logError('SettingsPage.invokeManageCouple', 'Fallo al ejecutar manage-couple', error);
      throw error;
    } finally {
      setIsCoupleLoading(false);
    }
  };

  const handleCreateCouple = async () => {
    try {
      logInfo('SettingsPage.handleCreateCouple', 'Creando pareja desde ajustes');
      await invokeManageCouple({ action: 'create', name: coupleNameInput || null });
    } catch (error) {
      logError('SettingsPage.handleCreateCouple', 'Error creando pareja', error);
      toast({
        title: 'No pudimos crear la pareja',
        description: error instanceof Error ? error.message : 'Intenta nuevamente.',
        variant: 'destructive',
      });
    }
  };

  const handleJoinCouple = async () => {
    const normalizedCode = inviteCodeInput.trim();
    if (normalizedCode.length < 4) {
      toast({
        title: 'Codigo demasiado corto',
        description: 'Verifica el codigo compartido por tu pareja.',
        variant: 'destructive',
      });
      return;
    }

    try {
      logInfo('SettingsPage.handleJoinCouple', 'Uniendose a pareja', { inviteCode: normalizedCode });
      await invokeManageCouple({ action: 'join', inviteCode: normalizedCode });
    } catch (error) {
      logError('SettingsPage.handleJoinCouple', 'Error uniendose a pareja', error);
      toast({
        title: 'No pudimos unirte a esa pareja',
        description: error instanceof Error ? error.message : 'Verifica el codigo e intenta de nuevo.',
        variant: 'destructive',
      });
    }
  };

  const handleCopyInvite = async () => {
    if (!activeCouple?.inviteCode) {
      return;
    }

    await navigator.clipboard.writeText(activeCouple.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Codigo copiado', description: 'Comparte el codigo con tu pareja.' });
  };

  return (
    <main className="bg-background min-h-screen p-4 md:p-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-headline">Configuracion de la cuenta</h1>
          <p className="text-sm text-muted-foreground">
            Administra tus preferencias personales y compartidas. Todos los cambios quedan registrados en los logs.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Preferencias de perfil</CardTitle>
              <CardDescription>Actualiza tu nombre para mostrar, tema y avatar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Nombre para mostrar</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Tu nombre"
                />
              </div>
              <div className="space-y-2">
                <Label>Tema</Label>
                <Select value={theme ?? 'default'} onValueChange={setTheme}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tema" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Automatico</SelectItem>
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
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setAvatarFile(file);
                  }}
                />
                <p className="text-xs text-muted-foreground">Formatos PNG o JPG de hasta 5 MB.</p>
              </div>
              <Button onClick={handleProfileSave} disabled={isSavingProfile} className="w-full">
                {isSavingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Guardar cambios
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gestion de pareja</CardTitle>
              <CardDescription>
                Comparte tu codigo con tu pareja o ingresa el que te compartieron para vincularse.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeCouple ? (
                <div className="space-y-4 rounded-md border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">Pareja activa</p>
                      <p className="text-lg font-headline">{activeCouple.name ?? 'Nuestra pareja'}</p>
                    </div>
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  {activeCouple.inviteCode ? (
                    <div className="flex items-center gap-2">
                      <Input value={activeCouple.inviteCode} readOnly />
                      <Button onClick={handleCopyInvite} variant="secondary">
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Esta pareja aun no tiene codigo para compartir.
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Tus registros solo permiten una pareja activa a la vez. Contacta soporte si necesitas reiniciar.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aun no tienes una pareja vinculada. Crea una nueva o ingresa el codigo que te compartieron.
                </p>
              )}

              <div className="space-y-3 rounded-md border p-4">
                <Label htmlFor="coupleName">Crear pareja nueva</Label>
                <Input
                  id="coupleName"
                  value={coupleNameInput}
                  onChange={(event) => setCoupleNameInput(event.target.value)}
                  placeholder="Nombre opcional"
                  disabled={Boolean(activeCouple) || isCoupleLoading}
                />
                <Button onClick={handleCreateCouple} disabled={isCoupleLoading || Boolean(activeCouple)}>
                  {isCoupleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Crear pareja
                </Button>
              </div>

              <div className="space-y-3 rounded-md border p-4">
                <Label htmlFor="inviteCode">Tengo un codigo</Label>
                <Input
                  id="inviteCode"
                  value={inviteCodeInput}
                  onChange={(event) => setInviteCodeInput(event.target.value.toUpperCase())}
                  placeholder="Ej. ABCD1234"
                  disabled={Boolean(activeCouple) || isCoupleLoading}
                />
                <Button onClick={handleJoinCouple} disabled={isCoupleLoading || Boolean(activeCouple)}>
                  {isCoupleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Unirme con codigo
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}


