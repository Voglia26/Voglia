-- Shipments tracking (auto-created from POs + manual/import)

create type shipment_status as enum (
  'ordered',
  'in_transit',
  'in_customs',
  'received'
);

create type shipment_source as enum (
  'purchase_order',
  'manual',
  'import'
);

create table shipments (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid references purchase_orders(id) on delete set null,
  factory_id uuid not null references factories(id),
  status shipment_status not null default 'ordered',
  order_date date not null default current_date,
  expected_arrival_date date,
  received_at timestamptz,
  archived_at timestamptz,
  source shipment_source not null default 'purchase_order',
  attachment_url text,
  attachment_name text,
  notes text,
  created_at timestamptz not null default now()
);

create index shipments_factory_id_idx on shipments (factory_id);
create index shipments_purchase_order_id_idx on shipments (purchase_order_id);
create index shipments_archived_at_idx on shipments (archived_at);
create index shipments_status_idx on shipments (status);

create table shipment_items (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references shipments(id) on delete cascade,
  purchase_order_item_id uuid references purchase_order_items(id) on delete set null,
  name text,
  sku text,
  photo_url text,
  quantity int not null check (quantity > 0),
  position int not null default 0
);

create index shipment_items_shipment_id_idx on shipment_items (shipment_id);

-- Create a public `shipments` bucket in Supabase Storage for PDF/Excel uploads (Dashboard → Storage → New bucket, public optional).
