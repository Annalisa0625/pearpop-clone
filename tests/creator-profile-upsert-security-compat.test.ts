import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260827140024_creator_profile_upsert_security_compat.sql",
  "utf8",
);

test("profile upsert compatibility adds only the required authenticated SELECT columns", () => {
  assert.doesNotMatch(migration, /row level security|disable row level security|drop policy/i);
  assert.doesNotMatch(migration, /to anon/i);
  assert.doesNotMatch(migration, /grant select\s+on table public\.profiles to authenticated/i);

  const selectGrant = migration.match(
    /grant select\s*\(([\s\S]*?)\)\s*on table public\.profiles to authenticated/i,
  )?.[1];
  assert.ok(selectGrant);

  for (const column of [
    "category",
    "avatar_url",
    "is_public",
    "public_profile_completed",
    "onboarding_completed",
    "updated_at",
  ]) {
    assert.match(selectGrant, new RegExp(`\\b${column}\\b`));
  }

  for (const column of [
    "is_suspended",
    "suspend_reason",
    "suspend_level",
    "suspended_at",
    "bio",
    "instagram_url",
    "tiktok_url",
    "youtube_url",
    "created_at",
  ]) {
    assert.doesNotMatch(selectGrant, new RegExp(`\\b${column}\\b`));
  }
});
