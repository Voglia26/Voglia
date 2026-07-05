-- Tracks when the current open round started (create, send, or reopen).
-- POs with created_at >= opened_at belong to this round for Compare / close logic.
alter table quotations
  add column if not exists opened_at timestamptz not null default now();

update quotations
set opened_at = created_at;
