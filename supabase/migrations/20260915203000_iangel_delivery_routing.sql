-- IANGEL delivery routing: radio, turno, self $50, cook_hold, PIN, chat, ratings, audit.
-- rider_active defaults TRUE. Never auto-inactivate from GPS/sleep/missing ping.

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (status = any (array[
  'awaiting_payment'::text,
  'pending'::text,
  'preparing'::text,
  'in_transit'::text,
  'delivered'::text,
  'delivered_unclaimed'::text,
  'cancelled'::text
]));

alter table public.orders add column if not exists dropoff_lat double precision;
alter table public.orders add column if not exists dropoff_lng double precision;
alter table public.orders add column if not exists rider_lat double precision;
alter table public.orders add column if not exists rider_lng double precision;
alter table public.orders add column if not exists delivery_provider text;
alter table public.orders add column if not exists uber_quote_id text;
alter table public.orders add column if not exists uber_quote_fee numeric(10,2);
alter table public.orders add column if not exists quote_expires_at timestamptz;
alter table public.orders add column if not exists self_fee numeric(10,2);
alter table public.orders add column if not exists cook_hold boolean not null default false;
alter table public.orders add column if not exists cook_hold_released_at timestamptz;
alter table public.orders add column if not exists rider_status text;
alter table public.orders add column if not exists customer_phone_alt text;
alter table public.orders add column if not exists leave_at_door boolean not null default false;
alter table public.orders add column if not exists dispatch_status text;
alter table public.orders add column if not exists incident_type text;
alter table public.orders add column if not exists incident_note text;
alter table public.orders add column if not exists wait_started_at timestamptz;
alter table public.orders add column if not exists wait_paused_at timestamptz;
alter table public.orders add column if not exists wait_pause_used boolean not null default false;
alter table public.orders add column if not exists pickup_pin text;
alter table public.orders add column if not exists short_code text;
alter table public.orders add column if not exists eta_minutes integer;
alter table public.orders add column if not exists gated_community boolean not null default false;
alter table public.orders add column if not exists n8n_payload jsonb;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'orders_delivery_provider_check') then
    alter table public.orders add constraint orders_delivery_provider_check
      check (delivery_provider is null or delivery_provider = any (array['pickup'::text, 'self'::text, 'uber'::text, 'wait_self'::text]));
  end if;
end $$;

create unique index if not exists orders_short_code_idx on public.orders (short_code) where short_code is not null;
create index if not exists orders_dispatch_status_idx on public.orders (dispatch_status);
create index if not exists orders_delivery_provider_idx on public.orders (delivery_provider);
create index if not exists orders_cook_hold_idx on public.orders (cook_hold) where cook_hold = true;

create table if not exists public.iangel_riders (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null default 'IANGEL',
  rider_active boolean not null default true,
  last_ping_at timestamptz,
  last_stale_push_at timestamptz,
  last_shift_warn_on date,
  lat double precision,
  lng double precision,
  push_subscription jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.iangel_riders (slug, display_name, rider_active)
values ('las-vaqueras', 'IANGEL', true)
on conflict (slug) do nothing;

alter table public.iangel_riders enable row level security;

create table if not exists public.order_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  actor text not null check (actor = any (array['customer'::text, 'rider'::text, 'system'::text])),
  kind text not null default 'text' check (kind = any (array['text'::text, 'quick'::text, 'system'::text])),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists order_messages_order_id_idx on public.order_messages (order_id, created_at);

alter table public.order_messages enable row level security;
alter table public.order_messages replica identity full;
do $$ begin
  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'order_messages'
  ) then
    alter publication supabase_realtime add table public.order_messages;
  end if;
end $$;

create table if not exists public.order_proofs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  kind text not null,
  image_path text,
  lat double precision,
  lng double precision,
  stamped_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.order_proofs enable row level security;

create table if not exists public.order_audit (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  actor text not null,
  action text not null,
  lat double precision,
  lng double precision,
  photo_path text,
  status text,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index if not exists order_audit_order_id_idx on public.order_audit (order_id, created_at);

alter table public.order_audit enable row level security;

create table if not exists public.order_ratings (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  direction text not null check (direction = any (array['customer_to_rider'::text, 'rider_to_customer'::text])),
  stars integer not null check (stars between 1 and 5),
  comment text,
  access_ok boolean,
  no_show boolean,
  created_at timestamptz not null default now(),
  unique (order_id, direction)
);

alter table public.order_ratings enable row level security;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  audience text not null check (audience = any (array['rider'::text, 'customer'::text])),
  customer_id uuid references public.customers(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists push_subscriptions_endpoint_idx on public.push_subscriptions (endpoint);

alter table public.push_subscriptions enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'delivery-proofs',
  'delivery-proofs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;
