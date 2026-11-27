# Releasing UniDock

For maintainers. A release is what other companies' installs update to, so it must be tested and must never lose their data.

## Choose the version number

| What changed | Bump | Example |
| --- | --- | --- |
| Fixes only | PATCH | 1.0.0 → 1.0.1 |
| New features; everything old keeps working | MINOR | 1.0.1 → 1.1.0 |
| Users must act, or something stops working | MAJOR | 1.4.2 → 2.0.0 |

## Steps

1. Make sure `main` is green (the **Checks** workflow) and the change has run on a test install.
2. In `CHANGELOG.md`, move the items under `[Unreleased]` into a new section, `## [1.1.0]`, grouped under Added, Changed, Fixed and Removed. Write them for admins, not developers.
3. Set `"version"` in `package.json` (and the two `"version"` lines at the top of `package-lock.json`) to the same number.
4. Lock the migrations: `npm run migrations:lock`. This records every migration file as released, so it can never be edited afterwards.
5. Commit ("Release 1.1.0"), push, then tag and push the tag:

   ```bash
   git tag v1.1.0
   git push origin v1.1.0
   ```

   The **Release** workflow checks the tag against `package.json` and publishes the GitHub release with the changelog notes. Within a few hours, admins on older versions see the update notice.

## Database changes that never lose data

Installs update their database before the new app version goes live, and an update can be rolled back only by restoring a snapshot. So every database change must work with both the old and the new app:

- **Add, don't remove.** New tables, new columns with defaults, new functions.
- **Removing takes two releases.** First release: stop using the column or table. A later release: drop it, with a `-- unidock: destructive-ok <reason>` line in the file so the check lets it through.
- **Renaming** is adding the new name, copying the data, and dropping the old name in a later release.
- **Never edit a released migration.** Fix it with a new one. The **Checks** workflow fails if a locked file changes (`supabase/migrations.lock`).

`scripts/check-migrations.mjs` enforces these rules on every push.

## Before every update

`scripts/migrate.mjs` runs during each deploy. When there are database updates to apply, it first saves a snapshot of every table to the install's private Supabase Storage bucket `unidock-snapshots`. It keeps the last 10 and stops the deploy if the snapshot fails.
