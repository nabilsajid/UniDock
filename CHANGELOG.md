# Changelog

Every release of UniDock, newest first. Versions follow [semantic versioning](https://semver.org):

- **PATCH** (1.0.0 → 1.0.1): fixes only.
- **MINOR** (1.0.1 → 1.1.0): new features; everything that worked keeps working.
- **MAJOR** (1.4.2 → 2.0.0): something you must act on, or that stops working. Each one comes with upgrade steps.

Each release lists its changes under **Added**, **Changed**, **Fixed** and **Removed**. The update notice inside UniDock shows the notes of the newest release.

## [Unreleased]

## [1.0.0]

The first public release.

### Added

- Projects and tasks, logistics and costs, cash flow and invoices, people, attendance, payroll and rewards, with a dashboard for each role.
- Roles as tags, with admin approval of changes made by managers.
- Several companies in one install.
- First-run setup: company, logo, admin account, Supabase link and the extras to start with (KPI system, invoice generation, calendar).
- Point rules the admin sets (monthly target, points per office day, default task points, bonus), and a rewards list with default points.
- Violet as the default colour; other accents in Settings → Appearance.
- Database updates applied automatically on every deploy, with a snapshot of the data taken first.
- An update notice for admins when a newer release is out, and a one-click update for your own copy on GitHub.
