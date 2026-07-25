-- Trendre Link: company quote notification and activation access.
--
-- Manual application:
-- 1. Open the target Supabase project > SQL Editor.
-- 2. Confirm that public.creator_inquiries and public.creator_inquiry_quotes
--    already exist and that this is the intended project.
-- 3. Run this file once. All statements are safe to run again.
-- 4. Confirm RLS is enabled and test with anon/authenticated/service_role.
-- 5. Regenerate database types after applying this SQL in each environment.
--
-- Do not store the raw claim token. The application stores only a lowercase
-- SHA-256 hex digest in claim_token_hash.

create table if not exists public.creator_inquiry_quote_access (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.creator_inquiries(id) on delete cascade,
  quote_id uuid not null references public.creator_inquiry_quotes(id) on delete cascade,
  contact_email text not null,
  user_id uuid null references auth.users(id) on delete set null,
  claim_token_hash text not null,
  expires_at timestamptz not null,
  claimed_at timestamptz null,
  email_status text not null default 'pending',
  email_provider_id text null,
  email_sent_at timestamptz null,
  email_last_error text null,
  send_attempt_count integer not null default 0,
  last_send_attempt_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_inquiry_quote_access_quote_id_key unique (quote_id),
  constraint creator_inquiry_quote_access_claim_hash_key unique (claim_token_hash),
  constraint creator_inquiry_quote_access_email_normalized_check
    check (contact_email = lower(btrim(contact_email)) and length(contact_email) between 3 and 254),
  constraint creator_inquiry_quote_access_claim_hash_check
    check (claim_token_hash ~ '^[0-9a-f]{64}$'),
  constraint creator_inquiry_quote_access_email_status_check
    check (email_status in ('pending', 'sent', 'failed', 'not_configured')),
  constraint creator_inquiry_quote_access_attempt_count_check
    check (send_attempt_count >= 0),
  constraint creator_inquiry_quote_access_claim_consistency_check
    check (
      (user_id is null and claimed_at is null)
      or (user_id is not null and claimed_at is not null)
    )
);

create index if not exists creator_inquiry_quote_access_user_idx
  on public.creator_inquiry_quote_access (user_id, claimed_at desc)
  where user_id is not null;

create index if not exists creator_inquiry_quote_access_inquiry_idx
  on public.creator_inquiry_quote_access (inquiry_id);

alter table public.creator_inquiry_quote_access enable row level security;
alter table public.creator_inquiry_quote_access force row level security;

revoke all on table public.creator_inquiry_quote_access from anon;
revoke insert, update, delete on table public.creator_inquiry_quote_access from authenticated;
grant select on table public.creator_inquiry_quote_access to authenticated;

drop policy if exists creator_inquiry_quote_access_select_own
  on public.creator_inquiry_quote_access;

create policy creator_inquiry_quote_access_select_own
on public.creator_inquiry_quote_access
for select
to authenticated
using (user_id = auth.uid() and claimed_at is not null);

comment on table public.creator_inquiry_quote_access is
  'Server-managed access grants for Link inquiry quotes. Raw claim tokens must never be stored.';
comment on column public.creator_inquiry_quote_access.claim_token_hash is
  'Lowercase SHA-256 hex digest of the application claim token.';

create or replace function public.set_creator_inquiry_quote_access_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_creator_inquiry_quote_access_updated_at
  on public.creator_inquiry_quote_access;

create trigger set_creator_inquiry_quote_access_updated_at
before update on public.creator_inquiry_quote_access
for each row execute function public.set_creator_inquiry_quote_access_updated_at();

-- Atomically claims an unused, unexpired grant. The same user may call this
-- again idempotently. A different user can never take an already claimed row.
drop function if exists public.claim_creator_inquiry_quote_access(text, uuid, text);

create function public.claim_creator_inquiry_quote_access(
  p_claim_token_hash text,
  p_user_id uuid,
  p_email text
)
returns table (
  id uuid,
  inquiry_id uuid,
  quote_id uuid,
  user_id uuid,
  claimed_at timestamptz,
  contact_email text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_email text := lower(btrim(p_email));
begin
  return query
  update public.creator_inquiry_quote_access as access
     set user_id = p_user_id,
         claimed_at = coalesce(access.claimed_at, now()),
         updated_at = now()
   where access.claim_token_hash = lower(p_claim_token_hash)
     and access.contact_email = v_email
     and (
       (
         access.user_id is null
         and access.claimed_at is null
         and access.expires_at > now()
       )
       or access.user_id = p_user_id
     )
  returning
    access.id,
    access.inquiry_id,
    access.quote_id,
    access.user_id,
    access.claimed_at,
    access.contact_email;
end;
$$;

revoke all on function public.claim_creator_inquiry_quote_access(text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.claim_creator_inquiry_quote_access(text, uuid, text)
  to service_role;

-- Rotates both application and Supabase tokens before a resend. The conditional
-- UPDATE is the durable 60-second resend limiter and prevents concurrent sends.
create or replace function public.rotate_creator_inquiry_quote_access(
  p_current_claim_token_hash text,
  p_new_claim_token_hash text,
  p_new_expires_at timestamptz
)
returns table (
  id uuid,
  inquiry_id uuid,
  quote_id uuid,
  contact_email text,
  send_attempt_count integer
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  return query
  update public.creator_inquiry_quote_access as access
     set claim_token_hash = lower(p_new_claim_token_hash),
         expires_at = p_new_expires_at,
         email_status = 'pending',
         email_provider_id = null,
         email_sent_at = null,
         email_last_error = null,
         send_attempt_count = access.send_attempt_count + 1,
         last_send_attempt_at = now(),
         updated_at = now()
   where access.claim_token_hash = lower(p_current_claim_token_hash)
     and access.user_id is null
     and access.claimed_at is null
     and (
       access.last_send_attempt_at is null
       or access.last_send_attempt_at <= now() - interval '60 seconds'
     )
  returning
    access.id,
    access.inquiry_id,
    access.quote_id,
    access.contact_email,
    access.send_attempt_count;
end;
$$;

revoke all on function public.rotate_creator_inquiry_quote_access(text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.rotate_creator_inquiry_quote_access(text, text, timestamptz)
  to service_role;
