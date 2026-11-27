import { compareVersions, updateKind } from '@/lib/domain/version';

// Whether a newer UniDock release is out. Reads only GitHub's public list of
// releases for the official repository: nothing about this install is sent,
// and nothing is downloaded or installed from here. Checked at most every six
// hours. UNIDOCK_UPDATE_CHECK=off turns it off; UNIDOCK_UPDATE_REPO points it
// at another repository (owner/name), for example your own fork's releases.

export interface UpdateInfo {
  current: string;
  latest: string | null;
  kind: 'major' | 'minor' | 'patch' | null;
  /** The release page with its notes. */
  releaseUrl: string | null;
  notes: string | null;
  publishedAt: string | null;
  /** Where to start the update: this install's own "Update UniDock" action, when known. */
  updateUrl: string;
}

const OFFICIAL_REPO = 'nabilsajid/UniDock';
const REPO_PATTERN = /^[\w.-]+\/[\w.-]+$/;

export function currentVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0';
}

/** This install's own GitHub copy, from Vercel's system variables, if it exposes them. */
function ownRepo(): string | null {
  const owner = process.env.VERCEL_GIT_REPO_OWNER;
  const slug = process.env.VERCEL_GIT_REPO_SLUG;
  return owner && slug ? `${owner}/${slug}` : null;
}

export async function checkForUpdate(): Promise<UpdateInfo> {
  const current = currentVersion();
  const own = ownRepo();
  const updateUrl = own
    ? `https://github.com/${own}/actions/workflows/update-unidock.yml`
    : `https://github.com/${OFFICIAL_REPO}#getting-updates`;
  const empty: UpdateInfo = { current, latest: null, kind: null, releaseUrl: null, notes: null, publishedAt: null, updateUrl };
  if (process.env.UNIDOCK_UPDATE_CHECK === 'off') return empty;

  const repo = REPO_PATTERN.test(process.env.UNIDOCK_UPDATE_REPO ?? '') ? (process.env.UNIDOCK_UPDATE_REPO as string) : OFFICIAL_REPO;
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'UniDock' },
      next: { revalidate: 6 * 60 * 60 },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return empty;
    const release = (await response.json()) as { tag_name?: string; html_url?: string; body?: string; published_at?: string; draft?: boolean; prerelease?: boolean };
    if (!release.tag_name || release.draft || release.prerelease) return empty;
    const latest = release.tag_name.replace(/^v/, '');
    // Only links on GitHub itself are passed on.
    const releaseUrl = typeof release.html_url === 'string' && release.html_url.startsWith('https://github.com/') ? release.html_url : null;
    return {
      ...empty,
      latest,
      kind: compareVersions(latest, current) > 0 ? updateKind(current, latest) : null,
      releaseUrl,
      notes: typeof release.body === 'string' ? release.body.slice(0, 4000) : null,
      publishedAt: release.published_at ?? null,
    };
  } catch {
    return empty;
  }
}
