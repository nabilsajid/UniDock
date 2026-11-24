# Contributing to UniDock

Thanks for helping. Bug reports, ideas and pull requests are all welcome.

## Before you start

- For a bug, open an issue with steps to reproduce it.
- For a new feature, open an issue first so we can agree on the approach before you write code.

## Working on the code

1. Fork the repository and create a branch from `main`.
2. Set it up locally as described in the [README](README.md#run-it-locally).
3. Read [docs/DEVELOPER.md](docs/DEVELOPER.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
4. Keep changes focused: one fix or feature per pull request, without unrelated refactoring.

## Database changes

- Add a new file in `supabase/migrations/`, numbered after the last one. Never edit a migration that has already been released.
- Make it safe for existing data: `if not exists`, defaults for new columns, backfills where needed.
- New tables need row level security and policies. Add checks to `tests/db/smoke.sql`.
- Add a probe to `src/lib/domain/system-check.ts`.

## Before opening a pull request

```bash
npm run typecheck
npm test
npm run test:db   # needs psql and a throwaway DATABASE_URL
```

The **Checks** workflow runs the same on every pull request.

## Security

Never commit keys, passwords or `.env.local`. To report a vulnerability, see [SECURITY.md](SECURITY.md).

By contributing, you agree that your contributions are licensed under the [MIT licence](LICENSE).
