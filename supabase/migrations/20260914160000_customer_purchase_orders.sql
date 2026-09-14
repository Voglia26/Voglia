-- Customer purchase orders (separate from quotation POs)

create table customer_purchase_orders (
  id uuid primary key default gen_random_uuid(),
  customer_order_id uuid not null unique references customer_orders(id) on delete restrict,
  factory_id uuid not null references factories(id) on delete restrict,
  token uuid not null unique default gen_random_uuid(),
  quantity int not null default 1 check (quantity > 0),
  created_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index customer_purchase_orders_factory_idx on customer_purchase_orders (factory_id);
create index customer_purchase_orders_token_idx on customer_purchase_orders (token);

alter table customer_orders
  drop constraint if exists customer_orders_customer_purchase_order_id_fkey;

alter table customer_orders
  add constraint customer_orders_customer_purchase_order_id_fkey
  foreign key (customer_purchase_order_id)
  references customer_purchase_orders(id)
  on delete set null;

alter table customer_purchase_orders disable row level security;
