'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { logError, logInfo } from '@/lib/logger';
import { AVAILABLE_THEMES } from '@/lib/theme';

const themeOptions = ['default', ...AVAILABLE_THEMES] as const;

const avatarFileSchema = z
  .any()
  .optional()
  .refine((file) => file === undefined || file === null || file instanceof File, 'Selecciona un archivo valido')
  .refine(
    (file) => {
      if (!file || !(file instanceof File)) {
        return true;
      }
      return file.type.startsWith('image/');
    },
    'El archivo debe ser una imagen',
  )
  .refine(
    (file) => {
      if (!file || !(file instanceof File)) {
        return true;
      }
      return file.size <= 5 * 1024 * 1024;
    },
    'La imagen debe pesar hasta 5MB',
  );

const registerSchema = z
  .object({
    email: z.string().email('Ingresa un correo valido'),
    password: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres'),
    displayName: z.string().min(1, 'Necesitamos un nombre para mostrar'),
    theme: z.enum(themeOptions).default('default'),
    avatarFile: avatarFileSchema,
    hasCoupleCode: z.boolean(),
    coupleCode: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.hasCoupleCode) {
      if (!values.coupleCode || values.coupleCode.trim().length < 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Ingresa el codigo que recibiste',
          path: ['coupleCode'],
        });
      }
    }
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { session, isLoading: isAuthLoading, signUp } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      displayName: '',
      theme: 'default',
      avatarFile: undefined,
      hasCoupleCode: false,
      coupleCode: '',
    },
  });

  const isSubmitting = form.formState.isSubmitting;
  const hasCoupleCode = form.watch('hasCoupleCode');

  useEffect(() => {
    if (!isAuthLoading && session) {
      router.replace('/dashboard');
    }
  }, [session, isAuthLoading, router]);

  useEffect(() => {
    if (!hasCoupleCode) {
      form.setValue('coupleCode', '');
      form.clearErrors('coupleCode');
    }
  }, [hasCoupleCode, form]);

  const onSubmit = async (values: RegisterFormValues) => {
    const { hasCoupleCode: hasCode, coupleCode, avatarFile, ...rest } = values;
    try {
      const result = await signUp({
        ...rest,
        avatarFile: avatarFile instanceof File ? avatarFile : null,
        theme: rest.theme === 'default' ? null : rest.theme,
        createCouple: !hasCode,
        coupleCode: hasCode ? coupleCode?.trim() : undefined,
      });

      const descriptionParts = [] as string[];
      descriptionParts.push('Te enviamos un correo para confirmar tu cuenta.');
      if (!hasCode && result.inviteCode) {
        descriptionParts.push(`Comparte este codigo con tu pareja: ${result.inviteCode}.`);
      }

      logInfo('RegisterPage.onSubmit', 'Registro completado, redirigiendo a confirmacion', {
        email: rest.email,
        inviteCode: result.inviteCode,
        membershipStatus: result.membershipStatus,
      });

      toast({
        title: 'Registro exitoso',
        description: descriptionParts.join(' '),
      });

      form.reset();
      const confirmUrl = `/auth/confirm-email?email=${encodeURIComponent(rest.email)}`;
      router.replace(confirmUrl);
    } catch (error) {
      logError('RegisterPage.onSubmit', 'El registro fallo', error);
      toast({
        title: 'No pudimos crear tu cuenta',
        description: error instanceof Error ? error.message : 'Intentalo otra vez en unos minutos.',
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
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-headline">Crear nueva cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
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
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="********"
                            autoComplete="new-password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2"
                            onClick={() => setShowPassword((prev) => !prev)}
                            aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre para mostrar</FormLabel>
                      <FormControl>
                        <Input placeholder="Como te llamas?" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="theme"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tema preferido</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un tema" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="default">Automatico</SelectItem>
                        <SelectItem value="blossom">Tema Blossom</SelectItem>
                        <SelectItem value="dark">Tema Dark</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="avatarFile"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Avatar (opcional)</FormLabel>
                      <FormControl>
                        <div>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              field.onChange(file ?? undefined);
                            }}
                          />
                          {field.value instanceof File ? (
                            <p className="mt-2 text-sm text-muted-foreground">{field.value.name}</p>
                          ) : null}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="hasCoupleCode"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                    </FormControl>
                    <div className="space-y-1">
                      <FormLabel className="font-medium">Ya tengo un codigo de pareja</FormLabel>
                      <FormDescription>
                        Marca esta opcion si tu pareja ya creo la cuenta y te envio un codigo.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {hasCoupleCode ? (
                <FormField
                  control={form.control}
                  name="coupleCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Codigo de la pareja</FormLabel>
                      <FormControl>
                        <Input placeholder="Ingresa el codigo que te compartieron" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Crear cuenta
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}

