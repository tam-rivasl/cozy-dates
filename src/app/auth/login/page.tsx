'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { logError, logInfo } from '@/lib/logger';

const loginSchema = z.object({
  email: z.string().email('Ingresa un correo valido'),
  password: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { session, isLoading: isAuthLoading, signIn } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  useEffect(() => {
    if (!isAuthLoading && session) {
      router.replace('/dashboard');
    }
  }, [session, isAuthLoading, router]);

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await signIn(values.email, values.password);
      logInfo('LoginPage.onSubmit', 'Inicio de sesion correcto', { email: values.email });
      toast({ title: 'Bienvenido de nuevo', description: 'Sesion iniciada correctamente.' });
      router.replace('/dashboard');
    } catch (error) {
      logError('LoginPage.onSubmit', 'Error al iniciar sesion', error);
      const message =
        error instanceof Error && error.message.toLowerCase().includes('confirmed')
          ? 'Debes confirmar tu correo antes de iniciar sesion.'
          : 'Verifica tus credenciales e intentalo otra vez.';
      toast({
        title: 'No pudimos iniciar sesion',
        description: message,
        variant: 'destructive',
      });
    }
  };

  if (isAuthLoading || session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-headline">Inicia sesion</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo electronico</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="tu@correo.com" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contrasena</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="********" autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Entrar
              </Button>
            </form>
          </Form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Aun no tienes cuenta?{' '}
            <Link className="text-primary underline" href="/auth/register">
              Registrate aqui
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
