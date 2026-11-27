-- Ready-made rewards: reasons for giving points, each with a default number of
-- points (for example "Client onboarded: 200"). Give points offers them and
-- fills in the amount, which can still be changed for one award. Admins manage
-- the list under Employees & Rewards → Rules, next to the target, the points per
-- attendance day and the default task points (point_settings).

create table public.point_rewards (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  points integer not null check (points > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);
create index point_rewards_org_idx on public.point_rewards (org_id);

grant select, insert, update, delete on public.point_rewards to authenticated;
revoke all on public.point_rewards from anon;
alter table public.point_rewards enable row level security;
create policy admin_all on public.point_rewards for all to authenticated
  using (org_id = public.current_org_id() and public.is_admin())
  with check (org_id = public.current_org_id() and public.is_admin());
create policy member_read on public.point_rewards for select to authenticated
  using (org_id = public.current_org_id());

create trigger point_rewards_log_delete after delete on public.point_rewards
  for each row execute function public.log_delete();
create trigger point_rewards_bump_activity after insert or update or delete on public.point_rewards
  for each row execute function public.bump_activity();

-- Every company starts with the same few rewards, which it can change or remove.
create function public.create_point_rewards() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.point_rewards (org_id, name, points) values
    (new.id, 'Extra time', 50),
    (new.id, 'Client onboarded', 200),
    (new.id, 'Good client feedback', 100),
    (new.id, 'Finished ahead of deadline', 100),
    (new.id, 'Helped a teammate', 50)
  on conflict do nothing;
  return new;
end $$;

create trigger organizations_create_point_rewards
after insert on public.organizations
for each row execute function public.create_point_rewards();

insert into public.point_rewards (org_id, name, points)
select o.id, r.name, r.points
from public.organizations o
cross join (values
  ('Extra time', 50),
  ('Client onboarded', 200),
  ('Good client feedback', 100),
  ('Finished ahead of deadline', 100),
  ('Helped a teammate', 50)
) as r(name, points)
on conflict do nothing;
