// Builds and updates the database during each deploy, before `next build`.
// Applies every file in supabase/migrations that has not run yet, using the
// Supabase CLI (it keeps track of what already ran), so a fresh install gets
// all tables and later deploys get only the new updates.
//
// Uses the first connection string it finds:
//   SUPABASE_DB_URL           set by you (Supabase → Connect → Session pooler)
//   POSTGRES_URL_NON_POOLING  set by Vercel's Supabase integration
// With neither (for example the GitHub checks), it does nothing.
// Set SKIP_DB_MIGRATIONS=true to turn it off.
import { spawnSync } from 'node:child_process';

const raw = process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL_NON_POOLING || '';
if (process.env.SKIP_DB_MIGRATIONS === 'true' || !raw) {
  console.log('[migrate] No database connection string set; skipping database updates.');
  process.exit(0);
}

// Vercel adds extra parameters (such as `supa=…`) that Postgres tools reject. Keep only sslmode.
let dbUrl = raw;
try {
  const url = new URL(raw);
  const sslmode = url.searchParams.get('sslmode') || 'require';
  url.search = '';
  url.searchParams.set('sslmode', sslmode);
  dbUrl = url.toString();
} catch {
  // Not a URL we can tidy; use it as given.
}

function supabase(args) {
  return spawnSync('npx', ['--yes', 'supabase@2', ...args, '--db-url', dbUrl], { encoding: 'utf8', env: process.env });
}

function hide(text) {
  // Never print the password from the connection string.
  return (text || '').split(dbUrl).join('<database>').split(raw).join('<database>');
}

const plan = supabase(['db', 'push', '--dry-run']);
const planText = hide(`${plan.stdout}\n${plan.stderr}`);
if (plan.status !== 0) {
  console.error(`[migrate] Could not reach the database:\n${planText}`);
  process.exit(1);
}
if (/up to date/i.test(planText)) {
  console.log('[migrate] Database is up to date.');
  process.exit(0);
}

// Safety: a database whose tables were made by hand (SQL Editor) has no record of
// what ran. Pushing would run everything again, so stop and explain instead.
if (/20261112000001/.test(planText) && (await tablesExist())) {
  console.warn(
    '[migrate] The database already has UniDock tables but no record of which updates ran. ' +
      'Skipping, so nothing runs twice. Mark the updates as done (docs/ARCHITECTURE.md, "Checks and automatic database updates").',
  );
  process.exit(0);
}

console.log(`[migrate] Applying database updates:\n${planText}`);
const push = supabase(['db', 'push', '--include-all', '--yes']);
const pushText = hide(`${push.stdout}\n${push.stderr}`);
console.log(pushText);
if (push.status !== 0) {
  console.error('[migrate] A database update failed; the deploy stops here so the app never runs against a half-built database.');
  process.exit(1);
}
console.log('[migrate] Database is ready.');

async function tablesExist() {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!base || !key) return false;
  try {
    const headers = { apikey: key };
    if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
    const response = await fetch(`${base}/rest/v1/organizations?select=id&limit=1`, { headers });
    return response.ok;
  } catch {
    return false;
  }
}
