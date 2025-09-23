'use client';

import { supabase } from '@/lib/supabase';
import { logError, logInfo, logWarn } from '@/lib/logger';
import type { CoupleMembership, CoupleSummary, Profile } from '@/lib/types';
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
  theme: string | null;
  confirmed_at: string | null;
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

function mapProfile(row: ProfileRow, coupleId: string | null): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    theme: row.theme,
    coupleId,
    confirmedAt: row.confirmed_at,
  };
}

function applyTheme(profile: Profile | null) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('dark');
  root.classList.remove('theme-tamara');
  root.classList.remove('theme-carlos');

  if (profile?.theme) {
    root.classList.add('theme-' + profile.theme);
  }
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

    const { data: profileRow, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, theme, confirmed_at')
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
        avatarUrl: null,
        theme: null,
        coupleId: null,
        confirmedAt: null,
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

    const acceptedMembership = mappedMemberships.find((membership) => membership.status === 'accepted') ?? null;
    const coupleId = acceptedMembership?.coupleId ?? null;

    const mappedProfile = mapProfile(profileRow as ProfileRow, coupleId);
    setUserState(mappedProfile);
    applyTheme(mappedProfile);

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

      const { data: memberRows, error: memberError } = await supabase
        .from('profile_couples')
        .select('profile:profiles(id, display_name, avatar_url, theme, confirmed_at)')
        .eq('couple_id', coupleId)
        .eq('status', 'accepted');

      if (memberError) {
        logError('UserContext.loadProfiles', 'No pudimos cargar los miembros de la pareja', memberError);
      } else if (memberRows) {
        const rows = (memberRows as unknown[]) ?? [];
        const profileList: ProfileRow[] = [];
        rows.forEach((row) => {
          const record = row as { profile?: ProfileRow | ProfileRow[] | null };
          const value = record.profile ?? null;
          if (Array.isArray(value)) {
            value.forEach((item) => {
              if (item) {
                profileList.push(item as ProfileRow);
              }
            });
          } else if (value) {
            profileList.push(value as ProfileRow);
          }
        });
        mappedMembers = profileList.map((profile) => mapProfile(profile, coupleId));
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
    if (isAuthLoading) {
      return;
    }
    void loadProfiles();
  }, [isAuthLoading, loadProfiles]);

  const refreshProfiles = useCallback(async () => {
    logInfo('UserContext.refreshProfiles', 'Refrescando perfil bajo demanda');
    await loadProfiles();
  }, [loadProfiles]);

  const setUser = useCallback((profile: Profile | null) => {
    logInfo('UserContext.setUser', 'Actualizando perfil en cache', { profileId: profile?.id ?? null });
    setUserState(profile);
    applyTheme(profile);
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
  if (context === undefined) {
    throw new Error('useUser debe usarse dentro de un UserProvider');
  }
  return context;
}
