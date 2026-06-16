-- Total carats for diamond cost calculation (cost per carat × total carats)

alter table quotes add column if not exists total_carats numeric;
