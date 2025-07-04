
import { createClient } from '@supabase/supabase-js'
import type { Task } from './types';

// The automatically generated table types are helpful,
// but we want to use our own types to ensure consistency.
export type SupabaseTask = Omit<Task, 'date'> & { date: string };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
