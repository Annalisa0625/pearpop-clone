import assert from "node:assert/strict";
import test from "node:test";
import type { User } from "@supabase/supabase-js";

import {
  reconcileBearerAndCookieUser,
  resolveCookieAuthenticatedUser,
  SESSION_IDENTITY_ERROR,
} from "../lib/trendre-link/auth-identity.ts";

function user(id: string): User {
  return { id } as User;
}

test("Trendre Link accepts matching bearer and cookie users", () => {
  const result = reconcileBearerAndCookieUser(user("user-a"), user("user-a"));
  assert.equal(result.user?.id, "user-a");
  assert.equal(result.error, null);
});

test("Trendre Link accepts a valid bearer without a cookie session", () => {
  const result = reconcileBearerAndCookieUser(user("user-a"), null);
  assert.equal(result.user?.id, "user-a");
  assert.equal(result.error, null);
});

test("Trendre Link rejects mismatched bearer and cookie users", () => {
  const result = reconcileBearerAndCookieUser(user("user-a"), user("user-b"));
  assert.equal(result.user, null);
  assert.equal(result.error, SESSION_IDENTITY_ERROR);
});

test("Trendre Link rejects an invalid bearer without falling back to the cookie", () => {
  const result = reconcileBearerAndCookieUser(null, user("user-a"));
  assert.equal(result.user, null);
  assert.equal(result.error, SESSION_IDENTITY_ERROR);
});

test("Trendre Link retains cookie authentication when no bearer is supplied", () => {
  const result = resolveCookieAuthenticatedUser(user("user-a"));
  assert.equal(result.user?.id, "user-a");
  assert.equal(result.error, null);
});
