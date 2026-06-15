-- Quote variants per item (e.g. different stone options)

create table item_variants (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  label text not null,
  description text,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index item_variants_item_idx on item_variants(item_id);

-- One default variant per existing item
insert into item_variants (item_id, label, position)
select id, 'Standard', 0 from items;

alter table quotes add column variant_id uuid references item_variants(id);

update quotes q
set variant_id = iv.id
from item_assignments ia
join item_variants iv on iv.item_id = ia.item_id and iv.position = 0
where q.item_assignment_id = ia.id;

alter table quotes alter column variant_id set not null;

alter table quotes drop constraint if exists quotes_item_assignment_id_key;
create unique index quotes_assignment_variant_uidx
  on quotes(item_assignment_id, variant_id);

alter table purchase_order_items
  drop constraint if exists purchase_order_items_purchase_order_id_item_id_key;

create unique index purchase_order_items_po_quote_uidx
  on purchase_order_items(purchase_order_id, quote_id);

alter table item_variants disable row level security;
