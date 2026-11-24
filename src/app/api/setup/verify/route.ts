import { z } from 'zod';
import { fail, ok, readJson } from '@/lib/api/http';
import { ownsProject, setupState } from '@/lib/server/setup';

const body = z.object({ key: z.string().trim().min(1, 'Paste your Supabase secret key.').max(2000) });

// First-run setup: checks the pasted Supabase secret key and reports whether the
// database is ready. Closed for good once a company exists.
export async function POST(request: Request): Promise<Response> {
  const input = await readJson(request, body);
  if (input.response) return input.response;
  const state = await setupState();
  if (!state.connected) return fail(503, 'This install is not connected to Supabase yet. Add the Supabase integration in Vercel, then redeploy.');
  if (!state.open) return fail(409, 'UniDock is already set up. Sign in instead.');
  if (!(await ownsProject(input.data.key))) {
    return fail(403, 'That key does not belong to the linked Supabase project. Copy the secret key (service_role) from Supabase → Project Settings → API Keys.');
  }
  return ok({ project: state.project, databaseReady: state.databaseReady, applied: state.applied, total: state.total });
}
