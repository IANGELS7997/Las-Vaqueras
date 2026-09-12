alter table public.loyalty_rewards add column if not exists code text;

create unique index if not exists loyalty_rewards_code_uidx
  on public.loyalty_rewards (code)
  where code is not null;
