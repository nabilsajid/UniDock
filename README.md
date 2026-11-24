# UniDock

**Run your whole company from one place.** UniDock is an open-source workspace for small companies and startups: projects and tasks, costs and equipment, cash flow and invoices, people, attendance and rewards, with a dashboard for each role.

Built with Next.js (App Router, TypeScript) and Supabase (Postgres, Auth, row level security). Free to self-host.

## Features

- **Projects & tasks.** Board view, assigned teams, deadlines, deliverables, comments, client review links and a client portal.
- **Logistics & costs.** Equipment with condition tags, check-outs, an urgent-needs list and trip costs.
- **Cash flow & invoices.** Monthly cash flow with a month picker, invoices and payments, recurring and fixed costs, investments and payslips.
- **People & rewards.** Profiles, attendance with entry and exit times, leave with yearly allowances, salary advances, and a monthly points system with bonuses.
- **Roles as tags.** A person can hold several roles. The admin decides what each role can see and edit, and changes by managers wait for admin approval.
- **Updates.** Notice board, urgent broadcasts to the admin, notifications, and optional email, WhatsApp and device alerts.
- **Several companies.** One install can host separate companies, each with its own admin and data.
- **Installable.** Works as an app on Android, iPhone and desktop.

## Quick start (hosted on Vercel)

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (the free plan is enough to start).
2. **Fork this repository** on GitHub.
3. **Set up the database.** In your fork, go to Settings → Secrets and variables → Actions and add:
   - Secret `SUPABASE_DB_URL`: Supabase → Connect → *Session pooler* connection string, with your database password filled in.
   - Variable `FRESH_DATABASE` = `true`.

   Then open Actions → **Database update** → Run workflow, untick *dry run*, and run it. It creates every table. Afterwards, delete the `FRESH_DATABASE` variable. From then on, new updates apply by themselves when they reach `main`.
4. **Deploy on Vercel.** Import your fork at [vercel.com/new](https://vercel.com/new) and add these environment variables (Supabase → Project Settings → API):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (keep this one secret)
   - `CRON_SECRET`: any long random text
5. **Create your company and admin.** On your computer, copy `.env.example` to `.env.local`, fill in the Supabase values and the `DEMO_*` values (company name, your email and a password), then run `npm install` and `npm run seed:demo`. Sign in to your Vercel address with that email and password.

Everything else is optional and listed in [`.env.example`](.env.example). After signing in, **Settings → System check** shows whether every database update has been applied.

## Run it locally

```bash
npm install
cp .env.example .env.local   # then fill in the Supabase values
npm run seed:demo            # creates a company, its admin and demo employees
npm run dev                  # http://localhost:3000
```

Apply the database first: either run `supabase db push` with the [Supabase CLI](https://supabase.com/docs/guides/cli), or paste each file in `supabase/migrations/` into the Supabase SQL editor in filename order.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the app locally |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit and route tests (no database needed) |
| `npm run test:db` | Database checks for triggers, views and row level security (needs `psql` and `DATABASE_URL`) |
| `npm run seed:demo` | Create a company, its admin user and the demo employees |

## Things to know

- Phone numbers are currently checked against the Bangladesh format, and amounts are shown in BDT. Making both configurable is on the roadmap. Contributions are welcome.
- Files are not uploaded to the app. Work is shared as Google Drive or Dropbox links.
- Each company's logo is uploaded in Settings. Until then, its name is shown.

## Documentation

- [docs/DEVELOPER.md](docs/DEVELOPER.md): developer guide
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): how the code is organized and how to extend it
- [docs/DATA_MODEL.md](docs/DATA_MODEL.md): tables, views and the automatic behaviours in the database
- [docs/POINTS_AND_BONUSES.md](docs/POINTS_AND_BONUSES.md): the monthly points rules
- [docs/API.md](docs/API.md): API routes and who may call them

## Installing it as an app

- **Android (Chrome):** open the site, tap the menu, then "Install app" or "Add to Home screen".
- **iPhone or iPad (Safari):** open the site, tap Share, then "Add to Home Screen".
- **Computer (Chrome or Edge):** click "Install app" in the top bar, or the install icon in the address bar.

The installed app and the website are the same live system. Without a connection it shows an offline page.

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md). To report a security problem, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.

## Licence

[MIT](LICENSE) © Nabil Azmal Sajid and UniDock contributors.
