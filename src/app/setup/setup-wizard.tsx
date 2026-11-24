'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent, type ReactNode } from 'react';
import { CalendarDays, Check, Eye, EyeOff, FileText, ImagePlus, KeyRound, Loader2, TrendingUp, X } from 'lucide-react';
import { fitLogo } from '@/components/image-tools';
import { createClient } from '@/lib/supabase/browser';

type Step = 'welcome' | 'company' | 'admin' | 'link' | 'features' | 'building';
const STEPS: Step[] = ['welcome', 'company', 'admin', 'link', 'features'];

interface Linked {
  project: string | null;
  databaseReady: boolean;
  applied: number;
  total: number;
}

const FEATURES = [
  { key: 'kpi', icon: TrendingUp, title: 'KPI system', about: 'On-time delivery, first-time approval, revenue per client and points per person.' },
  { key: 'invoices', icon: FileText, title: 'Invoice generation', about: 'Monthly and extras invoices made from projects, with your logo and payment details.' },
  { key: 'calendar', icon: CalendarDays, title: 'Calendar', about: 'One month view of due dates, shoots and leave for the whole team.' },
] as const;
type FeatureKey = (typeof FEATURES)[number]['key'];

const BUILD_LINES = ['Setting up your company', 'Turning on your features', 'Preparing your dashboard'];
const BUILD_MS = 2000;

/**
 * The first-run questions: company, admin account, linking Supabase, and the
 * features to start with. Nothing is saved until the last step, so going back
 * and forth is free. Then a short "creating" screen, and into the dashboard.
 */
