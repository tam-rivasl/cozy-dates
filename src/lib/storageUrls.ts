// lib/storageUrls.ts
import { supabase } from '@/lib/supabase';

/** Para bucket PÚBLICO */
export function publicUrlFromPath(path: string) {
  const { data } = supabase.storage.from('task-photos').getPublicUrl(path);
  return data.publicUrl ?? null; // URL absoluta https://.../storage/v1/object/public/...
}

/** Para bucket PRIVADO (recomendado) */
export async function signedUrlFromPath(path: string, seconds = 3600) {
  const { data, error } = await supabase
    .storage
    .from('task-photos')
    .createSignedUrl(path, seconds);
  if (error) return null;
  return data?.signedUrl ?? null; // URL absoluta con token
}
