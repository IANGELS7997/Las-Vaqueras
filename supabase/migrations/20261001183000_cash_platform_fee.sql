-- Comisión de plataforma en pedidos de efectivo. Se cobra en un pago con tarjeta posterior.

alter table public.orders
  add column if not exists cash_platform_fee_centavos integer not null default 0;

alter table public.orders
  add column if not exists cash_platform_locked_centavos integer not null default 0;

alter table public.orders drop constraint if exists orders_cash_platform_locked_lte_fee;

alter table public.orders
  add constraint orders_cash_platform_locked_lte_fee
  check (
    cash_platform_locked_centavos >= 0
    and cash_platform_locked_centavos <= cash_platform_fee_centavos
  );

create table if not exists public.cash_platform_collections (
  id uuid primary key default gen_random_uuid(),
  cash_order_id uuid not null references public.orders(id),
  payment_intent_id text not null,
  amount_centavos integer not null check (amount_centavos > 0),
  status text not null check (status = any (array['reserved'::text, 'settled'::text, 'released'::text])),
  created_at timestamptz not null default now()
);

create index if not exists cash_platform_collections_order_idx
  on public.cash_platform_collections (cash_order_id);

create index if not exists cash_platform_collections_pi_idx
  on public.cash_platform_collections (payment_intent_id);

alter table public.cash_platform_collections enable row level security;
