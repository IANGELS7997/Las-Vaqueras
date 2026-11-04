-- Hora en que cocina pulsó Aceptar pedido. Vacío mientras no lo pulsa.
alter table public.orders
  add column if not exists kitchen_accepted_at timestamptz;
