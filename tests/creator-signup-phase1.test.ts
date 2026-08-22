import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(process.cwd());
const api = readFileSync(resolve(root, "app/api/signup/complete-creator/route.ts"), "utf8");
const client = readFileSync(resolve(root, "app/signup/creator/SignupCreatorClient.tsx"), "utf8");
const migration = readFileSync(
  resolve(root, "supabase/migrations/20260822105903_add_atomic_creator_signup_completion.sql"),
  "utf8"
);

test("Creator completion API delegates application writes to the atomic RPC", () => {
  assert.match(api, /rpc\("complete_creator_signup"/);
  assert.doesNotMatch(api, /\.from\("creators"\)\s*\.insert/);
  assert.doesNotMatch(api, /\.from\("profiles"\)\s*\.upsert/);
  assert.doesNotMatch(api, /\.from\("creator_portfolio_assets"\)\s*\.insert/);
  assert.doesNotMatch(api, /\.from\("creator_social_accounts"\)\s*\.insert/);
  assert.doesNotMatch(api, /\.from\("creator_menus"\)\s*\.insert/);
});

test("Creator completion maps the company conflict and only derives Auth metadata after winning", () => {
  assert.match(api, /COMPANY_ACCOUNT_CONFLICT/);
  assert.match(api, /USERNAME_CONFLICT/);
  assert.match(api, /status === "company_conflict"/);
  const rpcCall = api.indexOf('rpc("complete_creator_signup"');
  const metadataUpdate = api.indexOf("updateUserById");
  assert.ok(rpcCall >= 0 && metadataUpdate > rpcCall);
  assert.match(api, /status === "already_completed"/);
});

test("Creator signup keeps incomplete shared Creator accounts in the completion flow", () => {
  assert.match(client, /if \(userState\?\.creator_profile_completed\) \{/);
  assert.match(client, /Only the user-state marker means completion/);
  assert.doesNotMatch(client, /router\.replace\("\/creator\/profile\?start=trend-mart"\)/);
  assert.match(client, /companyAccountConflict/);
});

test("atomic completion migration serializes the user and protects completed accounts", () => {
  assert.match(migration, /pg_advisory_xact_lock\(hashtextextended\(p_user_id::text, 0\)\)/);
  const lock = migration.indexOf("pg_advisory_xact_lock");
  const completed = migration.indexOf("if coalesce(v_completed, false)");
  const company = migration.indexOf("role_row.role = 'company'");
  assert.ok(lock >= 0 && completed > lock && company > completed);
  assert.match(migration, /'already_completed'::text/);
});

test("atomic completion replaces incomplete collections before setting the completion marker", () => {
  for (const table of [
    "creator_portfolio_assets",
    "creator_social_accounts",
    "creator_menus",
  ]) {
    assert.match(migration, new RegExp(`delete from public\\.${table}`));
  }
  const menus = migration.indexOf("delete from public.creator_menus");
  const marker = migration.indexOf("creator_profile_completed = true");
  assert.ok(menus >= 0 && marker > menus);
});

test("atomic completion RPC is executable only by service_role", () => {
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = pg_catalog, public/);
  assert.match(migration, /revoke all on function public\.complete_creator_signup\(uuid, jsonb\) from public/);
  assert.match(migration, /revoke all on function public\.complete_creator_signup\(uuid, jsonb\) from anon/);
  assert.match(migration, /revoke all on function public\.complete_creator_signup\(uuid, jsonb\) from authenticated/);
  assert.match(migration, /grant execute on function public\.complete_creator_signup\(uuid, jsonb\) to service_role/);
});
