// Version numbers (MAJOR.MINOR.PATCH, see RELEASING.md) and how they compare.

export type Version = [number, number, number];

/** "v1.2.3" or "1.2.3" → [1, 2, 3]; anything else → null. Pre-release tags are ignored. */
export function parseVersion(value: string | null | undefined): Version | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec((value ?? '').trim());
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

/** Negative when a is older than b, zero when equal, positive when newer. Unknown versions count as 0.0.0. */
export function compareVersions(a: string | null | undefined, b: string | null | undefined): number {
  const left = parseVersion(a) ?? [0, 0, 0];
  const right = parseVersion(b) ?? [0, 0, 0];
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

/** What kind of update going from `current` to `latest` is. */
export function updateKind(current: string, latest: string): 'major' | 'minor' | 'patch' | null {
  const from = parseVersion(current);
  const to = parseVersion(latest);
  if (!from || !to || compareVersions(latest, current) <= 0) return null;
  if (to[0] !== from[0]) return 'major';
  if (to[1] !== from[1]) return 'minor';
  return 'patch';
}
