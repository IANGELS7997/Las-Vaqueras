create table if not exists public.kitchen_station (
  id text primary key default 'main',
  shift_active boolean not null default false,
  auto_print boolean not null default false,
  last_seen_at timestamptz,
  last_print_at timestamptz,
  closed_at timestamptz,
  offline_alert_sent_at timestamptz,
  order_alert_sent_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.kitchen_station (id)
values ('main')
on conflict (id) do nothing;

alter table public.kitchen_station enable row level security;
