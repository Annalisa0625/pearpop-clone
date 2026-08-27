import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260827132032_creator_only_security_hardening.sql",
  "utf8",
);

test("creator-only hardening enables RLS and replaces broad policies with owner policies", () => {
  for (const table of ["creators", "profiles", "creator_social_accounts", "user_suspensions"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
  for (const policy of ["creators_select_all_dev", "profiles_company_select_public_creators"]) {
    assert.match(migration, new RegExp(`drop policy if exists .*${policy}`, "i"));
  }
  assert.match(migration, /from pg_policies[\s\S]*tablename = 'creators'/i);
  assert.match(migration, /from pg_policies[\s\S]*tablename = 'profiles'/i);
  for (const policy of ["creators_select_owner", "creators_update_owner", "profiles_select_owner", "profiles_insert_owner", "profiles_update_owner", "creator_social_accounts_select_owner", "creator_social_accounts_insert_owner", "creator_social_accounts_update_owner", "creator_social_accounts_delete_owner", "user_suspensions_select_owner"]) {
    assert.match(migration, new RegExp(`create policy ${policy}`, "i"));
  }
});

test("creator-only hardening denies broad browser table access while preserving required owner grants", () => {
  const socialSection = migration.slice(
    migration.indexOf("alter table public.creator_social_accounts"),
    migration.indexOf("alter table public.user_suspensions"),
  );
  assert.doesNotMatch(migration, /grant select on table public\.creators to authenticated/i);
  assert.doesNotMatch(migration, /grant update on table public\.creators to authenticated/i);
  assert.doesNotMatch(migration, /grant (all|select|insert|update|delete).*public\.creators.*to anon/i);
  assert.match(migration, /grant select \([\s\S]*approval_status[\s\S]*\) on table public\.creators to authenticated/i);
  assert.match(migration, /grant update \([\s\S]*is_public[\s\S]*\) on table public\.creators to authenticated/i);
  assert.match(migration, /grant select \(id, username\) on table public\.profiles to authenticated/i);
  assert.match(migration, /grant update \(\s*id, category, avatar_url/i);
  assert.match(socialSection, /revoke all privileges on table public\.creator_social_accounts from anon, authenticated/i);
  assert.doesNotMatch(socialSection, /grant update on table public\.creator_social_accounts to authenticated/i);
  assert.doesNotMatch(socialSection, /grant insert on table public\.creator_social_accounts to authenticated/i);
  assert.doesNotMatch(socialSection, /grant update \(/i);
  assert.match(socialSection, /grant select \([\s\S]*creator_id[\s\S]*created_at[\s\S]*\) on table public\.creator_social_accounts to authenticated/i);
  assert.match(socialSection, /grant insert \([\s\S]*creator_id[\s\S]*audience_country[\s\S]*\) on table public\.creator_social_accounts to authenticated/i);
  assert.match(socialSection, /grant delete on table public\.creator_social_accounts to authenticated/i);
  assert.match(migration, /revoke all privileges on table public\.user_suspensions from anon, authenticated/i);
});

test("creator-only hardening removes C-only public browsing and internal table access", () => {
  assert.match(migration, /drop policy if exists public_active_creator_menus_select/i);
  assert.match(migration, /drop policy if exists public_creator_portfolio_assets_select/i);
  for (const table of ["admin_request_meta", "chats", "danger_message_flags", "messages", "requests", "signup_requests", "signup_tokens", "user_statuses", "public_profiles"]) {
    assert.match(migration, new RegExp(`revoke all privileges on table public\\.${table} from anon, authenticated`, "i"));
  }
});

test("creator-only hardening makes every sensitive RPC service-role-only", () => {
  for (const fn of ["complete_creator_signup", "create_app_notification", "enqueue_line_delivery_for_notification", "get_payout_ready_creator_ids", "is_creator_link_slug_available", "mark_chat_read", "seed_creator_link_inquiry_types"]) {
    assert.match(migration, new RegExp(`revoke execute on function public\\.${fn}`, "i"));
    assert.match(migration, new RegExp(`grant execute on function public\\.${fn}`, "i"));
  }
  assert.doesNotMatch(migration, /grant execute on function[\s\S]*?to (anon|authenticated)/i);
});
