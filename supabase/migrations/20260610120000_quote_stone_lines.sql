-- Multiple stone types per quote (label + cost per carat × total carats each)
alter table quotes add column if not exists stone_lines jsonb not null default '[]'::jsonb;
