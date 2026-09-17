-- Customer order statuses v2 + nullable factory + custom statuses

-- 1) Custom reusable statuses (admin-managed)
create table if not exists customer_order_custom_statuses (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint customer_order_custom_statuses_label_key unique (label)
);

create index if not exists customer_order_custom_statuses_active_idx
  on customer_order_custom_statuses (active);

alter table customer_order_custom_statuses disable row level security;

-- 2) Link optional custom status on orders
alter table customer_orders
  add column if not exists custom_status_id uuid
    references customer_order_custom_statuses(id) on delete set null;

create index if not exists customer_orders_custom_status_idx
  on customer_orders (custom_status_id);

-- 3) Factory assigned by admin (nullable until set)
alter table customer_orders
  alter column factory_id drop not null;

-- 4) Replace status enum: pending_order | ordered | delivered | cancelled
--    Map in_transit / arrived_panama → ordered
alter table customer_orders alter column status drop default;

alter table customer_orders
  alter column status type text
  using (
    case status::text
      when 'in_transit' then 'ordered'
      when 'arrived_panama' then 'ordered'
      when 'delivered' then 'delivered'
      when 'cancelled' then 'cancelled'
      when 'ordered' then 'ordered'
      else 'ordered'
    end
  );

drop type if exists customer_order_status;

create type customer_order_status as enum (
  'pending_order',
  'ordered',
  'delivered',
  'cancelled'
);

alter table customer_orders
  alter column status type customer_order_status
  using status::customer_order_status;

alter table customer_orders
  alter column status set default 'pending_order'::customer_order_status;
