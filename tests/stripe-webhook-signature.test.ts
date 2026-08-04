import assert from "node:assert/strict";
import test from "node:test";
import Stripe from "stripe";
import {
  constructVerifiedStripeEvent,
  handleTrendreLinkWebhookEvent,
} from "../lib/trendre-link/stripe-webhook-service.ts";

test("Stripe Webhook署名が不正なpayloadを拒否する", () => {
  const stripe = new Stripe("sk_test_mock");
  const secret = "whsec_local_test_only";
  const payload = JSON.stringify({
    id: "evt_test",
    type: "checkout.session.completed",
    data: { object: { id: "cs_test" } },
  });
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
  assert.equal(
    constructVerifiedStripeEvent({
      payload,
      signature,
      secret,
      constructEvent: stripe.webhooks.constructEvent.bind(stripe.webhooks),
    }).id,
    "evt_test"
  );
  assert.throws(
    () => constructVerifiedStripeEvent({
      payload: `${payload}tampered`,
      signature,
      secret,
      constructEvent: stripe.webhooks.constructEvent.bind(stripe.webhooks),
    }),
    /signature/i
  );
});

test("検証済みcheckout.session.completedだけがLink注文serviceへ接続される", async () => {
  let calls = 0;
  const session = {
    id: "cs_test",
    object: "checkout.session",
    metadata: { source: "trendre_link_quote" },
  } as unknown as Stripe.Checkout.Session;
  const event = {
    id: "evt_test",
    type: "checkout.session.completed",
    data: { object: session },
  } as Stripe.Event;
  assert.equal(
    await handleTrendreLinkWebhookEvent({
      event,
      createOrder: async () => { calls += 1; },
    }),
    true
  );
  assert.equal(calls, 1);
  assert.equal(
    await handleTrendreLinkWebhookEvent({
      event: { ...event, type: "checkout.session.expired" } as Stripe.Event,
      createOrder: async () => { calls += 1; },
    }),
    false
  );
  assert.equal(calls, 1);
});
