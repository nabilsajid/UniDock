import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseSecretKey, supabaseUrl } from '@/lib/env';

/**
 * Service-role client. It bypasses row level security, so it is used only on
 * the server and only where a user session cannot do the job (inviting people).
 * Returns null when the service role key is not configured.
 */
export function createAdminClient(): SupabaseClient | null {
  const url = supabaseUrl();
  const key = supabaseSecretKey();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
