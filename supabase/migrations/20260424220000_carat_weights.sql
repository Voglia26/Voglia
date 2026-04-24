alter table quotes
  add column if not exists gemstone_carat_weight text,
  add column if not exists custom_carat_weight text;
