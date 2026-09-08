create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  first_name_key text not null,
  last_name_key text not null,
  phone text not null unique,
  email text not null,
  avatar_path text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists customers_phone_idx on public.customers (phone);

alter table public.orders add column if not exists customer_id uuid references public.customers(id);

alter table public.customers enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'customer-avatars',
  'customer-avatars',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

drop policy if exists "Public read customer avatars" on storage.objects;
create policy "Public read customer avatars"
  on storage.objects
  for select
  to public
  using (bucket_id = 'customer-avatars');
