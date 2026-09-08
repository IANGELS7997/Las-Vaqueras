alter table public.orders add column if not exists uber_delivery_id text;
alter table public.orders add column if not exists uber_status text;
alter table public.orders add column if not exists uber_tracking_url text;

create index if not exists orders_uber_delivery_id_idx on public.orders (uber_delivery_id);
