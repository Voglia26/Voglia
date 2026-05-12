-- Add customization columns to purchase_order_items
alter table purchase_order_items
  add column if not exists size text,
  add column if not exists gold_color text,
  add column if not exists gemstone text,
  add column if not exists other_comments text;
