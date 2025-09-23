'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { logInfo, logError, logWarn } from '@/lib/logger';

interface SignUpOptions {
  email: string;
  password: string;
  displayName: string;
  theme?: string | null;
  avatarFile?: File | null;
  createCouple: boolean;
  coupleName?: string | null;
  coupleCode?: string | null;
}

interface SignUpResult {
  inviteCode: string | null;
  membershipStatus: 'accepted' | 'pending' | 'declined';
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (options: SignUpOptions) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fileToDataUrl(file: File | null | undefined): Promise<string | null> {
  if (!file) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('No se pudo leer el archivo.'));
      }
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

function getEmailRedirectTo() {
  if (typeof window === 'undefined') {
    return undefined;
  }
  const base = window.location.origin.replace(/\/$/, '');
  return `${base}/auth/callback`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;

      if (error) {
        logError('AuthContext.init', 'Error cargando la sesion actual', error);
      }

      setSession(data.session ?? null);
      setAuthUser(data.session?.user ?? null);
      setIsLoading(false);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      logInfo('AuthContext.onAuthStateChange', `Evento recibido: ${event}`);
      setSession(newSession);
      setAuthUser(newSession?.user ?? null);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    logInfo('AuthContext.signIn', 'Intentando inicio de sesion', { email });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      logError('AuthContext.signIn', 'Inicio de sesion fallido', error);
      throw error;
    }
    logInfo('AuthContext.signIn', 'Inicio de sesion exitoso', { email });
  }, []);

  const signOut = useCallback(async () => {
    logInfo('AuthContext.signOut', 'Cerrando sesion');
    const { error } = await supabase.auth.signOut();
    if (error) {
      logError('AuthContext.signOut', 'Error al cerrar sesion', error);
      throw error;
    }
  }, []);

  const signUp = useCallback(async (options: SignUpOptions): Promise<SignUpResult> => {
    const { email, password, avatarFile, displayName, theme, createCouple, coupleName, coupleCode } = options;

    const registrationToken = crypto.randomUUID();

    logInfo('AuthContext.signUp', 'Registrando usuario', {
      email,
      displayName,
      theme: theme ?? null,
      createCouple,
      hasCoupleCode: Boolean(coupleCode),
    });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getEmailRedirectTo(),
        data: {
          registration_token: registrationToken,
          display_name: displayName,
          preferred_theme: theme ?? null,
          wants_couple_creation: createCouple,
        },
      },
    });

    if (error || !data.user) {
      logError('AuthContext.signUp', 'Error al registrar usuario', error);
      throw error ?? new Error('El registro fallo, intenta nuevamente.');
    }

    const userId = data.user.id;
    const avatarDataUrl = await fileToDataUrl(avatarFile);

    logInfo('AuthContext.signUp', 'Usuario registrado en Supabase', { userId });

    try {
      const { data: functionResponse, error: functionError } = await supabase.functions.invoke<SignUpResult>(
        'onboard-user',
        {
          body: {
            userId,
            displayName,
            theme: theme ?? null,
            avatarDataUrl,
            createCouple,
            coupleName: coupleName ?? null,
            coupleCode: coupleCode ?? null,
            registrationToken,
          },
        },
      );

      if (functionError) {
        logError('AuthContext.signUp', 'Onboarding fallo en edge function', functionError);
        throw new Error(functionError.message ?? 'No pudimos completar el alta.');
      }

      if (!functionResponse) {
        logWarn('AuthContext.signUp', 'Edge function no respondio datos', { userId });
        throw new Error('No pudimos completar el registro.');
      }

      logInfo('AuthContext.signUp', 'Onboarding completado', { userId, result: functionResponse });
      return functionResponse;
    } catch (fetchError) {
      logError('AuthContext.signUp', 'Error inesperado durante el onboarding', fetchError);
      throw fetchError instanceof Error ? fetchError : new Error('No pudimos completar el registro.');
    }
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({ session, user: authUser, isLoading, signIn, signOut, signUp }),
    [session, authUser, isLoading, signIn, signOut, signUp],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}





