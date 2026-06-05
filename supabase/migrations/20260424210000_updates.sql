-- Add declined flag + final_price to quotes
alter table quotes
  add column if not exists declined boolean not null default false,
  add column if not exists final_price numeric;

-- Extend purchase order status with full workflow
alter type purchase_order_status rename to purchase_order_status_old;
create type purchase_order_status as enum (
  'pending', 'approved', 'in_progress', 'sent', 'received'
);
alter table purchase_orders
  alter column status drop default;
alter table purchase_orders
  alter column status type purchase_order_status
  using (
    case status::text
      when 'received' then 'received'::purchase_order_status
      else 'pending'::purchase_order_status
    end
  );
alter table purchase_orders
  alter column status set default 'pending';
drop type purchase_order_status_old;

-- Optional: per-status timestamps for auditing
alter table purchase_orders
  add column if not exists approved_at timestamptz,
  add column if not exists in_progress_at timestamptz,
  add column if not exists sent_at timestamptz;

-- Storage policy: let anon role upload to `items` bucket (photos for quotations).
-- Reads already work because the bucket is public.
drop policy if exists "items_insert_anon" on storage.objects;
create policy "items_insert_anon"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'items');

drop policy if exists "items_update_anon" on storage.objects;
create policy "items_update_anon"
  on storage.objects for update
  to anon
  using (bucket_id = 'items')
  with check (bucket_id = 'items');
