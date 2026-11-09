create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

alter table public.orders
  add column if not exists ticket_sent_at timestamptz;

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

create table if not exists private.cron_header (
  id text primary key,
  value text not null
);

revoke all on table private.cron_header from public, anon, authenticated;

create or replace function private.ping_experience_email()
returns void
language plpgsql
security definer
set search_path = private, net, pg_catalog
as $$
declare
  secret text;
begin
  select value into secret from private.cron_header where id = 'ops';
  if secret is null or secret = '' then
    return;
  end if;
  perform net.http_get(
    'https://lasvaqueras.com.mx/api/cron/experience-email',
    '{}'::jsonb,
    jsonb_build_object('x-webhook-secret', secret),
    20000
  );
end;
$$;

revoke all on function private.ping_experience_email() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule('experience-email');
exception
  when others then
    null;
end $$;

select cron.schedule(
  'experience-email',
  '*/5 * * * *',
  'select private.ping_experience_email()'
);
