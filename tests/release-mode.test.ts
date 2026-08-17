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

test("C-only blocks Marketplace pages while allowing the Creator inquiry inbox", () => {
  for (const path of [
    "/home",
    "/for-companies",
    "/signup/company",
    "/signup/complete",
    "/b/dashboard",
    "/company/quote-access/activate",
    "/creator/accepted/request-id",
    "/creator/chats/chat-id",
    "/creator/jobs",
    "/creator/menus/new",
    "/creator/payouts",
    "/creator/requests/request-id",
    "/creator/orders/ORDER_ID",
    "/creator/orders/ORDER_ID/chat",
  ]) {
    assert.equal(isCreatorOnlyBlockedPagePath(path), true, path);
  }
  for (const path of [
    "/",
    "/for-creators",
    "/signup/creator",
    "/creator/dashboard",
    "/creator/link",
    "/creator/profile",
    "/creator/orders",
    "/creator/orders/inquiries/INQUIRY_ID",
    "/in/test",
    "/terms",
    "/admin",
  ]) {
    assert.equal(isCreatorOnlyBlockedPagePath(path), false, path);
  }
});

test("C-only blocks Marketplace, payment, generic signup, and formal quote APIs", () => {
  for (const path of [
    "/api/b/requests/create",
    "/api/company/quotes/a/checkout",
    "/api/requests/create",
    "/api/requests/REQUEST_ID",
    "/api/creator/requests/REQUEST_ID",
    "/api/creator/orders/ORDER_ID/accept",
    "/api/creator/orders/ORDER_ID/decline",
    "/api/creator/orders/ORDER_ID/deliver",
    "/api/creator/orders/ORDER_ID/materials-confirmed",
    "/api/creator/orders/ORDER_ID/received",
    "/api/creator/orders/ORDER_ID/shipping-address",
    "/api/orders/ORDER_ID/chat",
    "/api/orders/ORDER_ID/reference-assets",
    "/api/chats/CHAT_ID/messages",
    "/api/messages/send",
    "/api/creator/connect/onboarding-link",
    "/api/public/inquiries",
    "/api/orders/checkout",
    "/api/stripe/checkout",
    "/api/stripe/webhook",
    "/api/signup/request",
    "/api/signup/complete",
    "/api/creator/orders/inquiries/a/quote",
  ]) {
    assert.equal(isCreatorOnlyBlockedApiPath(path), true, path);
  }
  for (const path of [
    "/api/creator/link/page",
    "/api/creator/link/inquiries",
    "/api/creator/link/inquiries/INQUIRY_ID",
    "/api/public/creator-link/inquiries",
    "/api/notifications",
    "/api/auth/callback",
  ]) {
    assert.equal(isCreatorOnlyBlockedApiPath(path), false, path);
  }
});

test("Marketplace and generic signup paths remain available when C-only is off", () => {
  const releaseIsEnabled = isCreatorOnlyRelease({});
  for (const path of [
    "/creator/orders/ORDER_ID",
    "/creator/orders/ORDER_ID/chat",
    "/api/creator/orders/ORDER_ID/accept",
    "/api/signup/request",
    "/api/signup/complete",
  ]) {
    const blocked = path.startsWith("/api/")
      ? isCreatorOnlyBlockedApiPath(path)
      : isCreatorOnlyBlockedPagePath(path);
    assert.equal(releaseIsEnabled && blocked, false, path);
  }
});
