'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { logError, logInfo } from '@/lib/logger';

export default function ConfirmEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  const handleResend = async () => {
    if (!email) {
      toast({
        title: 'Necesitamos tu correo',
        description: 'Regresa al registro para intentar de nuevo.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSending(true);
      logInfo('ConfirmEmailPage.handleResend', 'Solicitando nuevo correo de confirmacion', { email });
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) {
        throw error;
      }
      toast({
        title: 'Enviamos un nuevo correo',
        description: `Revisa la bandeja de entrada de ${email}.`,
      });
    } catch (error) {
      logError('ConfirmEmailPage.handleResend', 'No pudimos reenviar el correo', error);
      toast({
        title: 'Ups, algo salio mal',
        description: 'Intentalo de nuevo en unos minutos.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-headline">Confirma tu correo</CardTitle>
          <CardDescription>
            {email
              ? `Enviamos un mensaje a ${email}. Abre el enlace para activar tu cuenta.`
              : 'Enviamos un mensaje a tu correo. Abre el enlace para activar tu cuenta.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Una vez que confirmes tu correo se cargaran tus preferencias y te llevaremos directo al dashboard.
          </p>
          <div className="flex flex-col gap-2">
            <Button variant="default" onClick={() => window.open('https://mail.google.com', '_blank')}>
              <Mail className="mr-2 h-4 w-4" /> Abrir mi correo
            </Button>
            <Button variant="secondary" onClick={handleResend} disabled={isSending}>
              {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />} Reenviar enlace
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Si no ves el correo, revisa la carpeta de spam o vuelve a enviarlo.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

