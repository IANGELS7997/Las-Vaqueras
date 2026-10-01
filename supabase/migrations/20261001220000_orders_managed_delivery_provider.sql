-- «Gestionar pedido» guarda delivery_provider = managed.
-- La regla anterior solo dejaba pickup, self, uber y wait_self.

alter table public.orders drop constraint if exists orders_delivery_provider_check;

alter table public.orders
  add constraint orders_delivery_provider_check
  check (
    delivery_provider is null
    or delivery_provider in ('pickup', 'self', 'uber', 'wait_self', 'managed')
  );
