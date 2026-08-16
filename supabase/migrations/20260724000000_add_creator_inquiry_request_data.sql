-- Structured request details submitted from the public quote request form.

alter table public.creator_inquiries
  add column if not exists request_data jsonb not null default '{}'::jsonb;

alter table public.creator_inquiries
  drop constraint if exists creator_inquiries_request_data_object_check;

alter table public.creator_inquiries
  add constraint creator_inquiries_request_data_object_check
  check (jsonb_typeof(request_data) = 'object');

comment on column public.creator_inquiries.request_data is
  'Structured request details such as campaign goal, content formats, deliverable count, usage rights, and reference URLs.';
