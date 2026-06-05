-- Supplier inventory: catalog per factory with price history

create table inventory_products (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid not null references factories(id) on delete cascade,
  sku text not null,
  name text,
  description text,
  specs jsonb,
  photo_urls text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (factory_id, sku)
);
create index inventory_products_factory_idx on inventory_products(factory_id);

create table inventory_price_entries (
  id uuid primary key default gen_random_uuid(),
  inventory_product_id uuid not null references inventory_products(id) on delete cascade,
  quotation_id uuid not null references quotations(id) on delete cascade,
  purchase_order_id uuid not null references purchase_orders(id) on delete cascade,
  unit_price numeric not null,
  quantity int not null check (quantity > 0),
  quote_snapshot jsonb not null default '{}',
  ordered_at timestamptz not null default now(),
  unique (purchase_order_id, inventory_product_id)
);
create index inventory_price_entries_product_idx on inventory_price_entries(inventory_product_id);

alter table inventory_products disable row level security;
alter table inventory_price_entries disable row level security;
