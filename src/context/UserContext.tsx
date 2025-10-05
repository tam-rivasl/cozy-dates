'use client';

import { supabase } from '@/lib/supabase';
import { logError, logInfo, logWarn } from '@/lib/logger';
import type { CoupleMembership, CoupleSummary, Profile } from '@/lib/types';
import {
  getThemeClassList,
  normalizeThemeName,
  type AppTheme,
} from '@/lib/theme';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/context/AuthContext';

interface UserContextType {
  user: Profile | null;
  setUser: (profile: Profile | null) => void;
  members: Profile[];
  memberships: CoupleMembership[];
  activeCoupleId: string | null;
  activeCouple: CoupleSummary | null;
  refreshProfiles: () => Promise<void>;
  isLoading: boolean;
}

interface ProfileRow {
  id: string;
  display_name: string;
  avatar_url: string | null;
  theme: string | null; // <- mantenemos theme
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  age: number | null;
  contact_email: string | null;
  // confirmed_at: string | null;   // <- quitalo del SELECT
}

interface MembershipRow {
  couple_id: string;
  status: string;
  role: string;
}

interface CoupleRow {
  id: string;
  name: string | null;
  invite_code: string | null;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);
const AVATAR_BUCKET = 'avatars';
const SIGNED_URL_TTL_SECONDS = 60 * 60;

async function resolveAvatarUrl(rawUrl: string | null): Promise<string | null> {
  if (!rawUrl) return null;

  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const { data: signedData, error: signedError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(trimmed, SIGNED_URL_TTL_SECONDS);

  if (!signedError && signedData?.signedUrl) {
    return signedData.signedUrl;
  }

  const { data: publicData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(trimmed);
  if (publicData?.publicUrl) {
    return publicData.publicUrl;
  }

  logWarn('UserContext.resolveAvatarUrl', 'No pudimos resolver la URL del avatar, devolviendo nulo', {
    path: trimmed,
    signedError,
  });

  return null;
}

function mapProfile(
  row: ProfileRow,
  coupleId: string | null,
  confirmedAt: string | null,
  accountEmail: string | null,
): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    firstName: row.first_name ?? null,
    lastName: row.last_name ?? null,
    nickname: row.nickname ?? null,
    age: row.age ?? null,
    contactEmail: row.contact_email ?? null,
    accountEmail,
    avatarUrl: row.avatar_url,
    theme: normalizeThemeName(row.theme),
    coupleId,
    confirmedAt, // lo poblamos desde auth.user.email_confirmed_at
  };
}

function applyTheme(profile: Profile | null) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('dark', 'theme-tamara', 'theme-carlos', 'theme-blossom', 'theme-dark', 'theme-automatic', 'theme-terracota', 'theme-dark-basic');

  const theme = profile?.theme ?? null;
  if (!theme) {
    root.classList.add('theme-automatic');
    return;
  }

  const classes = getThemeClassList(theme as AppTheme);
  if (classes.length === 0) return;

  root.classList.add(...classes);
}

