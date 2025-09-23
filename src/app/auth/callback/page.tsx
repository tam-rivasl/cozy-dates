'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { logError, logInfo } from '@/lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ActivateProfileResponse {
  profile: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    theme: string | null;
    confirmedAt: string | null;
  };
  couple: {
    id: string;
    name: string | null;
    inviteCode: string | null;
  } | null;
  membershipStatus: 'accepted' | 'pending' | 'declined';
  membershipRole: 'owner' | 'member' | null;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code') ?? '';
    const type = searchParams.get('type');

    if (!code) {
      setErrorMessage('Codigo de verificacion faltante. Vuelve a solicitar el enlace.');
      return;
    }

    async function handleCallback() {
      try {
        logInfo('AuthCallbackPage.handleCallback', 'Intercambiando codigo por sesion', { type });
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error || !data.session || !data.session.user) {
          throw error ?? new Error('No pudimos crear tu sesion.');
        }

        const userId = data.session.user.id;
        logInfo('AuthCallbackPage.handleCallback', 'Sesion creada, activando perfil', { userId });

        const { data: activationData, error: activationError } = await supabase.functions.invoke<ActivateProfileResponse>(
          'activate-profile',
          {
            body: { userId },
          },
        );

        if (activationError) {
          throw new Error(activationError.message ?? 'No pudimos activar tu perfil.');
        }

        logInfo('AuthCallbackPage.handleCallback', 'Perfil activado', activationData);

        toast({
          title: 'Cuenta confirmada',
          description: 'Tus preferencias estan listas. Estamos redirigiendote al dashboard.',
        });

        router.replace('/dashboard');
      } catch (error) {
        logError('AuthCallbackPage.handleCallback', 'Fallo al procesar el enlace de confirmacion', error);
        setErrorMessage(error instanceof Error ? error.message : 'No pudimos validar tu enlace.');
      }
    }

    void handleCallback();
  }, [router, searchParams, toast]);

  if (errorMessage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-headline">No pudimos validar tu enlace</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => router.replace('/auth/login')} className="w-full">
              Volver al inicio de sesion
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
        <p className="text-sm text-muted-foreground">Validando tu confirmacion...</p>
      </div>
    </main>
  );
}
