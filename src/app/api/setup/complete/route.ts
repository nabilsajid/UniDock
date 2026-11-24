import { z } from 'zod';
import { fail, fromDbError, ok, readJson } from '@/lib/api/http';
import { OPTIONAL_SECTIONS, type OptionalSection } from '@/lib/domain/sections';
import { ownsProject, setupState } from '@/lib/server/setup';
import { createAdminClient } from '@/lib/supabase/admin';

const body = z
  .object({
    key: z.string().trim().min(1).max(2000),
    company_name: z.string().trim().min(2, 'Write the company name.').max(80),
    logo_data: z.string().startsWith('data:image/png', 'The logo must be a PNG.').max(400000, 'That logo is too large. Try a smaller image.').nullish(),
    timezone: z.string().trim().min(3).max(60).default('UTC'),
    admin_name: z.string().trim().min(2, 'Write your name.').max(80),
    admin_email: z.string().trim().toLowerCase().email('Write a valid email address.'),
    admin_password: z.string().min(8, 'Use at least 8 characters.').max(72, 'Use at most 72 characters.'),
    confirm_password: z.string(),
    features: z.object({ kpi: z.boolean(), invoices: z.boolean(), calendar: z.boolean() }),
  })
  .refine((value) => value.admin_password === value.confirm_password, { message: 'The two passwords do not match.', path: ['confirm_password'] });

// First-run setup: creates the first company, its logo, the features it starts
// with, and its admin, who also becomes the owner of the app. Works only while
// no company exists, and only with the linked project's secret key.
export async function POST(request: Request): Promise<Response> {
  const input = await readJson(request, body);
  if (input.response) return input.response;
  const data = input.data;

  const state = await setupState();
  if (!state.connected) return fail(503, 'This install is not connected to Supabase yet.');
  if (!state.open) return fail(409, 'UniDock is already set up. Sign in instead.');
  if (!state.databaseReady) return fail(409, `The database is not ready yet (${state.applied} of ${state.total} updates applied).`);
  if (!(await ownsProject(data.key))) return fail(403, 'That key does not belong to the linked Supabase project.');
  const admin = createAdminClient();
  if (!admin) return fail(503, 'The Supabase secret key is not set on the server.');

  const off: OptionalSection[] = [];
  if (!data.features.kpi) off.push('/kpi');
  if (!data.features.invoices) off.push('invoices');
  if (!data.features.calendar) off.push('/calendar');

  const timezone = isTimeZone(data.timezone) ? data.timezone : 'UTC';
  const org = await admin
    .from('organizations')
    .insert({ name: data.company_name, timezone, settings: { hidden_sections: off.filter((item) => OPTIONAL_SECTIONS.includes(item)) } })
    .select('id')
    .single();
  if (org.error) return fromDbError(org.error);
  const orgId = org.data.id as string;

  // Two people finishing setup at the same moment: only the first company stays.
  const first = await admin.from('organizations').select('id').order('created_at', { ascending: true }).limit(1).maybeSingle();
  if ((first.data as { id?: string } | null)?.id !== orgId) {
    await admin.from('organizations').delete().eq('id', orgId);
    return fail(409, 'UniDock was just set up by someone else. Sign in instead.');
  }

  const undo = async (userId?: string) => {
    if (userId) await admin.auth.admin.deleteUser(userId);
    await admin.from('organizations').delete().eq('id', orgId);
  };

  const made = await admin.auth.admin.createUser({ email: data.admin_email, password: data.admin_password, email_confirm: true });
  if (made.error || !made.data.user) {
    await undo();
    return fail(400, made.error?.message ?? 'Your account could not be created.');
  }
  const userId = made.data.user.id;
  const profile = await admin
    .from('profiles')
    .insert({ id: userId, org_id: orgId, full_name: data.admin_name, access_role: 'admin', job_title: 'Admin' })
    .select('id')
    .single();
  if (profile.error) {
    await undo(userId);
    return fromDbError(profile.error);
  }
  const owner = await admin.from('platform_owners').insert({ profile_id: userId });
  if (owner.error) {
    await undo(userId);
    return fromDbError(owner.error);
  }

  // Best effort: the logo and the Admin role tag.
  if (data.logo_data) await admin.from('org_logos').insert({ org_id: orgId, data: data.logo_data });
  const role = await admin.from('roles').select('id').eq('org_id', orgId).eq('is_admin', true).limit(1).maybeSingle();
  if (role.data) await admin.from('profile_roles').insert({ org_id: orgId, profile_id: userId, role_id: (role.data as { id: string }).id });

  return ok({ company: data.company_name }, 201);
}

function isTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}
