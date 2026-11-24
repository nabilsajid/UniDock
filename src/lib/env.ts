/**
 * Supabase settings. Each accepts the names UniDock has always used and the
 * names Vercel's Supabase integration sets, so a one-click deploy works as is:
 *   URL         NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL on the server)
 *   public key  NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *   secret key  SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY (server only)
 * The NEXT_PUBLIC_ names are written out in full so Next can put them in the browser code.
 */
export function supabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
}

export function supabasePublicKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
}

/** Server only. Never send this to the browser. */
export function supabaseSecretKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
}

/** Whether the app has what it needs to reach Supabase at all. */
export function supabaseConfigured(): boolean {
  return Boolean(supabaseUrl() && supabasePublicKey() && supabaseSecretKey());
}
