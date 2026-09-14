-- App users for admin + seller login (session-based auth; not Supabase Auth)

create type app_user_role as enum ('admin', 'seller');

create table app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  password_hash text not null,
  display_name text not null,
  role app_user_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint app_users_username_key unique (username)
);

create index app_users_role_idx on app_users (role);
create index app_users_active_idx on app_users (active);

alter table app_users disable row level security;
