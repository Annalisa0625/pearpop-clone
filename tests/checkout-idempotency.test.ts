import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCheckoutPayloadFingerprint,
  checkoutAttemptMatchesOrder,
  getCheckoutSessionIdempotencyKey,
  getExistingCheckoutSessionAction,
  isCheckoutAttemptUniqueViolation,
  normalizeCheckoutAttemptId,
} from "../lib/orders/checkout-idempotency.ts";

const attemptId = "dc7e01f1-1a70-4ccd-8e73-639aeb2d8613";
const orderId = "order-123";
const expiredSessionId = "cs_expired_123";

const payload = {
  creatorId: "creator-1",
  creatorMenuId: "menu-1",
  projectType: "provided_assets",
  productName: "Campaign",
  freeOfferDetail: null,
  productUrl: "https://example.test/product",
  deadline: null,
  requirements: "Use the supplied product image in the post.",
  hasFreeOffer: false,
  wantsSecondaryUse: false,
  prAccount: "trendmart",
  prHashtags: ["ad", "trendmart"],
  postNotes: null,
  referenceAssets: [
    {
      storage_path: "order-drafts/user/a.png",
      file_name: "a.png",
      file_type: "image",
      mime_type: "image/png",
      size_bytes: 100,
      sort_order: 0,
    },
    {
      storage_path: "order-drafts/user/b.png",
      file_name: "b.png",
      file_type: "image",
      mime_type: "image/png",
      size_bytes: 200,
      sort_order: 1,
    },
  ],
};

test("a valid checkout attempt ID is stable across retries", () => {
  assert.equal(normalizeCheckoutAttemptId(attemptId), attemptId);
  assert.equal(normalizeCheckoutAttemptId(attemptId), attemptId);
});

test("a different attempt ID represents a new logical checkout", () => {
  const anotherAttemptId = "2730c9b8-243a-4ee9-b3ce-a5e94c5cce16";
  assert.notEqual(
    normalizeCheckoutAttemptId(anotherAttemptId),
    normalizeCheckoutAttemptId(attemptId)
  );
});

test("invalid checkout attempt IDs are rejected", () => {
  assert.equal(normalizeCheckoutAttemptId(""), null);
  assert.equal(normalizeCheckoutAttemptId("not-a-uuid"), null);
});

test("the same normalized payload has a stable fingerprint regardless of input asset array order", () => {
  assert.equal(
    buildCheckoutPayloadFingerprint(payload),
    buildCheckoutPayloadFingerprint({
      ...payload,
      referenceAssets: [...payload.referenceAssets].reverse(),
    })
  );
});

test("a changed checkout payload has a different fingerprint", () => {
  assert.notEqual(
    buildCheckoutPayloadFingerprint(payload),
    buildCheckoutPayloadFingerprint({ ...payload, productName: "Different campaign" })
  );
});

test("a unique violation identifies the concurrent insert recovery path", () => {
  assert.equal(isCheckoutAttemptUniqueViolation({ code: "23505" }), true);
  assert.equal(isCheckoutAttemptUniqueViolation({ code: "23503" }), false);
});

test("the same attempt may only reuse the same creator and menu", () => {
  const order = { creator_id: "creator-1", creator_menu_id: "menu-1" };
  assert.equal(checkoutAttemptMatchesOrder(order, "creator-1", "menu-1"), true);
  assert.equal(checkoutAttemptMatchesOrder(order, "creator-2", "menu-1"), false);
  assert.equal(checkoutAttemptMatchesOrder(order, "creator-1", "menu-2"), false);
});

test("an initial checkout session key is deterministic after a timeout", () => {
  assert.equal(
    getCheckoutSessionIdempotencyKey(orderId, null),
    "trendmart_checkout:order-123:initial"
  );
});

test("an expired session uses one deterministic replacement key", () => {
  assert.equal(
    getCheckoutSessionIdempotencyKey(orderId, expiredSessionId),
    "trendmart_checkout:order-123:after:cs_expired_123"
  );
});

test("an open Checkout Session is reused without creation", () => {
  assert.equal(
    getExistingCheckoutSessionAction({ status: "open", url: "https://checkout.stripe.com/c/pay/test" }),
    "reuse_open"
  );
});

test("a complete Checkout Session is not reopened", () => {
  assert.equal(
    getExistingCheckoutSessionAction({ status: "complete", url: null }),
    "already_completed"
  );
});

test("an expired Checkout Session is replaced on the same order", () => {
  assert.equal(
    getExistingCheckoutSessionAction({ status: "expired", url: null }),
    "replace_expired"
  );
});
