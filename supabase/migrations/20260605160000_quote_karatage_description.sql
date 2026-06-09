-- Supplier quote: karatage + product description
alter table quotes
  add column if not exists karatage text,
  add column if not exists product_description text;
