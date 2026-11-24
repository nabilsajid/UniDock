import { createBrowserClient } from '@supabase/ssr';
import { SESSION_COOKIE } from './cookies';
import { supabasePublicKey, supabaseUrl } from '@/lib/env';

export function createClient() {
  return createBrowserClient(
    supabaseUrl(),
    supabasePublicKey(),
    { cookieOptions: SESSION_COOKIE },
  );
}
