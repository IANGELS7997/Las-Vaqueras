-- Votos separados de cocina y admin para el crédito de pedido incompleto.
alter table public.rider_help_reports add column if not exists kitchen_refund text;
alter table public.rider_help_reports add column if not exists admin_refund text;
alter table public.rider_help_reports add column if not exists refund_note text;
alter table public.rider_help_reports add column if not exists refund_credit_mxn integer;
