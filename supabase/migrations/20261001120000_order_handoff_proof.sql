alter table public.orders add column if not exists pickup_photo_at timestamptz;
alter table public.orders add column if not exists pickup_photo_path text;
alter table public.orders add column if not exists dropoff_photo_at timestamptz;
alter table public.orders add column if not exists dropoff_photo_path text;
alter table public.orders add column if not exists kitchen_released_at timestamptz;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'order-proofs',
  'order-proofs',
  false,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;
