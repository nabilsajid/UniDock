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

## Quick start: one click

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fnabilsajid%2FUniDock&project-name=unidock&repository-name=unidock&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22supabase%22%2C%22productSlug%22%3A%22supabase%22%2C%22protocol%22%3A%22storage%22%2C%22allowConnectExistingProduct%22%3Atrue%7D%5D)

1. **Click Deploy with Vercel.** Sign in to Vercel and GitHub. Vercel copies UniDock to your GitHub account.
2. **Add Supabase when Vercel asks.** Create a new Supabase project (the free plan is enough) or connect an existing one. Vercel fills in every key for you.
3. **Wait for the deploy.** The database is built during the deploy: every table, rule and update.
4. **Open your new link.** UniDock asks a few questions:
   - your company name and logo (PNG)
   - your email and password, entered twice
   - your Supabase secret key, to prove the install is yours (Supabase → Project Settings → API Keys; it is checked once and never stored)
   - which extras you want: KPI system, invoice generation, calendar

   Then it creates your admin workspace and signs you in.

### Getting updates

Your install runs from your own copy of UniDock on GitHub, so new versions reach it only when that copy is updated. Vercel then redeploys, applies any new database updates by itself, and your team gets the new version the next time they refresh.

- **Forked** (GitHub **Fork**, then imported into Vercel): open your fork and click **Sync fork**.
- **Deployed with the button** (a copy, not a fork): run `git pull https://github.com/nabilsajid/UniDock main` in your copy and push it.

Everything else is optional and listed in [`.env.example`](.env.example). After signing in, **Settings → System check** shows that every database update has been applied.

### Hosting somewhere else

UniDock is a standard Next.js app, so any Node host works (`npm run build && npm start`). Set the three Supabase values from [`.env.example`](.env.example) and `SUPABASE_DB_URL` (Supabase → Connect → Session pooler). The build applies the database updates. Then open the site and answer the setup questions. Outside Vercel, call `/api/cron/daily` once a day with your `CRON_SECRET` (Vercel does this from `vercel.json`).

## Run it locally

```bash
npm install
cp .env.example .env.local   # then fill in the Supabase values
npm run dev                  # http://localhost:3000, which opens the setup questions
```

Apply the database first: either run `supabase db push` with the [Supabase CLI](https://supabase.com/docs/guides/cli), or paste each file in `supabase/migrations/` into the Supabase SQL editor in filename order. For a company full of sample people instead, run `npm run seed:demo`.

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
