-- Optional admin instructions per PO line, copied to shipment items.

alter table purchase_order_items
  add column if not exists notes text;

alter table shipment_items
  add column if not exists notes text;
