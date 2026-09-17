-- Provider SKU + product specs for customer orders

alter table customer_orders
  add column if not exists provider_sku text,
  add column if not exists gold_color text,
  add column if not exists diamond_shape text,
  add column if not exists gemstone_type text,
  add column if not exists size text;
