create unique index if not exists loyalty_claims_order_id_uidx
  on public.loyalty_claims (order_id)
  where order_id is not null;
