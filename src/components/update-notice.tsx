'use client';

import { useEffect, useState } from 'react';
import { ArrowUpCircle, X } from 'lucide-react';

interface UpdateInfo {
  current: string;
  latest: string | null;
  kind: 'major' | 'minor' | 'patch' | null;
  releaseUrl: string | null;
  updateUrl: string;
}

const SESSION_KEY = 'unidock-update-info';
const DISMISS_KEY = 'unidock-update-dismissed';

// Storage can be missing or blocked (private windows, some embedded views).
function read(storage: 'session' | 'local', key: string): string | null {
  try {
    return (storage === 'session' ? window.sessionStorage : window.localStorage).getItem(key);
  } catch {
    return null;
  }
}
function write(storage: 'session' | 'local', key: string, value: string) {
  try {
    (storage === 'session' ? window.sessionStorage : window.localStorage).setItem(key, value);
  } catch {
    // Nothing to do: the notice just shows again next time.
  }
}

/**
 * For admins: a quiet bar when a newer UniDock release is out, with what's new
 * and a link to start the update. Checked once per browser session; hiding it
 * hides that version only.
 */
export function UpdateNotice() {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const cached = read('session', SESSION_KEY);
    if (cached) {
      try {
        setInfo(JSON.parse(cached) as UpdateInfo);
        return;
      } catch {
        // Fetch again below.
      }
    }
    let live = true;
    fetch('/api/updates', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { data?: UpdateInfo } | null) => {
        if (!live || !body?.data) return;
        write('session', SESSION_KEY, JSON.stringify(body.data));
        setInfo(body.data);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  if (!info?.kind || !info.latest || hidden || read('local', DISMISS_KEY) === info.latest) return null;

  return (
    <div role="status" className="update-notice">
      <ArrowUpCircle size={18} aria-hidden className="update-notice-icon" />
      <p>
        <strong>UniDock {info.latest} is available.</strong> You have {info.current}.
        {info.kind === 'major' ? ' This is a major update: read the upgrade steps before updating.' : ' A snapshot of your data is taken before it is applied.'}
      </p>
      <div className="update-notice-actions">
        {info.releaseUrl ? (
          <a href={info.releaseUrl} target="_blank" rel="noreferrer">
            What&apos;s new
          </a>
        ) : null}
        <a href={info.updateUrl} target="_blank" rel="noreferrer" className="update-notice-primary">
          Update now
        </a>
        <button
          type="button"
          aria-label="Hide until the next version"
          onClick={() => {
            write('local', DISMISS_KEY, info.latest ?? '');
            setHidden(true);
          }}
        >
          <X size={15} aria-hidden />
        </button>
      </div>
    </div>
  );
}
