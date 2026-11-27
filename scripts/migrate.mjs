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

// Snapshots before an update (see snapshot() at the end).
const BUCKET = 'unidock-snapshots';
const KEEP = 10;
const PAGE = 1000;

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

// Before changing a database that already holds a company's data, keep a copy of it.
if (await tablesExist()) {
  if (process.env.SKIP_PRE_UPDATE_SNAPSHOT === 'true') {
    console.warn('[migrate] SKIP_PRE_UPDATE_SNAPSHOT is set: applying updates without a snapshot first.');
  } else {
    const pending = [...planText.matchAll(/(\d{14}_[\w-]+\.sql)/g)].map((match) => match[1]);
    const saved = await snapshot(pending).catch((error) => {
      console.error(`[migrate] Snapshot failed: ${error instanceof Error ? error.message : error}`);
      return null;
    });
    if (!saved) {
      console.error(
        '[migrate] Stopping the deploy: no snapshot could be taken, so the database was not changed and the current version stays live. ' +
          'Fix the cause, or set SKIP_PRE_UPDATE_SNAPSHOT=true to update without one.',
      );
      process.exit(1);
    }
    console.log(`[migrate] Snapshot saved: ${saved}`);
  }
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

// ---- Snapshot before an update ---------------------------------------------
// Every table the API can see, plus the sign-in accounts (without passwords),
// gzipped into the private Storage bucket "unidock-snapshots". The last 10 are
// kept. Only the secret key can read them; download one from Supabase →
// Storage → unidock-snapshots.

async function snapshot(pending) {
  const { gzipSync } = await import('node:zlib');
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!base || !key) throw new Error('the Supabase URL or secret key is not set');
  const headers = { apikey: key };
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;

  const call = async (path, init = {}) => {
    const response = await fetch(`${base}${path}`, { ...init, headers: { ...headers, ...(init.headers || {}) } });
    if (!response.ok && response.status !== 409) throw new Error(`${init.method || 'GET'} ${path.split('?')[0]}: ${response.status} ${(await response.text()).slice(0, 200)}`);
    return response;
  };

  // The tables (and views) the API serves.
  const spec = await (await call('/rest/v1/', { headers: { Accept: 'application/openapi+json' } })).json();
  const tables = Object.keys(spec.paths || {})
    .filter((path) => path !== '/' && !path.startsWith('/rpc/'))
    .map((path) => path.slice(1))
    .sort();

  const data = {};
  let rows = 0;
  for (const table of tables) {
    const all = [];
    for (let from = 0; ; from += PAGE) {
      const response = await call(`/rest/v1/${encodeURIComponent(table)}?select=*`, {
        headers: { 'Range-Unit': 'items', Range: `${from}-${from + PAGE - 1}` },
      });
      const page = await response.json();
      all.push(...page);
      if (page.length < PAGE) break;
    }
    data[table] = all;
    rows += all.length;
  }

  const users = [];
  for (let page = 1; ; page += 1) {
    const body = await (await call(`/auth/v1/admin/users?page=${page}&per_page=${PAGE}`)).json();
    const list = body.users || [];
    users.push(...list);
    if (list.length < PAGE) break;
  }

  const { version } = JSON.parse((await import('node:fs')).readFileSync('package.json', 'utf8'));
  const takenAt = new Date().toISOString();
  const file = `${takenAt.replace(/[:.]/g, '-')}-before-v${version}.json.gz`;
  const payload = gzipSync(JSON.stringify({ kind: 'unidock-snapshot', format: 1, taken_at: takenAt, updating_to: version, pending, tables: data, auth_users: users }));

  await call('/storage/v1/bucket', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }),
  });
  await call(`/storage/v1/object/${BUCKET}/${file}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/gzip', 'x-upsert': 'true' },
    body: payload,
  });

  // Keep only the newest few.
  try {
    const listed = await (
      await call(`/storage/v1/object/list/${BUCKET}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix: '', limit: 1000, sortBy: { column: 'name', order: 'desc' } }),
      })
    ).json();
    const old = listed.map((item) => item.name).filter((name) => name.endsWith('.json.gz')).slice(KEEP);
    if (old.length) {
      await call(`/storage/v1/object/${BUCKET}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefixes: old }),
      });
    }
  } catch (error) {
    console.warn(`[migrate] Could not tidy old snapshots: ${error instanceof Error ? error.message : error}`);
  }

  return `${BUCKET}/${file} (${tables.length} tables, ${rows} rows, ${users.length} accounts, ${Math.round(payload.length / 1024)} KB)`;
}
