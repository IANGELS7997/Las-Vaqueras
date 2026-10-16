alter table public.kitchen_station
  add column if not exists admin_enabled boolean not null default true;

alter table public.kitchen_station
  add column if not exists session_generation integer not null default 0;
