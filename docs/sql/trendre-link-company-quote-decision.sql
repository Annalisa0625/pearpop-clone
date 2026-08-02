-- Trendre Link: atomic company quote approval / decline.
--
-- Manual application:
-- 1. Apply docs/sql/trendre-link-company-quote-activation.sql first.
-- 2. Open the target Supabase project > SQL Editor.
-- 3. Run this file once. It is safe to run again.
-- 4. Confirm the function is executable by service_role only.

create or replace function public.decide_creator_inquiry_quote(
  p_quote_id uuid,
  p_user_id uuid,
  p_decision text
)
returns table (
  id uuid,
  inquiry_id uuid,
  status text,
  accepted_at timestamptz,
  declined_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_decision not in ('accepted', 'declined') then
    return;
  end if;

  return query
  update public.creator_inquiry_quotes as quote
     set status = p_decision,
         accepted_at = case
           when p_decision = 'accepted' then coalesce(quote.accepted_at, now())
           else null
         end,
         declined_at = case
           when p_decision = 'declined' then coalesce(quote.declined_at, now())
           else null
         end,
         updated_at = now()
   where quote.id = p_quote_id
     and quote.company_user_id = p_user_id
     and quote.status = 'sent'
     and quote.valid_until > now()
     and exists (
       select 1
       from public.creator_inquiry_quote_access as access
       where access.quote_id = quote.id
         and access.user_id = p_user_id
         and access.claimed_at is not null
     )
  returning
    quote.id,
    quote.inquiry_id,
    quote.status,
    quote.accepted_at,
    quote.declined_at,
    quote.updated_at;

  if found then
    return;
  end if;

  -- Repeating the same decision is idempotent. A conflicting second decision,
  -- an expired quote, or a quote owned by another user returns no row.
  return query
  select
    quote.id,
    quote.inquiry_id,
    quote.status,
    quote.accepted_at,
    quote.declined_at,
    quote.updated_at
  from public.creator_inquiry_quotes as quote
  where quote.id = p_quote_id
    and quote.company_user_id = p_user_id
    and quote.status = p_decision
    and exists (
      select 1
      from public.creator_inquiry_quote_access as access
      where access.quote_id = quote.id
        and access.user_id = p_user_id
        and access.claimed_at is not null
    )
  limit 1;
end;
$$;

revoke all on function public.decide_creator_inquiry_quote(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.decide_creator_inquiry_quote(uuid, uuid, text)
  to service_role;

comment on function public.decide_creator_inquiry_quote(uuid, uuid, text) is
  'Atomically accepts or declines a claimed Trendre Link quote. Same-decision retries are idempotent; conflicting decisions are rejected.';
