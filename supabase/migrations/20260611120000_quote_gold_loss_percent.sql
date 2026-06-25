-- Gold loss as fixed amount or percentage of total gold cost
alter table quotes add column if not exists gold_loss_percent numeric;