export function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('welcome');
  const [error, setError] = useState<string | null>(null);

  const [company, setCompany] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const [admin, setAdmin] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);

  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [checking, setChecking] = useState(false);
  const [linked, setLinked] = useState<Linked | null>(null);
  const [revealed, setRevealed] = useState(0);

  const [features, setFeatures] = useState<Record<FeatureKey, boolean>>({ kpi: true, invoices: true, calendar: true });
  const [buildLine, setBuildLine] = useState(0);

  const index = STEPS.indexOf(step as (typeof STEPS)[number]);

  // Reveal the connection checklist one line at a time.
  useEffect(() => {
    if (!linked) return setRevealed(0);
    setRevealed(0);
    const timers = [1, 2, 3].map((count) => window.setTimeout(() => setRevealed(count), count * 380));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [linked]);

  // The "creating" screen walks through its lines while the account is made.
  useEffect(() => {
    if (step !== 'building') return;
    setBuildLine(0);
    const timer = window.setInterval(() => setBuildLine((line) => Math.min(line + 1, BUILD_LINES.length - 1)), BUILD_MS / BUILD_LINES.length);
    return () => window.clearInterval(timer);
  }, [step]);

  function go(next: Step) {
    setError(null);
    setStep(next);
  }

  async function takeLogo(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.type !== 'image/png') return setError('Choose a PNG file for the logo.');
    if (file.size > 5 * 1024 * 1024) return setError('That file is over 5 MB. Choose a smaller PNG.');
    setLogoBusy(true);
    try {
      const data = await fitLogo(file);
      if (data.length > 400000) setError('That logo is still too large after resizing. Try a simpler PNG.');
      else setLogo(data);
    } catch {
      setError('That PNG could not be read. Try another file.');
    } finally {
      setLogoBusy(false);
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void takeLogo(event.dataTransfer.files?.[0]);
  }

  function submitCompany(event: FormEvent) {
    event.preventDefault();
    if (company.trim().length < 2) return setError('Write your company name.');
    go('admin');
  }

  function submitAdmin(event: FormEvent) {
    event.preventDefault();
    if (admin.name.trim().length < 2) return setError('Write your name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(admin.email.trim())) return setError('Write a valid email address.');
    if (admin.password.length < 8) return setError('Use at least 8 characters for the password.');
    if (admin.password !== admin.confirm) return setError('The two passwords do not match.');
    go('link');
  }

  async function checkKey(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLinked(null);
    setChecking(true);
    const response = await fetch('/api/setup/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    }).catch(() => null);
    setChecking(false);
    const result = (await response?.json().catch(() => null)) as { data?: Linked; error?: { message?: string } } | null;
    if (!response?.ok || !result?.data) return setError(result?.error?.message ?? 'Could not reach the server. Check your connection and try again.');
    setLinked(result.data);
  }

  async function finish() {
    setError(null);
    setStep('building');
    const started = Date.now();
    const response = await fetch('/api/setup/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key,
        company_name: company.trim(),
        logo_data: logo,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        admin_name: admin.name.trim(),
        admin_email: admin.email.trim(),
        admin_password: admin.password,
        confirm_password: admin.confirm,
        features,
      }),
    }).catch(() => null);
    const result = (await response?.json().catch(() => null)) as { error?: { message?: string } } | null;
    if (!response?.ok) {
      setStep('features');
      return setError(result?.error?.message ?? 'Could not finish setting up. Try again.');
    }
    const signIn = await createClient().auth.signInWithPassword({ email: admin.email.trim(), password: admin.password });
    // Let the "creating" screen play out in full, however fast the server was.
    const left = BUILD_MS - (Date.now() - started);
    if (left > 0) await new Promise((resolve) => window.setTimeout(resolve, left));
    if (signIn.error) {
      router.replace('/login');
      return;
    }
    router.replace('/dashboard');
    router.refresh();
  }

  if (step === 'building') {
    return (
      <main className="su-building" role="status" aria-live="polite">
        <div className="su-orbit" aria-hidden>
          <span className="su-orbit-ring" />
          <span className="su-orbit-ring su-orbit-ring-2" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/unidock-mark.svg" alt="" width={56} height={56} className="su-orbit-mark" />
        </div>
        <h1>Creating admin interface for you</h1>
        <p key={buildLine} className="su-build-line">
          {BUILD_LINES[buildLine]}…
        </p>
        <div className="su-progress" aria-hidden>
          <span style={{ animationDuration: `${BUILD_MS}ms` }} />
        </div>
      </main>
    );
  }

  return (
    <main className="su-card" aria-labelledby="su-title">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/unidock-logo.svg" alt="UniDock" width={168} height={32} className="su-logo" />

      {step !== 'welcome' ? (
        <ol className="su-dots" aria-label={`Step ${index} of ${STEPS.length - 1}`}>
          {STEPS.slice(1).map((name, position) => (
            <li key={name} className={position + 1 < index ? 'done' : position + 1 === index ? 'current' : undefined} />
          ))}
        </ol>
      ) : null}

      <div key={step} className="su-step-body">
        {step === 'welcome' ? (
          <>
            <p className="su-eyebrow">Welcome</p>
            <h1 id="su-title">Let&apos;s set up your workspace</h1>
            <p className="su-lead">A few quick questions and your company will have projects, finances and its team in one place. It takes about a minute.</p>
            <button type="button" className="su-primary" onClick={() => go('company')} autoFocus>
              Get started
            </button>
          </>
        ) : null}

        {step === 'company' ? (
          <form onSubmit={submitCompany} noValidate>
            <p className="su-eyebrow">Your company</p>
            <h1 id="su-title">What is your company called?</h1>
            <Field label="Company name">
              <input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Acme Studio" maxLength={80} autoFocus required />
            </Field>
            <div className="su-field">
              <span>Logo (PNG)</span>
              <div
                className={dragging ? 'su-drop dragging' : logo ? 'su-drop filled' : 'su-drop'}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
              >
                {logo ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logo} alt="Your logo" className="su-logo-preview" />
                    <button type="button" className="su-icon-button" onClick={() => setLogo(null)} aria-label="Remove logo">
                      <X size={15} aria-hidden />
                    </button>
                  </>
                ) : (
                  <button type="button" className="su-drop-button" onClick={() => fileInput.current?.click()} disabled={logoBusy}>
                    {logoBusy ? <Loader2 size={18} className="su-spin" aria-hidden /> : <ImagePlus size={18} aria-hidden />}
                    <span>{logoBusy ? 'Preparing…' : 'Drop a PNG here, or choose a file'}</span>
                  </button>
                )}
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/png"
                  hidden
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    void takeLogo(event.target.files?.[0]);
                    event.target.value = '';
                  }}
                />
              </div>
              <small>Shown on invoices, payslips and in the menu. You can add it later in Settings.</small>
            </div>
            <Actions onBack={() => go('welcome')} next="Continue" />
          </form>
        ) : null}

        {step === 'admin' ? (
          <form onSubmit={submitAdmin} noValidate>
            <p className="su-eyebrow">Your admin account</p>
            <h1 id="su-title">Who will run {company.trim() || 'the company'}?</h1>
            <Field label="Your name">
              <input value={admin.name} onChange={(event) => setAdmin({ ...admin, name: event.target.value })} autoComplete="name" maxLength={80} autoFocus />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={admin.email}
                onChange={(event) => setAdmin({ ...admin, email: event.target.value })}
                autoComplete="email"
                placeholder="you@company.com"
              />
            </Field>
            <Field label="Password">
              <div className="su-secret">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={admin.password}
                  onChange={(event) => setAdmin({ ...admin, password: event.target.value })}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                />
                <button type="button" className="su-icon-button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}
                </button>
              </div>
            </Field>
            <Field label="Re-enter password">
              <div className="su-secret">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={admin.confirm}
                  onChange={(event) => setAdmin({ ...admin, confirm: event.target.value })}
                  autoComplete="new-password"
                />
                {admin.confirm ? (
                  <span className={admin.confirm === admin.password ? 'su-match ok' : 'su-match'} aria-hidden>
                    {admin.confirm === admin.password ? <Check size={14} /> : <X size={14} />}
                  </span>
                ) : null}
              </div>
            </Field>
            <Actions onBack={() => go('company')} next="Continue" />
          </form>
        ) : null}

        {step === 'link' ? (
          <form onSubmit={checkKey} noValidate>
            <p className="su-eyebrow">Link Supabase</p>
            <h1 id="su-title">Connect your database</h1>
            <p className="su-lead">
              Paste your Supabase <strong>secret key</strong> to prove this install is yours. Find it in Supabase → Project Settings → API Keys. It is checked once
              and never stored.
            </p>
            <Field label="Supabase secret key">
              <div className="su-secret">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={key}
                  onChange={(event) => {
                    setKey(event.target.value);
                    setLinked(null);
                  }}
                  placeholder="sb_secret_… or service_role key"
                  autoComplete="off"
                  spellCheck={false}
                  autoFocus
                />
                <button type="button" className="su-icon-button" onClick={() => setShowKey(!showKey)} aria-label={showKey ? 'Hide key' : 'Show key'}>
                  {showKey ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}
                </button>
              </div>
            </Field>

            {linked ? (
              <ul className="su-checks" aria-live="polite">
                <Check3 shown={revealed >= 1} ok label="Key verified" />
                <Check3 shown={revealed >= 2} ok label={`Connected to ${linked.project ?? 'your project'}`} />
                <Check3
                  shown={revealed >= 3}
                  ok={linked.databaseReady}
                  label={linked.databaseReady ? `Database ready · ${linked.total} updates applied` : `Database still being built · ${linked.applied} of ${linked.total}`}
                />
              </ul>
            ) : null}
            {linked && !linked.databaseReady && revealed >= 3 ? (
              <p className="su-note">
                The database is built while Vercel deploys. If this stays unfinished, redeploy in Vercel (Deployments → Redeploy), then check again.
              </p>
            ) : null}

            <div className="su-actions">
              <button type="button" className="su-ghost" onClick={() => go('admin')}>
                Back
              </button>
              {linked?.databaseReady && revealed >= 3 ? (
                <button type="button" className="su-primary" onClick={() => go('features')}>
                  Continue
                </button>
              ) : (
                <button type="submit" className="su-primary" disabled={checking || key.trim().length < 20}>
                  {checking ? <Loader2 size={16} className="su-spin" aria-hidden /> : <KeyRound size={16} aria-hidden />}
                  {checking ? 'Connecting…' : linked ? 'Check again' : 'Connect'}
                </button>
              )}
            </div>
          </form>
        ) : null}

        {step === 'features' ? (
          <div>
            <p className="su-eyebrow">Your features</p>
            <h1 id="su-title">What does {company.trim() || 'your company'} need?</h1>
            <p className="su-lead">Projects, tasks, cash flow and your team are always included. Pick the extras; you can change them any time in Settings.</p>
            <div className="su-features">
              {FEATURES.map(({ key: feature, icon: Icon, title, about }) => {
                const on = features[feature];
                return (
                  <button
                    key={feature}
                    type="button"
                    role="switch"
                    aria-checked={on}
                    className={on ? 'su-feature on' : 'su-feature'}
                    onClick={() => setFeatures({ ...features, [feature]: !on })}
                  >
                    <span className="su-feature-icon" aria-hidden>
                      <Icon size={18} />
                    </span>
                    <span className="su-feature-text">
                      <strong>{title}</strong>
                      <small>{about}</small>
                    </span>
                    <span className="su-switch" aria-hidden>
                      <span />
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="su-actions">
              <button type="button" className="su-ghost" onClick={() => go('link')}>
                Back
              </button>
              <button type="button" className="su-primary" onClick={finish}>
                Create my workspace
              </button>
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="su-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="su-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Actions({ onBack, next }: { onBack: () => void; next: string }) {
  return (
    <div className="su-actions">
      <button type="button" className="su-ghost" onClick={onBack}>
        Back
      </button>
      <button type="submit" className="su-primary">
        {next}
      </button>
    </div>
  );
}

function Check3({ shown, ok, label }: { shown: boolean; ok: boolean; label: string }) {
  return (
    <li className={shown ? (ok ? 'shown ok' : 'shown wait') : undefined}>
      <span className="su-check-dot" aria-hidden>
        {ok ? <Check size={12} strokeWidth={3} /> : <Loader2 size={12} className="su-spin" />}
      </span>
      {label}
    </li>
  );
}
