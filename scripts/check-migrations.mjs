// Keeps database updates safe for every install (see RELEASING.md):
//   1. A released migration (listed in supabase/migrations.lock) must never change.
//   2. A new migration must not delete data: no DROP TABLE/COLUMN/SCHEMA,
//      TRUNCATE, unfiltered DELETE, column type changes or renames, unless the
//      file says why with a line "-- unidock: destructive-ok <reason>".
//
//   node scripts/check-migrations.mjs          check (run by the Checks workflow)
//   node scripts/check-migrations.mjs --lock   record every migration as released
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'supabase/migrations';
const LOCK = 'supabase/migrations.lock';

const files = readdirSync(DIR).filter((name) => name.endsWith('.sql')).sort();
const hash = (name) => createHash('sha256').update(readFileSync(join(DIR, name))).digest('hex');

if (process.argv.includes('--lock')) {
  const lines = files.map((name) => `${hash(name)}  ${name}`);
  writeFileSync(LOCK, `# Released migrations and their checksums. Never edit a listed file; add a new one.\n# Updated by: npm run migrations:lock\n${lines.join('\n')}\n`);
  console.log(`Locked ${files.length} migrations.`);
  process.exit(0);
}

const locked = new Map();
if (existsSync(LOCK)) {
  for (const line of readFileSync(LOCK, 'utf8').split('\n')) {
    const match = line.match(/^([0-9a-f]{64})\s+(\S+\.sql)$/);
    if (match) locked.set(match[2], match[1]);
  }
}

const problems = [];

for (const [name, sum] of locked) {
  if (!files.includes(name)) problems.push(`${name}: a released migration was deleted. Released migrations must stay.`);
  else if (hash(name) !== sum) problems.push(`${name}: a released migration was changed. Undo the change and put it in a new migration.`);
}

// Statements that lose data. Comments are removed first, so they never count.
const DESTRUCTIVE = [
  [/\bdrop\s+table\b/i, 'DROP TABLE'],
  [/\bdrop\s+schema\b/i, 'DROP SCHEMA'],
  [/\balter\s+table\b[^;]*\bdrop\s+(column\b|(?!constraint\b|not\b|default\b|policy\b|trigger\b)\w+\s*(,|;))/i, 'DROP COLUMN'],
  [/\btruncate\b/i, 'TRUNCATE'],
  [/\bdelete\s+from\s+[\w.]+\s*;/i, 'DELETE without WHERE'],
  [/\balter\s+column\b[^;]*\btype\b/i, 'changing a column type'],
  [/\brename\s+(column\s+)?\w+\s+to\b/i, 'RENAME'],
  [/\balter\s+table\b[^;]*\brename\s+to\b/i, 'renaming a table'],
];

for (const name of files) {
  if (locked.has(name)) continue;
  const source = readFileSync(join(DIR, name), 'utf8');
  if (/^--\s*unidock:\s*destructive-ok\s+\S/im.test(source)) continue;
  const sql = source.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [pattern, label] of DESTRUCTIVE) {
    if (pattern.test(sql)) {
      problems.push(
        `${name}: uses ${label}, which can delete data on every install. Add instead of removing, or add a line "-- unidock: destructive-ok <reason>" if a release has already stopped using it.`,
      );
    }
  }
}

if (problems.length) {
  console.error(`Migration check failed:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`Migration check passed: ${locked.size} released, ${files.length - locked.size} new.`);
