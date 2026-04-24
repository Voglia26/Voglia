-- Voglia seed data
-- Generated 2026-04-24T20:20:31.913Z
-- Idempotent: uses ON CONFLICT DO NOTHING. Safe to re-run.

begin;

-- factories: 8 rows
insert into factories (id, name, notes, created_at) values ('d23c1e3f-bb35-46fe-8941-a707a8b26918', 'RINGO', NULL, '2026-04-24T19:37:49.286723+00:00') on conflict (id) do nothing;
insert into factories (id, name, notes, created_at) values ('5513897d-ee38-45c2-81c8-febad5b5a205', 'YIN', NULL, '2026-04-24T19:37:53.16356+00:00') on conflict (id) do nothing;
insert into factories (id, name, notes, created_at) values ('8c813272-bcf0-4c52-8545-0da3f0732b90', 'MERCERY', NULL, '2026-04-24T20:10:10.417998+00:00') on conflict (id) do nothing;
insert into factories (id, name, notes, created_at) values ('dea36dc7-78d8-431b-b19d-048cae562a4f', 'AMON', NULL, '2026-04-24T20:10:16.357391+00:00') on conflict (id) do nothing;
insert into factories (id, name, notes, created_at) values ('5eb9e1de-8ad0-48c4-8293-a46dccb73e6b', 'EZAH INDIA', NULL, '2026-04-24T20:12:26.822422+00:00') on conflict (id) do nothing;
insert into factories (id, name, notes, created_at) values ('3b8822fe-ab2e-4b0f-a89f-75441d48e85c', 'NIRAJ', NULL, '2026-04-24T20:12:30.773294+00:00') on conflict (id) do nothing;
insert into factories (id, name, notes, created_at) values ('0b435a25-c49a-4258-92f4-6370b7e97a2c', 'SHAINAL', NULL, '2026-04-24T20:12:41.484272+00:00') on conflict (id) do nothing;
insert into factories (id, name, notes, created_at) values ('55d565e1-ab1a-4d25-9a5e-1292f725b817', 'TANYA', NULL, '2026-04-24T20:13:05.218477+00:00') on conflict (id) do nothing;

-- quotations: 2 rows
insert into quotations (id, title, status, created_at, closed_at) values ('529b4658-9a79-4807-bd7a-2a09c2ed5510', 'test', 'closed', '2026-04-24T19:35:21.281581+00:00', '2026-04-24T19:43:03.648+00:00') on conflict (id) do nothing;
insert into quotations (id, title, status, created_at, closed_at) values ('d855a952-eccb-42a6-aba9-74ba7fa49176', 'Quote Abril 2026', 'draft', '2026-04-24T20:08:19.532299+00:00', NULL) on conflict (id) do nothing;

-- items: 3 rows
insert into items (id, quotation_id, name, sku, description, specs, photo_url, position, created_at) values ('5b9e3fb8-87a8-423b-a112-3f6b6e84c738', '529b4658-9a79-4807-bd7a-2a09c2ed5510', 'Hola', NULL, NULL, NULL, NULL, 0, '2026-04-24T19:37:33.975589+00:00') on conflict (id) do nothing;
insert into items (id, quotation_id, name, sku, description, specs, photo_url, position, created_at) values ('b4fae920-adc0-4294-a2ac-6929e9cdedc9', '529b4658-9a79-4807-bd7a-2a09c2ed5510', 'Item 2', NULL, NULL, NULL, NULL, 0, '2026-04-24T19:38:04.195503+00:00') on conflict (id) do nothing;
insert into items (id, quotation_id, name, sku, description, specs, photo_url, position, created_at) values ('a15cfcb7-5e9a-40ea-ab40-c9a30765ad52', 'd855a952-eccb-42a6-aba9-74ba7fa49176', 'Gold Stripped Necklace', NULL, NULL, '{"carats":3.2,"weight_g":16,"gold_type":null,"stone_type":"Natural Diamond"}'::jsonb, 'https://qcpxawihlouhprlljfyc.supabase.co/storage/v1/object/public/items/1f062be7-7a6c-4661-baed-ef1377027b3e.webp', 0, '2026-04-24T20:09:45.601498+00:00') on conflict (id) do nothing;

