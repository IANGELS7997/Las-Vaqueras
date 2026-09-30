-- Cobro en puerta y Uber Direct apagado hasta que Angel lo encienda.

alter table public.orders add column if not exists cash_door_collected_at timestamptz;

update public.iangel_riders
set uber_direct_enabled = false
where uber_direct_enabled is distinct from false;
