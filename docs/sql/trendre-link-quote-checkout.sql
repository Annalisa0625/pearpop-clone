-- Trendre Link: quote checkout and order conversion foundation.
--
-- Purpose:
-- - Track Stripe Checkout state for an accepted Link quote.
-- - Link the resulting formal order back to the original inquiry and quote.
-- - Prevent duplicate orders, Checkout Sessions, and PaymentIntents.
--
-- Manual application only:
-- 1. Review this file in Git first.
-- 2. Apply it later from the intended Supabase project's SQL Editor.
-- 3. Do not run it against Production without explicit approval.
--
-- This file is safe to run again.

begin;

-- ---------------------------------------------------------------------------
-- 1. Add Checkout state to Creator Inquiry Quotes
-- ---------------------------------------------------------------------------

alter table public.creator_inquiry_quotes
  add column if not exists checkout_status text not null default 'not_started',
  add column if not exists checkout_attempt_count integer not null default 0,
  add column if not exists stripe_checkout_session_id text null,
  add column if not exists stripe_payment_intent_id text null,
  add column if not exists checkout_started_at timestamptz null,
  add column if not exists checkout_completed_at timestamptz null,
  add column if not exists checkout_last_error text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'creator_inquiry_quotes_checkout_status_check'
      and conrelid = 'public.creator_inquiry_quotes'::regclass
  ) then
    alter table public.creator_inquiry_quotes
      add constraint creator_inquiry_quotes_checkout_status_check
      check (
        checkout_status in (
          'not_started',
          'creating',
          'open',
          'completed',
          'expired',
          'cancelled',
          'failed'
        )
      ) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'creator_inquiry_quotes_checkout_attempt_count_check'
      and conrelid = 'public.creator_inquiry_quotes'::regclass
  ) then
    alter table public.creator_inquiry_quotes
      add constraint creator_inquiry_quotes_checkout_attempt_count_check
      check (checkout_attempt_count >= 0) not valid;
  end if;
end
$$;

alter table public.creator_inquiry_quotes
  validate constraint creator_inquiry_quotes_checkout_status_check;

alter table public.creator_inquiry_quotes
  validate constraint creator_inquiry_quotes_checkout_attempt_count_check;

-- A Stripe object must belong to only one Link quote.
create unique index if not exists creator_inquiry_quotes_checkout_session_uidx
  on public.creator_inquiry_quotes (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create unique index if not exists creator_inquiry_quotes_payment_intent_uidx
  on public.creator_inquiry_quotes (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create index if not exists creator_inquiry_quotes_company_checkout_idx
  on public.creator_inquiry_quotes (
    company_user_id,
    checkout_status,
    updated_at desc
  )
  where company_user_id is not null;

-- ---------------------------------------------------------------------------
-- 2. Add Trendre Link origin references to formal orders
-- ---------------------------------------------------------------------------

alter table public.orders
  add column if not exists trendre_link_inquiry_id uuid null,
  add column if not exists trendre_link_quote_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_trendre_link_inquiry_id_fkey'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_trendre_link_inquiry_id_fkey
      foreign key (trendre_link_inquiry_id)
      references public.creator_inquiries(id)
      on delete restrict
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_trendre_link_quote_id_fkey'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_trendre_link_quote_id_fkey
      foreign key (trendre_link_quote_id)
      references public.creator_inquiry_quotes(id)
      on delete restrict
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_trendre_link_reference_pair_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_trendre_link_reference_pair_check
      check (
        (
          trendre_link_inquiry_id is null
          and trendre_link_quote_id is null
        )
        or
        (
          trendre_link_inquiry_id is not null
          and trendre_link_quote_id is not null
        )
      ) not valid;
  end if;
end
$$;

alter table public.orders
  validate constraint orders_trendre_link_inquiry_id_fkey;

alter table public.orders
  validate constraint orders_trendre_link_quote_id_fkey;

alter table public.orders
  validate constraint orders_trendre_link_reference_pair_check;

-- One accepted Link quote can create only one formal order.
create unique index if not exists orders_trendre_link_quote_id_uidx
  on public.orders (trendre_link_quote_id)
  where trendre_link_quote_id is not null;

create index if not exists orders_trendre_link_inquiry_id_idx
  on public.orders (trendre_link_inquiry_id)
  where trendre_link_inquiry_id is not null;

-- ---------------------------------------------------------------------------
-- 3. Documentation
-- ---------------------------------------------------------------------------

comment on column public.creator_inquiry_quotes.checkout_status is
  'Stripe Checkout lifecycle for an accepted Trendre Link quote.';

comment on column public.creator_inquiry_quotes.checkout_attempt_count is
  'Incremented whenever a new Stripe Checkout attempt is started.';

comment on column public.creator_inquiry_quotes.stripe_checkout_session_id is
  'Stripe Checkout Session created from the accepted Trendre Link quote.';

comment on column public.creator_inquiry_quotes.stripe_payment_intent_id is
  'Stripe PaymentIntent associated with the Link quote Checkout Session.';

comment on column public.creator_inquiry_quotes.checkout_last_error is
  'Latest server-side Checkout setup error. Must not contain secrets or card data.';

comment on column public.orders.trendre_link_inquiry_id is
  'Original Trendre Link inquiry that produced this formal order.';

comment on column public.orders.trendre_link_quote_id is
  'Accepted Trendre Link quote that produced this formal order. Unique when present.';

commit;