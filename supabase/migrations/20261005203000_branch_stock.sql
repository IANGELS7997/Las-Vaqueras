-- Agotado por sucursal. Una fila significa que ese producto, salsa o extra no se puede pedir.

create table if not exists public.branch_stock (
  branch_id text not null,
  item_id text not null,
  updated_at timestamptz not null default now(),
  primary key (branch_id, item_id),
  constraint branch_stock_branch_check check (branch_id in ('centro', 'norte', 'sur'))
);

alter table public.branch_stock enable row level security;

revoke all on table public.branch_stock from anon, authenticated;
