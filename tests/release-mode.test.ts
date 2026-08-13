import assert from "node:assert/strict";
import test from "node:test";

import {
  isCreatorOnlyBlockedApiPath,
  isCreatorOnlyCompanyResourceActor,
  isCreatorOnlyBlockedPagePath,
  isCreatorOnlyRelease,
} from "../lib/release-mode.ts";

test("only the exact c_only value enables the C-only release gate", () => {
  assert.equal(isCreatorOnlyRelease({}), false);
  assert.equal(isCreatorOnlyRelease({ TRENDRE_RELEASE_MODE: undefined }), false);
  assert.equal(isCreatorOnlyRelease({ TRENDRE_RELEASE_MODE: "marketplace" }), false);
  assert.equal(isCreatorOnlyRelease({ TRENDRE_RELEASE_MODE: "c_only" }), true);
  assert.equal(isCreatorOnlyRelease({ TRENDRE_RELEASE_MODE: "C_ONLY" }), false);
  assert.equal(isCreatorOnlyRelease({ TRENDRE_RELEASE_MODE: "creator_only" }), false);
  assert.equal(isCreatorOnlyRelease({ TRENDRE_RELEASE_MODE: " c_only " }), false);
});

test("C-only blocks only the Company participant of a shared resource", () => {
  const resource = {
    creatorUserId: "creator-user",
    companyUserId: "company-user",
  };
  const cOnly = { TRENDRE_RELEASE_MODE: "c_only" };
  assert.equal(isCreatorOnlyCompanyResourceActor({ actorUserId: "creator-user", ...resource }, cOnly), false);
  assert.equal(isCreatorOnlyCompanyResourceActor({ actorUserId: "company-user", ...resource }, cOnly), true);
  assert.equal(isCreatorOnlyCompanyResourceActor({ actorUserId: "admin-user", ...resource }, cOnly), false);
  assert.equal(isCreatorOnlyCompanyResourceActor({ actorUserId: "company-user", ...resource }, {}), false);
});

test("C-only blocks B pages without blocking Creator and Link pages", () => {
  for (const path of ["/home", "/for-companies", "/signup/company", "/b/dashboard", "/company/quote-access/activate"]) {
    assert.equal(isCreatorOnlyBlockedPagePath(path), true, path);
  }
  for (const path of ["/", "/for-creators", "/signup/creator", "/creator/dashboard", "/in/test", "/terms", "/admin"]) {
    assert.equal(isCreatorOnlyBlockedPagePath(path), false, path);
  }
});

test("C-only blocks B APIs without blocking required Creator and webhook APIs", () => {
  for (const path of ["/api/b/requests/create", "/api/company/quotes/a/checkout", "/api/requests/create", "/api/public/inquiries", "/api/orders/checkout", "/api/stripe/checkout"]) {
    assert.equal(isCreatorOnlyBlockedApiPath(path), true, path);
  }
  for (const path of ["/api/creator/link/page", "/api/public/creator-link/inquiries", "/api/notifications", "/api/stripe/webhook", "/api/auth/callback"]) {
    assert.equal(isCreatorOnlyBlockedApiPath(path), false, path);
  }
});
