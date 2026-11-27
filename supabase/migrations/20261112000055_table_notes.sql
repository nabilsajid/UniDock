-- Descriptions for tables people look at in the Supabase dashboard. Changes no data.
comment on table public.point_settings is 'Each company''s point rules: monthly target, points per verified office day, default task points and the bonus step.';
comment on table public.point_rewards is 'Ready-made reasons for giving points, with default amounts (Employees & Rewards → Point rules).';
comment on table public.violation_types is 'Ready-made deductions for responsibility violations.';
comment on table public.backups is 'Weekly in-app backups of a company''s records, kept for eight weeks. Separate from the pre-update snapshots in Storage (bucket unidock-snapshots).';
