-- Follow-up for the already-applied C-only hardening migration. PostgREST
-- requires SELECT privilege on the columns used by INSERT .. ON CONFLICT DO
-- UPDATE, so permit only the Profile UPSERT payload columns below.
grant select (
  category,
  avatar_url,
  is_public,
  public_profile_completed,
  onboarding_completed,
  updated_at
) on table public.profiles to authenticated;
