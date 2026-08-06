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
-- 4. Before applying, confirm that no legacy orders have creator_menu_id IS NULL.
--    Such rows indicate schema drift and make the origin constraint validation
--    fail; the surrounding transaction will roll back every change.
--
-- This file is safe to run again.

begin;

-- ---------------------------------------------------------------------------
-- 1. Add Checkout state to Creator Inquiry Quotes
-- ---------------------------------------------------------------------------

alter table public.creator_inquiry_quotes
  add column if not exists checkout_status text not null default 'not_started',
  add column if not exists checkout_attempt_count integer not null default 0,
  add column if not exists checkout_attempt_token uuid null,
  add column if not exists checkout_session_request jsonb null,
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
          'failed',
          'recovery_required'
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

  if not exists (
    select 1 from pg_constraint
    where conname = 'creator_inquiry_quotes_checkout_request_check'
      and conrelid = 'public.creator_inquiry_quotes'::regclass
  ) then
    alter table public.creator_inquiry_quotes
      add constraint creator_inquiry_quotes_checkout_request_check
      check (
        checkout_session_request is null
        or jsonb_typeof(checkout_session_request) = 'object'
      ) not valid;
  end if;
end
$$;

alter table public.creator_inquiry_quotes
  validate constraint creator_inquiry_quotes_checkout_status_check;

alter table public.creator_inquiry_quotes
  validate constraint creator_inquiry_quotes_checkout_attempt_count_check;

alter table public.creator_inquiry_quotes
  validate constraint creator_inquiry_quotes_checkout_request_check;

