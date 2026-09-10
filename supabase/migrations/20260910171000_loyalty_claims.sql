alter table public.customers add column if not exists phone_verified_at timestamptz;

alter table public.orders add column if not exists profile_login_token text;
alter table public.orders add column if not exists card_fingerprint text;
alter table public.orders add column if not exists loyalty_kind text;

create table if not exists public.loyalty_claims (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  customer_id uuid references public.customers(id),
  phone text,
  email text,
  card_fingerprint text,
  ip text,
  address_key text,
  order_id uuid references public.orders(id),
  created_at timestamptz not null default now()
);

create index if not exists loyalty_claims_kind_phone_idx on public.loyalty_claims (kind, phone);
create index if not exists loyalty_claims_kind_email_idx on public.loyalty_claims (kind, email);
create index if not exists loyalty_claims_kind_card_idx on public.loyalty_claims (kind, card_fingerprint);
create index if not exists loyalty_claims_kind_ip_idx on public.loyalty_claims (kind, ip);
create index if not exists loyalty_claims_kind_address_idx on public.loyalty_claims (kind, address_key);

alter table public.loyalty_claims enable row level security;
