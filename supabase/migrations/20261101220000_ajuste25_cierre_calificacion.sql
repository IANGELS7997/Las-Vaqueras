create table if not exists public.public_closure (
  id text primary key,
  closed boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.public_closure (id, closed)
values ('store', false)
on conflict (id) do nothing;

alter table public.public_closure enable row level security;

alter table public.orders
  add column if not exists delivered_at timestamptz,
  add column if not exists experience_email_at timestamptz,
  add column if not exists prep_delay_minutes integer,
  add column if not exists handoff_pin text;

create table if not exists public.order_experience_ratings (
  order_id uuid primary key references public.orders (id) on delete cascade,
  stars integer not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

alter table public.order_experience_ratings enable row level security;
