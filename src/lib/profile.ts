import type { Profile } from '@/lib/types';

const FALLBACK_AVATARS: Record<string, string> = {
  tamara: '/img/tamara.png',
  carlos: '/img/carlos.png',
};

export function getProfileAvatarSrc(profile: Profile | null): string | undefined {
  if (!profile) {
    return undefined;
  }

  if (profile.avatarUrl) {
    return profile.avatarUrl;
  }

  if (profile.theme && FALLBACK_AVATARS[profile.theme]) {
    return FALLBACK_AVATARS[profile.theme];
  }

  return undefined;
}

export function getProfileDisplayName(profile: Profile | null): string {
  return profile?.displayName ?? 'Unknown';
}