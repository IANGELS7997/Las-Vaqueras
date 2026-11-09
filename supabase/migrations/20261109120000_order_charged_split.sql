alter table orders
  add column if not exists stripe_fee numeric(10,2),
  add column if not exists cash_fee_collected numeric(10,2) not null default 0;
