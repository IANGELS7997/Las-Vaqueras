alter table public.orders add column if not exists fulfillment_type text not null default 'delivery';
alter table public.orders add column if not exists pickup_at timestamptz;
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_fulfillment_type_check'
  ) then
    alter table public.orders add constraint orders_fulfillment_type_check check (fulfillment_type = any (array['delivery'::text, 'pickup'::text]));
  end if;
end $$;
