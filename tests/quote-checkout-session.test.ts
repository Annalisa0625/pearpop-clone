import assert from "node:assert/strict";
import test from "node:test";
import type Stripe from "stripe";

import {
  checkoutIdempotencyKey,
  checkoutEmailHash,
  parseStoredCheckoutRequest,
  validateTrendreLinkCheckoutSession,
  validateTrendreLinkPaymentIntent,
  type StoredTrendreLinkCheckoutRequest,
} from "../lib/trendre-link/quote-checkout-session.ts";

const identity = {
  quoteId: "11111111-1111-4111-8111-111111111111",
  inquiryId: "22222222-2222-4222-8222-222222222222",
  companyUserId: "33333333-3333-4333-8333-333333333333",
  creatorUserId: "44444444-4444-4444-8444-444444444444",
};
const customerEmail = "billing@example.com";
const customerEmailHash = checkoutEmailHash(customerEmail);

const metadata = {
  source: "trendre_link_quote",
  trendre_link_quote_id: identity.quoteId,
  trendre_link_inquiry_id: identity.inquiryId,
  supabase_user_id: identity.companyUserId,
  b_user_id: identity.companyUserId,
  creator_user_id: identity.creatorUserId,
  checkout_customer_email_sha256: customerEmailHash,
};

function request(): StoredTrendreLinkCheckoutRequest {
  return {
    mode: "payment",
    customer: "cus_company",
    client_reference_id: identity.quoteId,
    payment_method_types: ["card"],
    line_items: [{
      price_data: { currency: "jpy", unit_amount: 12_000, product_data: { name: "Quote" } },
      quantity: 1,
    }],
    payment_intent_data: { capture_method: "manual", metadata },
    metadata,
    success_url: `https://preview.example/b/quotes/${identity.quoteId}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `https://preview.example/b/quotes/${identity.quoteId}?checkout=cancelled`,
    allow_promotion_codes: false,
    expires_at: 1_800_000_000,
  };
}

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: "cs_quote",
    mode: "payment",
    client_reference_id: identity.quoteId,
    metadata,
    customer: "cus_company",
    amount_total: 12_000,
    currency: "jpy",
    status: "open",
    payment_status: "unpaid",
    payment_intent: null,
    customer_email: null,
    customer_details: null,
    url: "https://checkout.stripe.test/session",
    ...overrides,
  } as unknown as Stripe.Checkout.Session;
}

test("保存したSession requestを同じattempt tokenとidempotency keyで再利用する", async () => {
  const token = "55555555-5555-4555-8555-555555555555";
  const key = checkoutIdempotencyKey(identity.quoteId, token);
  assert.equal(key, checkoutIdempotencyKey(identity.quoteId, token));
  assert.deepEqual(
    parseStoredCheckoutRequest(request(), { ...identity, amountTotal: 12_000, currency: "JPY", customerEmailHash }),
    request()
  );

  const stripeObjects = new Map<string, Stripe.Checkout.Session>();
  let created = 0;
  async function mockCreate(idempotencyKey: string) {
    const existing = stripeObjects.get(idempotencyKey);
    if (existing) return existing;
    created += 1;
    const value = session();
    stripeObjects.set(idempotencyKey, value);
    return value;
  }

  await assert.rejects(async () => {
    await mockCreate(key);
    throw new Error("stripe_checkout_result_unknown");
  });
  const recovered = await mockCreate(key);
  assert.equal(recovered.id, "cs_quote");
  assert.equal(created, 1);
});

test("既存Sessionはmetadata・customer・金額・通貨・状態を完全照合する", () => {
  const expected = {
    ...identity,
    sessionId: "cs_quote",
    customerId: "cus_company",
    amountTotal: 12_000,
    currency: "JPY",
    customerEmailHash,
    allowedStatuses: ["open"] as Array<"open">,
  };
  assert.equal(validateTrendreLinkCheckoutSession(session(), expected), null);
  for (const [field, value, reason] of [
    ["metadata", { ...metadata, b_user_id: "other" }, "session_metadata_mismatch"],
    ["customer", "cus_other", "session_customer_mismatch"],
    ["amount_total", 1, "session_amount_mismatch"],
    ["currency", "usd", "session_currency_mismatch"],
    ["mode", "setup", "session_mode_mismatch"],
    ["status", "complete", "session_status_mismatch"],
    ["payment_status", "paid", "session_payment_status_mismatch"],
  ] as const) {
    assert.equal(validateTrendreLinkCheckoutSession(session({ [field]: value }), expected), reason);
  }
});

test("不正通貨や改ざんされた保存requestを拒否する", () => {
  assert.equal(
    parseStoredCheckoutRequest(request(), { ...identity, amountTotal: 12_000, currency: "USD", customerEmailHash }),
    null
  );
  assert.equal(
    parseStoredCheckoutRequest({ ...request(), customer: "" }, { ...identity, amountTotal: 12_000, currency: "JPY", customerEmailHash }),
    null
  );
});

test("Sessionにbillingメールがある場合は大文字小文字と空白を正規化して照合する", () => {
  const expected = {
    ...identity,
    sessionId: "cs_quote",
    customerId: "cus_company",
    amountTotal: 12_000,
    currency: "JPY",
    customerEmailHash,
    allowedStatuses: ["open"] as Array<"open">,
  };
  assert.equal(
    validateTrendreLinkCheckoutSession(
      session({ customer_email: " Billing@Example.COM " }),
      expected
    ),
    null
  );
  assert.equal(
    validateTrendreLinkCheckoutSession(
      session({ customer_details: { email: "other@example.com" } }),
      expected
    ),
    "session_customer_email_mismatch"
  );
  assert.equal(validateTrendreLinkCheckoutSession(session(), expected), null);
});

test("PaymentIntentはmanual capture・承認済み状態・metadata・金額・通貨を照合する", () => {
  const base = {
    id: "pi_quote",
    capture_method: "manual",
    status: "requires_capture",
    metadata,
    amount: 12_000,
    currency: "jpy",
  } as unknown as Stripe.PaymentIntent;
  const expected = {
    ...identity,
    paymentIntentId: "pi_quote",
    amount: 12_000,
    currency: "JPY",
  };
  assert.equal(validateTrendreLinkPaymentIntent(base, expected), null);
  assert.equal(
    validateTrendreLinkPaymentIntent(
      { ...base, capture_method: "automatic" } as Stripe.PaymentIntent,
      expected
    ),
    "payment_intent_capture_method_mismatch"
  );
  assert.equal(
    validateTrendreLinkPaymentIntent(
      { ...base, status: "requires_payment_method" } as Stripe.PaymentIntent,
      expected
    ),
    "payment_intent_status_mismatch"
  );
  assert.equal(
    validateTrendreLinkPaymentIntent({ ...base, amount: 1 } as Stripe.PaymentIntent, expected),
    "payment_intent_amount_mismatch"
  );
  assert.equal(
    validateTrendreLinkPaymentIntent({ ...base, currency: "usd" } as Stripe.PaymentIntent, expected),
    "payment_intent_currency_mismatch"
  );
  assert.equal(
    validateTrendreLinkPaymentIntent(
      { ...base, metadata: { ...metadata, creator_user_id: "other" } } as Stripe.PaymentIntent,
      expected
    ),
    "payment_intent_metadata_mismatch"
  );
});
