import type { Profile } from '@/lib/types';
import { logInfo } from './logger';
import { supabase } from '@/lib/supabase';
import { getFallbackAvatarForTheme } from '@/lib/theme';

export function getProfileAvatarSrc(profile: Profile | null): string | undefined {
  logInfo('profile', 'getProfileAvatarSrc', profile);
  if (!profile) {
    return undefined;
  }

  const { avatarUrl, theme } = profile;

  if (avatarUrl) {
    if (/^https?:\/\//i.test(avatarUrl)) {
      return avatarUrl;
    }

    const publicUrl = supabase.storage.from('avatars').getPublicUrl(avatarUrl).data?.publicUrl;
    if (publicUrl) {
      return publicUrl;
    }
  }

  const fallback = getFallbackAvatarForTheme(theme ?? null);
  if (fallback) return fallback;

  return undefined;
}

export function getProfileDisplayName(profile: Profile | null): string {
  if (!profile) return 'Unknown';

  const candidates = [profile.nickname, profile.firstName, profile.displayName];
  for (const candidate of candidates) {
    if (candidate && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return 'Unknown';
}
