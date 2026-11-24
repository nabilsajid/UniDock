import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { setupState } from '@/lib/server/setup';
import { SetupWizard } from './setup-wizard';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Set up UniDock' };

// First run: the questions that turn a fresh install into a company workspace.
// Once a company exists this page only sends people to sign in.
export default async function SetupPage() {
  const state = await setupState();
  if (state.connected && !state.open) redirect('/login');

  return (
    <div className="su-scene">
      {/* Faint grid and slow purple glows. Decorative only. */}
      <div className="su-grid" aria-hidden />
      <div className="su-glow su-glow-a" aria-hidden />
      <div className="su-glow su-glow-b" aria-hidden />
      <div className="su-glow su-glow-c" aria-hidden />
      {state.connected ? (
        <SetupWizard />
      ) : (
        <main className="su-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/unidock-logo.svg" alt="UniDock" width={168} height={32} className="su-logo" />
          <div className="su-step-body">
            <p className="su-eyebrow">Almost there</p>
            <h1>Connect a Supabase project</h1>
            <p className="su-lead">UniDock keeps your company&apos;s data in your own Supabase project. This install is not linked to one yet.</p>
            <ol className="su-howto">
              <li>
                Open this project in <strong>Vercel</strong> → <strong>Storage</strong> (or Integrations) and add <strong>Supabase</strong>. It creates the
                project and fills in the keys for you.
              </li>
              <li>
                Go to <strong>Deployments</strong> and <strong>Redeploy</strong>. The database is built during the deploy.
              </li>
              <li>Open this page again to set up your company.</li>
            </ol>
            <p className="su-note">
              Hosting somewhere else? Set <code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and{' '}
              <code>SUPABASE_SERVICE_ROLE_KEY</code>, plus <code>SUPABASE_DB_URL</code> so the database can be built, then redeploy.
            </p>
          </div>
        </main>
      )}
    </div>
  );
}