-- A Stripe object must belong to only one Link quote.
create unique index if not exists creator_inquiry_quotes_checkout_session_uidx
  on public.creator_inquiry_quotes (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create unique index if not exists creator_inquiry_quotes_payment_intent_uidx
  on public.creator_inquiry_quotes (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create unique index if not exists creator_inquiry_quotes_attempt_token_uidx
  on public.creator_inquiry_quotes (checkout_attempt_token)
  where checkout_attempt_token is not null;

create index if not exists creator_inquiry_quotes_company_checkout_idx
  on public.creator_inquiry_quotes (
    company_user_id,
    checkout_status,
    updated_at desc
  )
  where company_user_id is not null;

-- ---------------------------------------------------------------------------
-- 2. Make public inquiry submission idempotent
-- ---------------------------------------------------------------------------

alter table public.creator_inquiries
  add column if not exists submission_id uuid null;

create unique index if not exists creator_inquiries_company_submission_uidx
  on public.creator_inquiries (company_user_id, submission_id)
  where company_user_id is not null and submission_id is not null;

create unique index if not exists creator_inquiries_anonymous_submission_uidx
  on public.creator_inquiries (link_page_id, submission_id)
  where company_user_id is null and link_page_id is not null and submission_id is not null;

-- ---------------------------------------------------------------------------
-- 3. Add Trendre Link origin references to formal orders
-- ---------------------------------------------------------------------------

alter table public.orders
  add column if not exists trendre_link_inquiry_id uuid null,
  add column if not exists trendre_link_quote_id uuid null;

-- Link quotes are not created from a creator_menus row. Existing menu orders
-- keep their menu reference; only Link-origin orders may store NULL here.
alter table public.orders
  alter column creator_menu_id drop not null;

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

  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_trendre_link_origin_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_trendre_link_origin_check
      check (
        (
          trendre_link_quote_id is null
          and creator_menu_id is not null
        )
        or
        (
          trendre_link_quote_id is not null
          and creator_menu_id is null
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

alter table public.orders
  validate constraint orders_trendre_link_origin_check;

-- One accepted Link quote can create only one formal order.
create unique index if not exists orders_trendre_link_quote_id_uidx
  on public.orders (trendre_link_quote_id)
  where trendre_link_quote_id is not null;

create index if not exists orders_trendre_link_inquiry_id_idx
  on public.orders (trendre_link_inquiry_id)
  where trendre_link_inquiry_id is not null;

-- Payment actions use a fenced two-phase state machine. A short claimed lease
-- may be replaced before Stripe is touched. claimed -> executing is a DB-clock
-- CAS; executing tokens are never replaced, so recovery must retain the same
-- action, token, and Stripe idempotency key. Terminal finalization clears the
-- state machine atomically and leaves side effects pending for the reconciler.
alter table public.orders
  add column if not exists payment_action_type text null,
  add column if not exists payment_action_token uuid null,
  add column if not exists payment_action_state text null,
  add column if not exists payment_action_started_at timestamptz null,
  add column if not exists payment_action_execution_started_at timestamptz null,
  add column if not exists payment_action_updated_at timestamptz null,
  add column if not exists payment_action_effects_completed_at timestamptz null,
  add column if not exists payment_action_reconcile_attempted_at timestamptz null,
  add column if not exists payment_action_effects_attempted_at timestamptz null,
  add column if not exists payment_action_auto_cancel_attempted_at timestamptz null;

alter table public.orders
  drop constraint if exists orders_payment_action_claim_check;

alter table public.orders
  add constraint orders_payment_action_claim_check
  check (
    (
      payment_action_type is null
      and payment_action_token is null
      and payment_action_state is null
      and payment_action_started_at is null
      and payment_action_execution_started_at is null
      and payment_action_updated_at is null
    )
    or
    (
      payment_action_type in ('accept', 'decline', 'auto_cancel')
      and payment_action_token is not null
      and payment_action_state = 'claimed'
      and payment_action_started_at is not null
      and payment_action_execution_started_at is null
      and payment_action_updated_at is not null
    )
    or
    (
      payment_action_type in ('accept', 'decline', 'auto_cancel')
      and payment_action_token is not null
      and payment_action_state = 'executing'
      and payment_action_started_at is not null
      and payment_action_execution_started_at is not null
      and payment_action_updated_at is not null
    )
  ) not valid;

alter table public.orders
  validate constraint orders_payment_action_claim_check;

create unique index if not exists orders_payment_action_token_uidx
  on public.orders (payment_action_token)
  where payment_action_token is not null;

create index if not exists orders_payment_action_reconcile_idx
  on public.orders (payment_action_state, payment_action_updated_at);

create index if not exists orders_payment_action_effects_pending_idx
  on public.orders (payment_action_effects_completed_at, updated_at);

create index if not exists orders_payment_action_executing_work_idx
  on public.orders (
    payment_action_state,
    payment_action_reconcile_attempted_at,
    payment_action_updated_at,
    id
  );

create index if not exists orders_payment_action_effects_work_idx
  on public.orders (
    payment_action_effects_completed_at,
    payment_action_effects_attempted_at,
    updated_at,
    id
  );

create index if not exists orders_payment_action_auto_cancel_work_idx
  on public.orders (
    status,
    payment_status,
    payment_action_auto_cancel_attempted_at,
    creator_accept_deadline,
    id
  );

drop function if exists public.claim_order_payment_action(
  uuid, text, uuid, uuid, bigint, text, text, uuid, timestamptz
);

create function public.claim_order_payment_action(
  p_order_id uuid,
  p_action text,
  p_claim_token uuid,
  p_expected_company_user_id uuid,
  p_expected_amount bigint,
  p_expected_currency text,
  p_expected_payment_intent_id text,
  p_expected_creator_user_id uuid,
  p_expected_creator_accept_deadline timestamptz
) returns table (claimed boolean, previous_action text, reason text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_action not in ('accept', 'decline', 'auto_cancel') or p_claim_token is null then
    return query select false, null::text, 'invalid_action'::text;
    return;
  end if;

  return query
  with candidate as (
    select o.id, o.payment_action_type as old_action
    from public.orders o
    where o.id = p_order_id
      and o.status = 'authorized_pending_creator'
      and o.payment_status = 'authorized'
      and o.b_user_id = p_expected_company_user_id
      and o.creator_user_id = p_expected_creator_user_id
      and o.stripe_amount = p_expected_amount
      and upper(o.currency) = upper(p_expected_currency)
      and o.stripe_payment_intent_id = p_expected_payment_intent_id
      and o.creator_accept_deadline = p_expected_creator_accept_deadline
      and (
        (
          p_action in ('accept', 'decline')
          and p_expected_creator_user_id is not null
          and o.creator_accept_deadline > clock_timestamp()
        )
        or
        (
          p_action = 'auto_cancel'
          and o.creator_accept_deadline <= clock_timestamp()
        )
      )
      and (
        (
          o.payment_action_type is null
          and o.payment_action_token is null
          and o.payment_action_state is null
        )
        or
        (
          o.payment_action_state = 'claimed'
          and o.payment_action_started_at <= clock_timestamp() - interval '2 minutes'
        )
      )
    for update skip locked
  ), updated as (
    update public.orders o
    set payment_action_type = p_action,
        payment_action_token = p_claim_token,
        payment_action_state = 'claimed',
        payment_action_started_at = clock_timestamp(),
        payment_action_execution_started_at = null,
        payment_action_updated_at = clock_timestamp(),
        updated_at = clock_timestamp()
    from candidate c
    where o.id = c.id
    returning c.old_action
  )
  select true, u.old_action, 'claimed'::text from updated u;

  if not found then
    if exists (select 1 from public.orders where id = p_order_id) then
      return query select false, null::text, 'conflict'::text;
    else
      return query select false, null::text, 'not_found'::text;
    end if;
  end if;
end
$$;

revoke all on function public.claim_order_payment_action(
  uuid, text, uuid, uuid, bigint, text, text, uuid, timestamptz
) from public, anon, authenticated;
grant execute on function public.claim_order_payment_action(
  uuid, text, uuid, uuid, bigint, text, text, uuid, timestamptz
) to service_role;

drop function if exists public.start_order_payment_action_execution(
  uuid, text, uuid, uuid, bigint, text, text, uuid, timestamptz
);

create function public.start_order_payment_action_execution(
  p_order_id uuid,
  p_action text,
  p_claim_token uuid,
  p_expected_company_user_id uuid,
  p_expected_amount bigint,
  p_expected_currency text,
  p_expected_payment_intent_id text,
  p_expected_creator_user_id uuid,
  p_expected_creator_accept_deadline timestamptz
) returns table (started boolean, reason text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_action not in ('accept', 'decline', 'auto_cancel') or p_claim_token is null then
    return query select false, 'conflict'::text;
    return;
  end if;

  return query
  with updated as (
    update public.orders o
    set payment_action_state = 'executing',
        payment_action_execution_started_at = clock_timestamp(),
        payment_action_updated_at = clock_timestamp(),
        updated_at = clock_timestamp()
    where o.id = p_order_id
      and o.status = 'authorized_pending_creator'
      and o.payment_status = 'authorized'
      and o.b_user_id = p_expected_company_user_id
      and o.creator_user_id = p_expected_creator_user_id
      and o.stripe_amount = p_expected_amount
      and upper(o.currency) = upper(p_expected_currency)
      and o.stripe_payment_intent_id = p_expected_payment_intent_id
      and o.creator_accept_deadline = p_expected_creator_accept_deadline
      and o.payment_action_state = 'claimed'
      and o.payment_action_type = p_action
      and o.payment_action_token = p_claim_token
      and (
        (p_action in ('accept', 'decline') and clock_timestamp() < o.creator_accept_deadline)
        or (p_action = 'auto_cancel' and clock_timestamp() >= o.creator_accept_deadline)
      )
    returning o.id
  )
  select true, 'started'::text from updated;

  if found then return; end if;

  if p_action in ('accept', 'decline') and exists (
    select 1 from public.orders o
    where o.id = p_order_id
      and o.payment_action_state = 'claimed'
      and o.payment_action_type = p_action
      and o.payment_action_token = p_claim_token
      and clock_timestamp() >= o.creator_accept_deadline
  ) then
    return query select false, 'deadline_expired'::text;
  elsif not exists (select 1 from public.orders where id = p_order_id) then
    return query select false, 'not_found'::text;
  else
    return query select false, 'conflict'::text;
  end if;
end
$$;

revoke all on function public.start_order_payment_action_execution(
  uuid, text, uuid, uuid, bigint, text, text, uuid, timestamptz
) from public, anon, authenticated;
grant execute on function public.start_order_payment_action_execution(
  uuid, text, uuid, uuid, bigint, text, text, uuid, timestamptz
) to service_role;

drop function if exists public.verify_order_payment_action_execution(
  uuid, text, uuid, uuid, bigint, text, text, uuid, timestamptz
);

create function public.verify_order_payment_action_execution(
  p_order_id uuid,
  p_action text,
  p_claim_token uuid,
  p_expected_company_user_id uuid,
  p_expected_amount bigint,
  p_expected_currency text,
  p_expected_payment_intent_id text,
  p_expected_creator_user_id uuid,
  p_expected_creator_accept_deadline timestamptz
) returns table (authorized boolean, reason text)
language sql
security definer
set search_path = public, pg_temp
as $$
  with verified as (
    update public.orders o
    set payment_action_updated_at = clock_timestamp(),
        updated_at = clock_timestamp()
    where o.id = p_order_id
      and o.status = 'authorized_pending_creator'
      and o.payment_status = 'authorized'
      and o.b_user_id = p_expected_company_user_id
      and o.creator_user_id = p_expected_creator_user_id
      and o.stripe_amount = p_expected_amount
      and upper(o.currency) = upper(p_expected_currency)
      and o.stripe_payment_intent_id = p_expected_payment_intent_id
      and o.creator_accept_deadline = p_expected_creator_accept_deadline
      and o.payment_action_state = 'executing'
      and o.payment_action_type = p_action
      and o.payment_action_token = p_claim_token
      and (
        p_action <> 'accept'
        or o.payment_action_execution_started_at < o.creator_accept_deadline
      )
    returning o.id
  )
  select
    exists(select 1 from verified) as authorized,
    case
      when exists(select 1 from verified) then 'authorized'
      when exists(select 1 from public.orders where id = p_order_id) then 'conflict'
      else 'not_found'
    end as reason;
$$;

revoke all on function public.verify_order_payment_action_execution(
  uuid, text, uuid, uuid, bigint, text, text, uuid, timestamptz
) from public, anon, authenticated;
grant execute on function public.verify_order_payment_action_execution(
  uuid, text, uuid, uuid, bigint, text, text, uuid, timestamptz
) to service_role;

drop function if exists public.clear_stale_order_payment_action_claims();

create function public.clear_stale_order_payment_action_claims()
returns table (cleared_count bigint)
language sql
security definer
set search_path = public, pg_temp
as $$
  with cleared as (
    update public.orders o
    set payment_action_type = null,
        payment_action_token = null,
        payment_action_state = null,
        payment_action_started_at = null,
        payment_action_execution_started_at = null,
        payment_action_updated_at = null,
        updated_at = clock_timestamp()
    where o.status = 'authorized_pending_creator'
      and o.payment_status = 'authorized'
      and o.payment_action_state = 'claimed'
      and o.payment_action_started_at <= clock_timestamp() - interval '2 minutes'
    returning o.id
  )
  select count(*)::bigint from cleared;
$$;

revoke all on function public.clear_stale_order_payment_action_claims()
  from public, anon, authenticated;
grant execute on function public.clear_stale_order_payment_action_claims()
  to service_role;

-- Atomically rotate bounded reconciler work. Each claim records an attempt
-- before returning the order ID, so a permanently failing or processing order
-- moves behind unattempted/older work. SKIP LOCKED lets concurrent workers
-- claim disjoint rows; the payment-action CAS and idempotent effects remain the
-- final protection if a retry lease expires while an earlier worker is alive.
drop function if exists public.claim_order_payment_action_work(text, integer, integer);

create function public.claim_order_payment_action_work(
  p_work_type text,
  p_batch_size integer,
  p_retry_after_seconds integer
)
returns table(order_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  claimed_at timestamptz := clock_timestamp();
begin
  if p_work_type is null or p_work_type not in ('executing', 'effects', 'auto_cancel') then
    raise exception 'invalid payment action work type';
  end if;
  if p_batch_size is null or p_batch_size < 1 or p_batch_size > 100 then
    raise exception 'payment action batch size must be between 1 and 100';
  end if;
  if p_retry_after_seconds is null
     or p_retry_after_seconds < 1
     or p_retry_after_seconds > 86400 then
    raise exception 'payment action retry interval must be between 1 and 86400 seconds';
  end if;

  return query
  with candidates as materialized (
    select
      o.id,
      case p_work_type
        when 'executing' then o.payment_action_reconcile_attempted_at
        when 'effects' then o.payment_action_effects_attempted_at
        else o.payment_action_auto_cancel_attempted_at
      end as previous_attempt_at,
      case p_work_type
        when 'executing' then o.payment_action_updated_at
        when 'effects' then o.updated_at
        else o.creator_accept_deadline
      end as anchor_at
    from public.orders o
    where
      (
        p_work_type = 'executing'
        and o.status = 'authorized_pending_creator'
        and o.payment_status = 'authorized'
        and o.payment_action_state = 'executing'
        and (
          o.payment_action_reconcile_attempted_at is null
          or o.payment_action_reconcile_attempted_at <=
            claimed_at - make_interval(secs => p_retry_after_seconds)
        )
      )
      or
      (
        p_work_type = 'effects'
        and o.payment_action_effects_completed_at is null
        and (
          (o.status = 'accepted_captured' and o.payment_status = 'captured')
          or
          (
            o.status in ('declined_canceled', 'expired_canceled')
            and o.payment_status = 'canceled'
          )
        )
        and (
          o.payment_action_effects_attempted_at is null
          or o.payment_action_effects_attempted_at <=
            claimed_at - make_interval(secs => p_retry_after_seconds)
        )
      )
      or
      (
        p_work_type = 'auto_cancel'
        and o.status = 'authorized_pending_creator'
        and o.payment_status = 'authorized'
        and o.stripe_payment_intent_id is not null
        and o.creator_accept_deadline is not null
        and o.creator_accept_deadline <= claimed_at
        and o.payment_action_state is null
        and (
          o.payment_action_auto_cancel_attempted_at is null
          or o.payment_action_auto_cancel_attempted_at <=
            claimed_at - make_interval(secs => p_retry_after_seconds)
        )
      )
    order by previous_attempt_at asc nulls first, anchor_at asc nulls first, o.id asc
    limit p_batch_size
    for update of o skip locked
  ), updated as (
    update public.orders o
    set payment_action_reconcile_attempted_at = case
          when p_work_type = 'executing' then claimed_at
          else o.payment_action_reconcile_attempted_at
        end,
        payment_action_effects_attempted_at = case
          when p_work_type = 'effects' then claimed_at
          else o.payment_action_effects_attempted_at
        end,
        payment_action_auto_cancel_attempted_at = case
          when p_work_type = 'auto_cancel' then claimed_at
          else o.payment_action_auto_cancel_attempted_at
        end
    from candidates c
    where o.id = c.id
    returning o.id
  )
  select c.id
  from candidates c
  join updated u on u.id = c.id
  order by c.previous_attempt_at asc nulls first, c.anchor_at asc nulls first, c.id asc;
end
$$;

revoke all on function public.claim_order_payment_action_work(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.claim_order_payment_action_work(text, integer, integer)
  to service_role;

drop function if exists public.finalize_order_payment_action(
  uuid, text, uuid, text, text, text, uuid, bigint, text, text, uuid, timestamptz
);

create function public.finalize_order_payment_action(
  p_order_id uuid,
  p_action text,
  p_claim_token uuid,
  p_outcome text,
  p_cancel_action text,
  p_stripe_status text,
  p_expected_company_user_id uuid,
  p_expected_amount bigint,
  p_expected_currency text,
  p_expected_payment_intent_id text,
  p_expected_creator_user_id uuid,
  p_expected_creator_accept_deadline timestamptz
) returns table (finalized boolean, reason text)
language sql
security definer
set search_path = public, pg_temp
as $$
  with finalized_row as (
    update public.orders o
    set status = case
          when p_outcome = 'accepted' then 'accepted_captured'
          when p_cancel_action = 'decline' then 'declined_canceled'
          else 'expired_canceled'
        end,
        payment_status = case when p_outcome = 'accepted' then 'captured' else 'canceled' end,
        stripe_payment_status = p_stripe_status,
        accepted_at = case when p_outcome = 'accepted' then clock_timestamp() else o.accepted_at end,
        captured_at = case when p_outcome = 'accepted' then clock_timestamp() else o.captured_at end,
        declined_at = case when p_outcome = 'canceled' and p_cancel_action = 'decline'
          then clock_timestamp() else o.declined_at end,
        canceled_at = case when p_outcome = 'canceled' then clock_timestamp() else o.canceled_at end,
        payment_action_type = null,
        payment_action_token = null,
        payment_action_state = null,
        payment_action_started_at = null,
        payment_action_execution_started_at = null,
        payment_action_updated_at = null,
        payment_action_effects_completed_at = null,
        updated_at = clock_timestamp()
    where o.id = p_order_id
      and o.status = 'authorized_pending_creator'
      and o.payment_status = 'authorized'
      and o.b_user_id = p_expected_company_user_id
      and o.creator_user_id = p_expected_creator_user_id
      and o.stripe_amount = p_expected_amount
      and upper(o.currency) = upper(p_expected_currency)
      and o.stripe_payment_intent_id = p_expected_payment_intent_id
      and o.creator_accept_deadline = p_expected_creator_accept_deadline
      and o.payment_action_state = 'executing'
      and o.payment_action_type = p_action
      and o.payment_action_token = p_claim_token
      and (
        (p_outcome = 'accepted' and p_stripe_status = 'succeeded' and p_cancel_action is null)
        or
        (p_outcome = 'canceled' and p_stripe_status = 'canceled'
          and p_cancel_action in ('decline', 'auto_cancel'))
      )
    returning o.id
  )
  select
    exists(select 1 from finalized_row) as finalized,
    case
      when exists(select 1 from finalized_row) then 'finalized'
      when exists(select 1 from public.orders where id = p_order_id) then 'conflict'
      else 'not_found'
    end as reason;
$$;

revoke all on function public.finalize_order_payment_action(
  uuid, text, uuid, text, text, text, uuid, bigint, text, text, uuid, timestamptz
) from public, anon, authenticated;
grant execute on function public.finalize_order_payment_action(
  uuid, text, uuid, text, text, text, uuid, bigint, text, text, uuid, timestamptz
) to service_role;

-- A retried webhook repairs the same audit event instead of adding duplicates.
alter table public.order_events
  add column if not exists dedupe_key text null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'order_events_dedupe_key_key'
      and conrelid = 'public.order_events'::regclass
  ) then
    alter table public.order_events
      add constraint order_events_dedupe_key_key unique (dedupe_key);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'order_events_dedupe_key_length_check'
      and conrelid = 'public.order_events'::regclass
  ) then
    alter table public.order_events
      add constraint order_events_dedupe_key_length_check
      check (dedupe_key is null or length(dedupe_key) between 1 and 200)
      not valid;
  end if;
end
$$;

alter table public.order_events
  validate constraint order_events_dedupe_key_length_check;

-- Notification retries rely on a database-level conflict. NULL keys retain the
-- existing non-idempotent notification behavior; only explicit keys are unique
-- per recipient.
alter table public.notifications
  add column if not exists dedupe_key text null;

create unique index if not exists notifications_recipient_dedupe_key_uidx
  on public.notifications (recipient_user_id, dedupe_key)
  where dedupe_key is not null;

-- IF NOT EXISTS must not silently accept drifted objects. These temporary
-- assertion helpers compare catalog-level uniqueness, ordered key columns,
-- sort direction, predicates, FK targets/actions, and normalized check trees.
create or replace function pg_temp.assert_index_definition(
  index_name text,
  expected_unique boolean,
  expected_columns text[],
  expected_desc boolean[],
  expected_predicate text
) returns void language plpgsql as $$
declare
  actual_unique boolean;
  actual_columns text[];
  actual_desc boolean[];
  actual_predicate text;
begin
  select
    i.indisunique,
    array_agg(a.attname order by key_column.ordinality),
    array_agg((i.indoption[(key_column.ordinality - 1)::integer] & 1) = 1 order by key_column.ordinality),
    lower(regexp_replace(coalesce(pg_get_expr(i.indpred, i.indrelid), ''), '[[:space:]()]', '', 'g'))
  into actual_unique, actual_columns, actual_desc, actual_predicate
  from pg_index i
  join pg_class index_class on index_class.oid = i.indexrelid
  join pg_namespace index_namespace on index_namespace.oid = index_class.relnamespace
  cross join lateral unnest(i.indkey::smallint[]) with ordinality as key_column(attnum, ordinality)
  join pg_attribute a on a.attrelid = i.indrelid and a.attnum = key_column.attnum
  where index_namespace.nspname = 'public'
    and index_class.relname = index_name
  group by i.indisunique, i.indpred, i.indrelid;

  if actual_unique is null
     or actual_unique is distinct from expected_unique
     or actual_columns is distinct from expected_columns
     or actual_desc is distinct from expected_desc
     or actual_predicate is distinct from expected_predicate then
    raise exception '% has an unexpected definition: unique=%, columns=%, desc=%, predicate=%',
      index_name, actual_unique, actual_columns, actual_desc, actual_predicate;
  end if;
end
$$;

create or replace function pg_temp.assert_foreign_key_definition(
  constraint_name text,
  source_table regclass,
  source_column text,
  target_table regclass,
  target_column text,
  expected_delete_action "char"
) returns void language plpgsql as $$
declare
  valid_definition boolean;
begin
  select
    c.contype = 'f'
    and c.convalidated
    and c.confrelid = target_table
    and c.confdeltype = expected_delete_action
    and source_attribute.attname = source_column
    and target_attribute.attname = target_column
  into valid_definition
  from pg_constraint c
  join pg_attribute source_attribute
    on source_attribute.attrelid = c.conrelid and source_attribute.attnum = c.conkey[1]
  join pg_attribute target_attribute
    on target_attribute.attrelid = c.confrelid and target_attribute.attnum = c.confkey[1]
  where c.conname = constraint_name
    and c.conrelid = source_table
    and array_length(c.conkey, 1) = 1
    and array_length(c.confkey, 1) = 1;

  if valid_definition is distinct from true then
    raise exception '% has an unexpected foreign-key definition', constraint_name;
  end if;
end
$$;

create or replace function pg_temp.assert_check_definition(
  constraint_name text,
  source_table regclass,
  expected_expression text
) returns void language plpgsql as $$
declare
  actual_expression text;
  is_validated boolean;
begin
  select
    lower(regexp_replace(replace(replace(pg_get_expr(c.conbin, c.conrelid), '::text[]', ''), '::text', ''), '[[:space:]()]', '', 'g')),
    c.convalidated
  into actual_expression, is_validated
  from pg_constraint c
  where c.conname = constraint_name
    and c.conrelid = source_table
    and c.contype = 'c';

  if actual_expression is distinct from expected_expression or is_validated is distinct from true then
    raise exception '% has an unexpected check definition: %', constraint_name, actual_expression;
  end if;
end
$$;

create or replace function pg_temp.assert_column_definition(
  source_table regclass,
  column_name text,
  expected_type text,
  expected_nullable boolean
) returns void language plpgsql as $$
declare
  actual_type text;
  actual_nullable boolean;
begin
  select format_type(a.atttypid, a.atttypmod), not a.attnotnull
  into actual_type, actual_nullable
  from pg_attribute a
  where a.attrelid = source_table
    and a.attname = column_name
    and a.attnum > 0
    and not a.attisdropped;

  if actual_type is distinct from expected_type
     or actual_nullable is distinct from expected_nullable then
    raise exception '%.% has unexpected type/nullability: %, %',
      source_table, column_name, actual_type, actual_nullable;
  end if;
end
$$;

create or replace function pg_temp.assert_payment_action_rpc(
  function_name text,
  expected_arguments text,
  expected_result text
) returns void language plpgsql as $$
declare
  function_oid oid;
  overload_count integer;
  actual_arguments text;
  actual_result text;
  is_security_definer boolean;
  function_config text[];
  public_can_execute boolean;
begin
  select count(*), min(p.oid::bigint)::oid
  into overload_count, function_oid
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = function_name;

  if overload_count <> 1 then
    raise exception '% must have exactly one overload, found %', function_name, overload_count;
  end if;

  select pg_get_function_identity_arguments(p.oid), pg_get_function_result(p.oid),
         p.prosecdef, p.proconfig
  into actual_arguments, actual_result, is_security_definer, function_config
  from pg_proc p where p.oid = function_oid;

  if actual_arguments is distinct from expected_arguments
     or actual_result is distinct from expected_result
     or is_security_definer is distinct from true
     or not ('search_path=public, pg_temp' = any(function_config)) then
    raise exception '% has unexpected signature/result/security/search_path', function_name;
  end if;

  select exists (
    select 1
    from pg_proc p,
      lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    where p.oid = function_oid
      and acl.grantee = 0
      and acl.privilege_type = 'EXECUTE'
  ) into public_can_execute;

  if public_can_execute
     or has_function_privilege('anon', function_oid, 'EXECUTE')
     or has_function_privilege('authenticated', function_oid, 'EXECUTE')
     or not has_function_privilege('service_role', function_oid, 'EXECUTE') then
    raise exception '% has unexpected EXECUTE privileges', function_name;
  end if;
end
$$;

select pg_temp.assert_index_definition(
  'creator_inquiry_quotes_checkout_session_uidx', true,
  array['stripe_checkout_session_id'], array[false],
  'stripe_checkout_session_idisnotnull'
);
select pg_temp.assert_index_definition(
  'creator_inquiry_quotes_payment_intent_uidx', true,
  array['stripe_payment_intent_id'], array[false],
  'stripe_payment_intent_idisnotnull'
);
select pg_temp.assert_index_definition(
  'creator_inquiry_quotes_attempt_token_uidx', true,
  array['checkout_attempt_token'], array[false],
  'checkout_attempt_tokenisnotnull'
);
select pg_temp.assert_index_definition(
  'creator_inquiry_quotes_company_checkout_idx', false,
  array['company_user_id', 'checkout_status', 'updated_at'], array[false, false, true],
  'company_user_idisnotnull'
);
select pg_temp.assert_index_definition(
  'creator_inquiries_company_submission_uidx', true,
  array['company_user_id', 'submission_id'], array[false, false],
  'company_user_idisnotnullandsubmission_idisnotnull'
);
select pg_temp.assert_index_definition(
  'creator_inquiries_anonymous_submission_uidx', true,
  array['link_page_id', 'submission_id'], array[false, false],
  'company_user_idisnullandlink_page_idisnotnullandsubmission_idisnotnull'
);
select pg_temp.assert_index_definition(
  'orders_trendre_link_quote_id_uidx', true,
  array['trendre_link_quote_id'], array[false],
  'trendre_link_quote_idisnotnull'
);
select pg_temp.assert_index_definition(
  'orders_trendre_link_inquiry_id_idx', false,
  array['trendre_link_inquiry_id'], array[false],
  'trendre_link_inquiry_idisnotnull'
);
select pg_temp.assert_index_definition(
  'orders_payment_action_token_uidx', true,
  array['payment_action_token'], array[false],
  'payment_action_tokenisnotnull'
);
select pg_temp.assert_index_definition(
  'orders_payment_action_reconcile_idx', false,
  array['payment_action_state', 'payment_action_updated_at'], array[false, false], ''
);
select pg_temp.assert_index_definition(
  'orders_payment_action_effects_pending_idx', false,
  array['payment_action_effects_completed_at', 'updated_at'], array[false, false], ''
);
select pg_temp.assert_index_definition(
  'orders_payment_action_executing_work_idx', false,
  array['payment_action_state', 'payment_action_reconcile_attempted_at', 'payment_action_updated_at', 'id'],
  array[false, false, false, false], ''
);
select pg_temp.assert_index_definition(
  'orders_payment_action_effects_work_idx', false,
  array['payment_action_effects_completed_at', 'payment_action_effects_attempted_at', 'updated_at', 'id'],
  array[false, false, false, false], ''
);
select pg_temp.assert_index_definition(
  'orders_payment_action_auto_cancel_work_idx', false,
  array['status', 'payment_status', 'payment_action_auto_cancel_attempted_at', 'creator_accept_deadline', 'id'],
  array[false, false, false, false, false], ''
);
select pg_temp.assert_index_definition(
  'notifications_recipient_dedupe_key_uidx', true,
  array['recipient_user_id', 'dedupe_key'], array[false, false],
  'dedupe_keyisnotnull'
);
select pg_temp.assert_index_definition(
  'order_events_dedupe_key_key', true,
  array['dedupe_key'], array[false], ''
);

select pg_temp.assert_foreign_key_definition(
  'orders_trendre_link_inquiry_id_fkey', 'public.orders', 'trendre_link_inquiry_id',
  'public.creator_inquiries', 'id', 'r'
);
select pg_temp.assert_foreign_key_definition(
  'orders_trendre_link_quote_id_fkey', 'public.orders', 'trendre_link_quote_id',
  'public.creator_inquiry_quotes', 'id', 'r'
);

select pg_temp.assert_check_definition(
  'creator_inquiry_quotes_checkout_status_check', 'public.creator_inquiry_quotes',
  'checkout_status=anyarray[''not_started'',''creating'',''open'',''completed'',''expired'',''cancelled'',''failed'',''recovery_required'']'
);
select pg_temp.assert_check_definition(
  'creator_inquiry_quotes_checkout_attempt_count_check', 'public.creator_inquiry_quotes',
  'checkout_attempt_count>=0'
);
select pg_temp.assert_check_definition(
  'creator_inquiry_quotes_checkout_request_check', 'public.creator_inquiry_quotes',
  'checkout_session_requestisnullorjsonb_typeofcheckout_session_request=''object'''
);
select pg_temp.assert_check_definition(
  'orders_trendre_link_reference_pair_check', 'public.orders',
  'trendre_link_inquiry_idisnullandtrendre_link_quote_idisnullortrendre_link_inquiry_idisnotnullandtrendre_link_quote_idisnotnull'
);
select pg_temp.assert_check_definition(
  'orders_trendre_link_origin_check', 'public.orders',
  'trendre_link_quote_idisnullandcreator_menu_idisnotnullortrendre_link_quote_idisnotnullandcreator_menu_idisnull'
);
select pg_temp.assert_check_definition(
  'orders_payment_action_claim_check', 'public.orders',
  'payment_action_typeisnullandpayment_action_tokenisnullandpayment_action_stateisnullandpayment_action_started_atisnullandpayment_action_execution_started_atisnullandpayment_action_updated_atisnullorpayment_action_type=anyarray[''accept'',''decline'',''auto_cancel'']andpayment_action_tokenisnotnullandpayment_action_state=''claimed''andpayment_action_started_atisnotnullandpayment_action_execution_started_atisnullandpayment_action_updated_atisnotnullorpayment_action_type=anyarray[''accept'',''decline'',''auto_cancel'']andpayment_action_tokenisnotnullandpayment_action_state=''executing''andpayment_action_started_atisnotnullandpayment_action_execution_started_atisnotnullandpayment_action_updated_atisnotnull'
);

select pg_temp.assert_column_definition('public.orders', 'payment_action_type', 'text', true);
select pg_temp.assert_column_definition('public.orders', 'payment_action_token', 'uuid', true);
select pg_temp.assert_column_definition('public.orders', 'payment_action_state', 'text', true);
select pg_temp.assert_column_definition('public.orders', 'payment_action_started_at', 'timestamp with time zone', true);
select pg_temp.assert_column_definition('public.orders', 'payment_action_execution_started_at', 'timestamp with time zone', true);
select pg_temp.assert_column_definition('public.orders', 'payment_action_updated_at', 'timestamp with time zone', true);
select pg_temp.assert_column_definition('public.orders', 'payment_action_effects_completed_at', 'timestamp with time zone', true);
select pg_temp.assert_column_definition('public.orders', 'payment_action_reconcile_attempted_at', 'timestamp with time zone', true);
select pg_temp.assert_column_definition('public.orders', 'payment_action_effects_attempted_at', 'timestamp with time zone', true);
select pg_temp.assert_column_definition('public.orders', 'payment_action_auto_cancel_attempted_at', 'timestamp with time zone', true);

select pg_temp.assert_payment_action_rpc(
  'claim_order_payment_action',
  'p_order_id uuid, p_action text, p_claim_token uuid, p_expected_company_user_id uuid, p_expected_amount bigint, p_expected_currency text, p_expected_payment_intent_id text, p_expected_creator_user_id uuid, p_expected_creator_accept_deadline timestamp with time zone',
  'TABLE(claimed boolean, previous_action text, reason text)'
);
select pg_temp.assert_payment_action_rpc(
  'start_order_payment_action_execution',
  'p_order_id uuid, p_action text, p_claim_token uuid, p_expected_company_user_id uuid, p_expected_amount bigint, p_expected_currency text, p_expected_payment_intent_id text, p_expected_creator_user_id uuid, p_expected_creator_accept_deadline timestamp with time zone',
  'TABLE(started boolean, reason text)'
);
select pg_temp.assert_payment_action_rpc(
  'verify_order_payment_action_execution',
  'p_order_id uuid, p_action text, p_claim_token uuid, p_expected_company_user_id uuid, p_expected_amount bigint, p_expected_currency text, p_expected_payment_intent_id text, p_expected_creator_user_id uuid, p_expected_creator_accept_deadline timestamp with time zone',
  'TABLE(authorized boolean, reason text)'
);
select pg_temp.assert_payment_action_rpc(
  'clear_stale_order_payment_action_claims', '', 'TABLE(cleared_count bigint)'
);
select pg_temp.assert_payment_action_rpc(
  'claim_order_payment_action_work',
  'p_work_type text, p_batch_size integer, p_retry_after_seconds integer',
  'TABLE(order_id uuid)'
);
select pg_temp.assert_payment_action_rpc(
  'finalize_order_payment_action',
  'p_order_id uuid, p_action text, p_claim_token uuid, p_outcome text, p_cancel_action text, p_stripe_status text, p_expected_company_user_id uuid, p_expected_amount bigint, p_expected_currency text, p_expected_payment_intent_id text, p_expected_creator_user_id uuid, p_expected_creator_accept_deadline timestamp with time zone',
  'TABLE(finalized boolean, reason text)'
);
select pg_temp.assert_check_definition(
  'order_events_dedupe_key_length_check', 'public.order_events',
  'dedupe_keyisnullorlengthdedupe_key>=1andlengthdedupe_key<=200'
);

-- ---------------------------------------------------------------------------
-- 4. Documentation
-- ---------------------------------------------------------------------------

comment on column public.creator_inquiry_quotes.checkout_status is
  'Stripe Checkout lifecycle for an accepted Trendre Link quote.';

comment on column public.creator_inquiry_quotes.checkout_attempt_count is
  'Incremented whenever a new Stripe Checkout attempt is started.';

comment on column public.creator_inquiry_quotes.checkout_attempt_token is
  'Stable UUID used to reuse the same Stripe idempotency key after an ambiguous result.';

comment on column public.creator_inquiry_quotes.checkout_session_request is
  'Exact server-generated Stripe Checkout request reused for the active attempt.';

comment on column public.creator_inquiries.submission_id is
  'Client-generated UUID used for idempotent public Creator Link inquiry submission.';

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

comment on column public.orders.creator_menu_id is
  'Creator menu for menu checkout orders. NULL only for orders originating from an accepted Trendre Link quote.';

comment on column public.orders.payment_action_token is
  'Short-lived exclusive lease token for Stripe capture/cancel reconciliation.';

comment on column public.orders.payment_action_type is
  'Claimed manual-capture action: accept, decline, or auto_cancel.';

comment on column public.orders.payment_action_started_at is
  'Database timestamp used to reclaim an abandoned Stripe action lease after two minutes.';

comment on column public.orders.payment_action_reconcile_attempted_at is
  'Latest atomic reconciler claim for an executing payment action; used for fair retry rotation.';

comment on column public.orders.payment_action_effects_attempted_at is
  'Latest atomic claim for terminal payment-action side-effect repair.';

comment on column public.orders.payment_action_auto_cancel_attempted_at is
  'Latest atomic claim for deadline-based uncaptured PaymentIntent cancellation.';

comment on column public.order_events.dedupe_key is
  'Optional idempotency key for repairable order audit events.';

comment on column public.notifications.dedupe_key is
  'Optional per-recipient idempotency key. Non-NULL values are unique for each recipient.';

commit;
