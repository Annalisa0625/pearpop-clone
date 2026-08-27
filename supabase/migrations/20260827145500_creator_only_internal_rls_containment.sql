-- C-only follow-up hardening. Browser privileges on these internal tables were
-- already revoked by creator_only_security_hardening. Enable RLS as a second
-- defense layer while preserving service_role access (service_role BYPASSRLS).

revoke all privileges on table public.admin_request_meta from anon, authenticated;
revoke all privileges on table public.chats from anon, authenticated;
revoke all privileges on table public.danger_message_flags from anon, authenticated;
revoke all privileges on table public.messages from anon, authenticated;
revoke all privileges on table public.requests from anon, authenticated;
revoke all privileges on table public.signup_requests from anon, authenticated;
revoke all privileges on table public.signup_tokens from anon, authenticated;
revoke all privileges on table public.user_statuses from anon, authenticated;

alter table public.admin_request_meta enable row level security;
alter table public.chats enable row level security;
alter table public.danger_message_flags enable row level security;
alter table public.messages enable row level security;
alter table public.requests enable row level security;
alter table public.signup_requests enable row level security;
alter table public.signup_tokens enable row level security;
alter table public.user_statuses enable row level security;
