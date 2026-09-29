-- Efectivo IANGEL. Los pedidos viejos quedan en null. El efectivo no tiene PaymentIntent.

alter table public.orders alter column stripe_payment_intent_id drop not null;

alter table public.orders add column if not exists pay_method text;
alter table public.orders drop constraint if exists orders_pay_method_check;
alter table public.orders add constraint orders_pay_method_check
  check (pay_method is null or pay_method = any (array['card'::text, 'cash'::text]));

alter table public.orders add column if not exists cash_food_due numeric;
alter table public.orders add column if not exists rider_paid_cash boolean;
alter table public.orders add column if not exists kitchen_received_cash boolean;
