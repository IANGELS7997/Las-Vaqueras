alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (status = any (array['awaiting_payment'::text, 'pending'::text, 'preparing'::text, 'in_transit'::text, 'delivered'::text, 'cancelled'::text]));
