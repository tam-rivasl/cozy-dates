import type { Profile } from '@/lib/types';
import { logInfo } from './logger';
import { supabase } from '@/lib/supabase';

const FALLBACK_AVATARS: Record<string, string> = {
  blossom: '/img/blossom.png',
  'theme-blossom': '/img/blossom.png',
  dark: '/img/dark.png',
  'theme-dark': '/img/dark.png',
  // Legacy aliases kept for backwards compatibility
  tamara: '/img/blossom.png',
  'theme-tamara': '/img/blossom.png',
  carlos: '/img/dark.png',
  'theme-carlos': '/img/dark.png',
};

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

  if (theme && FALLBACK_AVATARS[theme]) {
    return FALLBACK_AVATARS[theme];
  }

  return undefined;
}

export function getProfileDisplayName(profile: Profile | null): string {
  return profile?.displayName ?? 'Unknown';
}
