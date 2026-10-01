alter table public.orders
  add column if not exists branch_id text not null default 'centro';

alter table public.orders
  drop constraint if exists orders_branch_id_check;

alter table public.orders
  add constraint orders_branch_id_check
  check (branch_id in ('centro', 'norte', 'sur'));

create index if not exists orders_branch_created_idx
  on public.orders (branch_id, created_at desc);

insert into public.kitchen_station (id)
values ('norte'), ('sur')
on conflict (id) do nothing;
