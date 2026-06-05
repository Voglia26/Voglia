-- Voglia schema: quotations and purchase orders

create extension if not exists "pgcrypto";

create table factories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  notes text,
  created_at timestamptz not null default now()
);

create type quotation_status as enum ('draft', 'sent', 'closed');

create table quotations (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status quotation_status not null default 'draft',
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references quotations(id) on delete cascade,
  name text,
  sku text,
  description text,
  specs jsonb,
  photo_url text,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index items_quotation_idx on items(quotation_id);

create table quotation_factories (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references quotations(id) on delete cascade,
  factory_id uuid not null references factories(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (quotation_id, factory_id)
);
create index quotation_factories_quotation_idx on quotation_factories(quotation_id);

create table item_assignments (
  id uuid primary key default gen_random_uuid(),
  quotation_factory_id uuid not null references quotation_factories(id) on delete cascade,
  item_id uuid not null references items(id) on delete cascade,
  unique (quotation_factory_id, item_id)
);
create index item_assignments_qf_idx on item_assignments(quotation_factory_id);
create index item_assignments_item_idx on item_assignments(item_id);

create table quotes (
  id uuid primary key default gen_random_uuid(),
  item_assignment_id uuid not null unique references item_assignments(id) on delete cascade,
  gold_loss numeric,
  total_gold_cost numeric,
  diamond_cost numeric,
  cost_per_carat numeric,
  labor numeric,
  other_fees numeric,
  notes text,
  submitted_at timestamptz not null default now()
);

create type purchase_order_status as enum ('pending', 'received');

create table purchase_orders (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references quotations(id) on delete cascade,
  factory_id uuid not null references factories(id) on delete restrict,
  token uuid not null unique default gen_random_uuid(),
  status purchase_order_status not null default 'pending',
  created_at timestamptz not null default now(),
  received_at timestamptz
);
create index purchase_orders_quotation_idx on purchase_orders(quotation_id);

create table purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references purchase_orders(id) on delete cascade,
  item_id uuid not null references items(id) on delete restrict,
  quote_id uuid not null references quotes(id) on delete restrict,
  quantity int not null check (quantity > 0),
  unique (purchase_order_id, item_id)
);

-- RLS is intentionally disabled: this app only uses the service_role key from server routes.
alter table factories disable row level security;
alter table quotations disable row level security;
alter table items disable row level security;
alter table quotation_factories disable row level security;
alter table item_assignments disable row level security;
alter table quotes disable row level security;
alter table purchase_orders disable row level security;
alter table purchase_order_items disable row level security;
