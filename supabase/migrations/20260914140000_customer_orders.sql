-- Customer orders (seller-created orders for end customers)

create type customer_order_status as enum (
  'ordered',
  'in_transit',
  'arrived_panama',
  'delivered',
  'cancelled'
);

create table customer_orders (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references app_users(id) on delete restrict,
  product_name text not null,
  notes text,
  photo_url text,
  customer_name text not null,
  ordered_at date not null default current_date,
  lightspeed_sku text,
  factory_id uuid not null references factories(id) on delete restrict,
  due_date date,
  is_urgent boolean not null default false,
  is_restock boolean not null default false,
  status customer_order_status not null default 'ordered',
  arrived_panama_at date,
  delivered_at date,
  -- Set in Stage 3 when admin generates a customer PO; locks product/factory/sku edits
  customer_purchase_order_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customer_orders_seller_idx on customer_orders (seller_id);
create index customer_orders_factory_idx on customer_orders (factory_id);
create index customer_orders_status_idx on customer_orders (status);
create index customer_orders_ordered_at_idx on customer_orders (ordered_at desc);
create index customer_orders_urgent_idx on customer_orders (is_urgent) where is_urgent = true;
create index customer_orders_restock_idx on customer_orders (is_restock) where is_restock = true;

alter table customer_orders disable row level security;
