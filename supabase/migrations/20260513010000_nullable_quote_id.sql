-- Allow purchase_order_items.quote_id to be null
-- (so admins can award to factories that negotiated outside the system)
alter table purchase_order_items
  alter column quote_id drop not null;
