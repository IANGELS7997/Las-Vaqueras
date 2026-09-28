-- Cada celular de rider guarda su conexión aparte. El pedido se marca cuando alguien lo acepta.

create table if not exists public.iangel_rider_presence (
  rider_key text primary key,
  display_name text not null default '',
  rider_active boolean not null default false,
  last_ping_at timestamptz,
  push_subscription jsonb,
  lat double precision,
  lng double precision,
  updated_at timestamptz not null default now()
);

alter table public.orders add column if not exists iangel_rider_key text;

create index if not exists orders_iangel_rider_key_idx on public.orders (iangel_rider_key);
