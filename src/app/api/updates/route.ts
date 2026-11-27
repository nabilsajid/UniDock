import { requireContext } from '@/lib/api/context';
import { ok } from '@/lib/api/http';
import { checkForUpdate } from '@/lib/server/updates';

// Admins: the running version and the newest UniDock release.
export async function GET(): Promise<Response> {
  const auth = await requireContext('admin');
  if (auth.response) return auth.response;
  return ok(await checkForUpdate());
}