-- quotation_factories: 3 rows
insert into quotation_factories (id, quotation_id, factory_id, token, accepted_at, created_at) values ('c15fc5a2-33c6-4d95-bb6a-814b6d57429c', '529b4658-9a79-4807-bd7a-2a09c2ed5510', '5513897d-ee38-45c2-81c8-febad5b5a205', '17d47d78-1585-4240-b17b-7ecaf17d3257', NULL, '2026-04-24T19:39:33.038283+00:00') on conflict (id) do nothing;
insert into quotation_factories (id, quotation_id, factory_id, token, accepted_at, created_at) values ('d85b035e-b817-486f-b9ed-8ab5b0f85df3', '529b4658-9a79-4807-bd7a-2a09c2ed5510', 'd23c1e3f-bb35-46fe-8941-a707a8b26918', '46782221-7292-4901-9963-df29ef47b6ca', '2026-04-24T19:41:04.2+00:00', '2026-04-24T19:39:26.39344+00:00') on conflict (id) do nothing;
insert into quotation_factories (id, quotation_id, factory_id, token, accepted_at, created_at) values ('7bf8ff87-7658-4412-b994-06344468ccd0', 'd855a952-eccb-42a6-aba9-74ba7fa49176', '55d565e1-ab1a-4d25-9a5e-1292f725b817', '6820fc65-2f7a-40b3-b0db-b4bac0f90cf7', '2026-04-24T20:18:23.263+00:00', '2026-04-24T20:13:15.078332+00:00') on conflict (id) do nothing;

-- item_assignments: 4 rows
insert into item_assignments (id, quotation_factory_id, item_id) values ('f1d31945-56f8-4895-ba4d-18183e9f9ebe', 'd85b035e-b817-486f-b9ed-8ab5b0f85df3', '5b9e3fb8-87a8-423b-a112-3f6b6e84c738') on conflict (id) do nothing;
insert into item_assignments (id, quotation_factory_id, item_id) values ('5159de0a-b6df-49de-b783-de8dd3be51f8', 'd85b035e-b817-486f-b9ed-8ab5b0f85df3', 'b4fae920-adc0-4294-a2ac-6929e9cdedc9') on conflict (id) do nothing;
insert into item_assignments (id, quotation_factory_id, item_id) values ('0bdbf71e-bb1c-4f2b-b4fc-5e61cf6be2b0', 'c15fc5a2-33c6-4d95-bb6a-814b6d57429c', 'b4fae920-adc0-4294-a2ac-6929e9cdedc9') on conflict (id) do nothing;
insert into item_assignments (id, quotation_factory_id, item_id) values ('fc49421c-6697-4d52-98e0-df45f7b87bae', '7bf8ff87-7658-4412-b994-06344468ccd0', 'a15cfcb7-5e9a-40ea-ab40-c9a30765ad52') on conflict (id) do nothing;

-- quotes: 2 rows
insert into quotes (id, item_assignment_id, gold_loss, total_gold_cost, diamond_cost, cost_per_carat, labor, other_fees, notes, submitted_at, declined, final_price) values ('44756bb1-751e-498b-891f-7d34e8a5d8f6', 'f1d31945-56f8-4895-ba4d-18183e9f9ebe', 12, 76, NULL, NULL, NULL, NULL, NULL, '2026-04-24T19:41:04.145792+00:00', FALSE, NULL) on conflict (id) do nothing;
insert into quotes (id, item_assignment_id, gold_loss, total_gold_cost, diamond_cost, cost_per_carat, labor, other_fees, notes, submitted_at, declined, final_price) values ('f6fff668-7111-45e5-8559-64afebd1bb1e', 'fc49421c-6697-4d52-98e0-df45f7b87bae', 12, 549, 690, 75, 56, 320, '6 weeks', '2026-04-24T20:18:23.213794+00:00', FALSE, NULL) on conflict (id) do nothing;

-- purchase_orders: 1 row
insert into purchase_orders (id, quotation_id, factory_id, token, status, created_at, received_at, approved_at, in_progress_at, sent_at) values ('b0677e45-78a9-4908-9e61-6555a6c9cb8c', '529b4658-9a79-4807-bd7a-2a09c2ed5510', 'd23c1e3f-bb35-46fe-8941-a707a8b26918', '5172ec93-acc3-4daf-a607-25e3665e7b05', 'in_progress', '2026-04-24T19:43:03.403064+00:00', NULL, '2026-04-24T20:06:34.119+00:00', '2026-04-24T20:06:36.956+00:00', NULL) on conflict (id) do nothing;

-- purchase_order_items: 1 row
insert into purchase_order_items (id, purchase_order_id, item_id, quote_id, quantity) values ('801a8ddb-963c-4bf0-8e40-dc5c1de31c8e', 'b0677e45-78a9-4908-9e61-6555a6c9cb8c', '5b9e3fb8-87a8-423b-a112-3f6b6e84c738', '44756bb1-751e-498b-891f-7d34e8a5d8f6', 3) on conflict (id) do nothing;

commit;
