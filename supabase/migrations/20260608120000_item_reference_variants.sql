-- Admin reference variants (item_id) coexist with factory quote variants (item_assignment_id).

alter table item_variants
  add column if not exists item_id uuid references items(id) on delete cascade;

alter table item_variants
  alter column item_assignment_id drop not null;

alter table item_variants
  drop constraint if exists item_variants_scope_check;

alter table item_variants
  add constraint item_variants_scope_check check (
    (item_id is not null and item_assignment_id is null)
    or (item_id is null and item_assignment_id is not null)
  );

create index if not exists item_variants_item_ref_idx
  on item_variants(item_id)
  where item_id is not null;
