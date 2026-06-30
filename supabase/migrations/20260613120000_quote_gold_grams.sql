-- Gold weight and gold loss in grams (quoted by factory, for compare)
alter table quotes add column if not exists gold_weight_g numeric;
alter table quotes add column if not exists gold_loss_g numeric;
