import { createHash, timingSafeEqual } from 'node:crypto';
import { DATABASE_UPDATES } from '@/lib/domain/system-check';
import { supabaseConfigured, supabaseSecretKey, supabaseUrl } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';

// First-run setup. A fresh install has its Supabase settings from the deploy
// (Vercel's Supabase integration) and its database built during the build
// (scripts/migrate.mjs). The setup page then creates the first company and its
// admin, and closes itself for good once a company exists.

export interface SetupState {
  /** The Supabase URL and keys are set on the server. */
  connected: boolean;
  /** Every database update has been applied. */
  databaseReady: boolean;
  applied: number;
  total: number;
  /** No company exists yet, so the setup page is open. */
  open: boolean;
  /** The Supabase project's address, for showing which project is linked. */
  project: string | null;
}

const MISSING_TABLE = new Set(['42P01', 'PGRST205', 'PGRST204', '42703']);

export async function setupState(): Promise<SetupState> {
  const project = projectHost();
  const total = DATABASE_UPDATES.length;
  const admin = supabaseConfigured() ? createAdminClient() : null;
  if (!admin) return { connected: false, databaseReady: false, applied: 0, total, open: true, project };

  const probes = await Promise.all(
    DATABASE_UPDATES.map(async (update) => {
      const { error } = await admin.from(update.table).select(update.column).limit(0);
      return !error;
    }),
  );
  const applied = probes.filter(Boolean).length;
  const companies = await admin.from('organizations').select('id', { count: 'exact', head: true });
  const open = companies.error ? MISSING_TABLE.has(companies.error.code ?? '') || !companies.error.code : (companies.count ?? 0) === 0;
  return { connected: true, databaseReady: applied === total, applied, total, open, project };
}

/**
 * Whether the login page should send people to setup. Only when the database
 * clearly has no company (or no tables yet), so a passing network problem
 * never locks anyone out of signing in.
 */
export async function needsSetup(): Promise<boolean> {
  // Without the secret key the app cannot tell; older installs ran without it, so let them sign in.
  const admin = supabaseConfigured() ? createAdminClient() : null;
  if (!admin) return false;
  const { count, error } = await admin.from('organizations').select('id', { count: 'exact', head: true });
  if (error) return MISSING_TABLE.has(error.code ?? '');
  return (count ?? 0) === 0;
}

/**
 * Proves the person setting up owns this install: they paste a secret key of
 * the linked Supabase project. It is compared with the server's key, or tried
 * against the project's admin API (any secret key of the project works). The
 * key is never stored or sent anywhere else.
 */
export async function ownsProject(key: string): Promise<boolean> {
  const pasted = key.trim();
  if (pasted.length < 20) return false;
  const known = supabaseSecretKey();
  if (known && sameText(pasted, known)) return true;
  const url = supabaseUrl();
  if (!url) return false;
  try {
    const headers: Record<string, string> = { apikey: pasted };
    // A legacy service_role key is a JWT and goes in Authorization too; an anon key is refused there.
    if (pasted.startsWith('eyJ')) headers.Authorization = `Bearer ${pasted}`;
    const response = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=1`, { headers, cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  }
}

function sameText(a: string, b: string): boolean {
  const left = createHash('sha256').update(a).digest();
  const right = createHash('sha256').update(b).digest();
  return timingSafeEqual(left, right);
}

function projectHost(): string | null {
  try {
    return supabaseUrl() ? new URL(supabaseUrl()).host : null;
  } catch {
    return null;
  }
}