export function UserProvider({ children }: { children: ReactNode }) {
  const { user: authUser, isLoading: isAuthLoading } = useAuth();
  const [user, setUserState] = useState<Profile | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [memberships, setMemberships] = useState<CoupleMembership[]>([]);
  const [activeCoupleId, setActiveCoupleId] = useState<string | null>(null);
  const [activeCouple, setActiveCouple] = useState<CoupleSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfiles = useCallback(async () => {
    if (!authUser) {
      logInfo('UserContext.loadProfiles', 'Sin usuario autenticado, limpiando estado');
      setUserState(null);
      setMembers([]);
      setMemberships([]);
      setActiveCoupleId(null);
      setActiveCouple(null);
      applyTheme(null);
      setIsLoading(false);
      return;
    }

    if (!authUser.email_confirmed_at) {
      logWarn('UserContext.loadProfiles', 'Usuario sin confirmar, aplazando carga de perfil', { userId: authUser.id });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    logInfo('UserContext.loadProfiles', 'Iniciando carga de perfil', { userId: authUser.id });

    // 1) Perfil propio
    const { data: profileRow, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, theme, first_name, last_name, nickname, age, contact_email') // <- sin confirmed_at
      .eq('id', authUser.id)
      .single();

    if (profileError || !profileRow) {
      const fallbackDisplayName =
        authUser.user_metadata?.display_name ||
        authUser.user_metadata?.full_name ||
        authUser.email?.split('@')[0] ||
        'Nuevo usuario';

      logWarn('UserContext.loadProfiles', 'No se encontro perfil en la base, usando valores por defecto.', {
        userId: authUser.id,
        error: profileError ?? null,
      });

      const fallbackProfile: Profile = {
        id: authUser.id,
        displayName: fallbackDisplayName,
        firstName: null,
        lastName: null,
        nickname: null,
        age: null,
        contactEmail: authUser.email ?? null,
        accountEmail: authUser.email ?? null,
        avatarUrl: null,
        theme: null,
        coupleId: null,
        confirmedAt: authUser.email_confirmed_at ?? null, // desde auth
      };

      setUserState(fallbackProfile);
      setMembers([fallbackProfile]);
      setMemberships([]);
      setActiveCoupleId(null);
      setActiveCouple(null);
      applyTheme(fallbackProfile);
      setIsLoading(false);
      return;
    }

    // 2) Membresías del usuario
    const { data: membershipRows, error: membershipError } = await supabase
      .from('profile_couples')
      .select('couple_id, status, role')
      .eq('profile_id', authUser.id);

    if (membershipError) {
      logError('UserContext.loadProfiles', 'No pudimos cargar las membresias', membershipError);
    }

    const mappedMemberships: CoupleMembership[] = (membershipRows ?? []).map((row: MembershipRow) => ({
      coupleId: row.couple_id,
      status: row.status as CoupleMembership['status'],
      role: row.role as CoupleMembership['role'],
    }));

    const acceptedMembership = mappedMemberships.find((m) => m.status === 'accepted') ?? null;
    const coupleId = acceptedMembership?.coupleId ?? null;

    const profileRowTyped = profileRow as ProfileRow;
    const resolvedAvatarUrl = await resolveAvatarUrl(profileRowTyped.avatar_url);
    const mappedProfile = mapProfile(
      { ...profileRowTyped, avatar_url: resolvedAvatarUrl } as ProfileRow,
      coupleId,
      authUser.email_confirmed_at ?? null,
      authUser.email ?? null,
    );
    setUserState(mappedProfile);
    applyTheme(mappedProfile);

    // 3) Datos de la pareja + miembros
    let mappedMembers: Profile[] = [];
    let coupleSummary: CoupleSummary | null = null;

    if (coupleId) {
      const { data: coupleRow, error: coupleError } = await supabase
        .from('couples')
        .select('id, name, invite_code')
        .eq('id', coupleId)
        .maybeSingle();

      if (coupleError) {
        logError('UserContext.loadProfiles', 'No pudimos cargar la informacion de la pareja', coupleError);
      } else if (coupleRow) {
        const typedCouple = coupleRow as CoupleRow;
        coupleSummary = {
          id: typedCouple.id,
          name: typedCouple.name,
          inviteCode: typedCouple.invite_code,
        };
      }

      // Embed del otro miembro: requiere la policy nueva en profiles
      const { data: memberRows, error: memberError } = await supabase
        .from('profile_couples')
        .select('profile:profiles(id, display_name, avatar_url, theme, first_name, last_name, nickname, age, contact_email)')
        .eq('couple_id', coupleId)
        .eq('status', 'accepted');

      if (memberError) {
        logError('UserContext.loadProfiles', 'No pudimos cargar los miembros de la pareja', memberError);
      } else if (memberRows) {
        // Normaliza resultado embebido (objeto o array según PostgREST)
        const rows = (Array.isArray(memberRows) ? memberRows : [memberRows]) ?? [];
        const profileList: ProfileRow[] = [];
        for (const r of rows) {
          const v = r?.profile ?? null;
          if (Array.isArray(v)) profileList.push(...(v as ProfileRow[]));
          else if (v) profileList.push(v as ProfileRow);
        }
        mappedMembers = await Promise.all(
          profileList.map(async (p) => {
            const resolvedAvatarUrl = await resolveAvatarUrl(p.avatar_url);
            return mapProfile(
              { ...p, avatar_url: resolvedAvatarUrl } as ProfileRow,
              coupleId,
              authUser.email_confirmed_at ?? null,
              null,
            );
          }),
        );
      }
    }

    setMembers(mappedMembers.length > 0 ? mappedMembers : [mappedProfile]);
    setMemberships(mappedMemberships);
    setActiveCoupleId(coupleId);
    setActiveCouple(coupleSummary);
    setIsLoading(false);

    logInfo('UserContext.loadProfiles', 'Perfil cargado exitosamente', {
      userId: authUser.id,
      coupleId,
      memberCount: mappedMembers.length,
    });
  }, [authUser]);

  useEffect(() => {
    if (isAuthLoading) return;
    void loadProfiles();
  }, [isAuthLoading, loadProfiles]);

  const refreshProfiles = useCallback(async () => {
    logInfo('UserContext.refreshProfiles', 'Refrescando perfil bajo demanda');
    await loadProfiles();
  }, [loadProfiles]);

  const setUser = useCallback((profile: Profile | null) => {
    logInfo('UserContext.setUser', 'Actualizando perfil en cache', { profileId: profile?.id ?? null });
    const normalizedProfile = profile
      ? { ...profile, theme: normalizeThemeName(profile.theme) }
      : null;
    setUserState(normalizedProfile);
    applyTheme(normalizedProfile);
  }, []);

  const value = useMemo(
    () => ({
      user,
      setUser,
      members,
      memberships,
      activeCoupleId,
      activeCouple,
      refreshProfiles,
      isLoading: isLoading || isAuthLoading,
    }),
    [user, setUser, members, memberships, activeCoupleId, activeCouple, refreshProfiles, isLoading, isAuthLoading],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) throw new Error('useUser debe usarse dentro de un UserProvider');
  return context;
}

