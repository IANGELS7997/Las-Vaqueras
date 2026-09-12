create table if not exists public.loyalty_rewards (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  kind text not null default 'tenth_jumbo',
  status text not null default 'available',
  code_hash text,
  earned_order_id uuid references public.orders(id),
  redeemed_order_id uuid references public.orders(id),
  reserved_payment_intent_id text,
  reserved_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists loyalty_rewards_one_available_uidx
  on public.loyalty_rewards (customer_id, kind)
  where status in ('available', 'reserved');

create unique index if not exists loyalty_rewards_redeemed_order_uidx
  on public.loyalty_rewards (redeemed_order_id)
  where redeemed_order_id is not null;

create index if not exists loyalty_rewards_customer_status_idx
  on public.loyalty_rewards (customer_id, status);

alter table public.loyalty_rewards enable row level security;
