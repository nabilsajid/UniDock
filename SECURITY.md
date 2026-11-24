# Security policy

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Report them privately through GitHub: **Security → Report a vulnerability** on this repository. Include what you found, how to reproduce it, and the impact you expect. We aim to reply within a week.

## Supported versions

Fixes are made on the latest version on `main`. Keep your copy up to date.

## Keeping your install safe

- `SUPABASE_SERVICE_ROLE_KEY` bypasses row level security. Keep it server-side only: never in a `NEXT_PUBLIC_` variable, the browser, or a commit.
- Set `CRON_SECRET` so only Vercel can run the daily job.
- Apply every database update (Settings → System check shows any that are missing).
- Use a strong, unique password for each admin account.
