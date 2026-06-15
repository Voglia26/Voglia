-- Factory-owned variants (20260607120000)
-- Paste and run the whole script in Supabase SQL Editor.
-- No temp tables. Safe to re-run.

begin;

-- 1) Add assignment column
alter table item_variants
  add column if not exists item_assignment_id uuid references item_assignments(id) on delete cascade;

-- 2) Allow rows without item_id while we transition
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'item_variants'
      and column_name = 'item_id'
      and is_nullable = 'NO'
  ) then
    alter table item_variants alter column item_id drop not null;
  end if;
end $$;

-- 3) For each quote still on an item-level variant: create assignment-level copy + repoint quote
do $$
declare
  r record;
  new_id uuid;
begin
  for r in
    select
      q.id as quote_id,
      q.item_assignment_id,
      iv.label,
      iv.description,
      iv.position
    from quotes q
    inner join item_variants iv on iv.id = q.variant_id
    where iv.item_assignment_id is null
  loop
    new_id := gen_random_uuid();
    insert into item_variants (id, item_assignment_id, label, description, position)
    values (new_id, r.item_assignment_id, r.label, r.description, r.position);
    update quotes set variant_id = new_id where id = r.quote_id;
  end loop;
end $$;

-- 4) Remove leftover item-level rows (e.g. auto-created "Standard" variants)
delete from item_variants where item_assignment_id is null;

-- 5) Drop legacy item_id column
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'item_variants'
      and column_name = 'item_id'
  ) then
    alter table item_variants drop column item_id;
  end if;
end $$;

drop index if exists item_variants_item_idx;

-- 6) Require assignment ownership (empty table is fine)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'item_variants'
      and column_name = 'item_assignment_id'
      and is_nullable = 'YES'
  ) then
    alter table item_variants alter column item_assignment_id set not null;
  end if;
end $$;

create index if not exists item_variants_assignment_idx
  on item_variants(item_assignment_id);

-- 7) Cascade delete variant -> quote
alter table quotes drop constraint if exists quotes_variant_id_fkey;
alter table quotes
  add constraint quotes_variant_id_fkey
  foreign key (variant_id) references item_variants(id) on delete cascade;

commit;
