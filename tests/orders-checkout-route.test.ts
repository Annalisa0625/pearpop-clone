import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  __setCheckoutServerDepsLoaderForTests,
  POST,
} from "../app/api/orders/checkout/route.ts";
import { buildCheckoutPayloadFingerprint } from "../lib/orders/checkout-idempotency.ts";

const userId = "11111111-1111-4111-8111-111111111111";
const attemptId = "22222222-2222-4222-8222-222222222222";
const creatorId = "creator-1";
const creatorUserId = "33333333-3333-4333-8333-333333333333";
const menuId = "menu-1";

const body = {
  checkout_attempt_id: attemptId,
  creator_id: creatorId,
  creator_menu_id: menuId,
  project_type: "provided_assets",
  product_name: "Current campaign",
  free_offer_detail: null,
  product_url: "https://example.test/product",
  deadline: null,
  requirements: "Use the supplied image in your sponsored post.",
  has_free_offer: false,
  wants_secondary_use: false,
  pr_account: "trendmart",
  pr_hashtags: ["trendmart"],
  post_notes: null,
  reference_assets: [
    {
      storage_path: `order-drafts/${userId}/asset.png`,
      file_name: "asset.png",
      file_type: "image",
      mime_type: "image/png",
      size_bytes: 100,
      sort_order: 0,
    },
  ],
};

const fingerprint = buildCheckoutPayloadFingerprint({
  creatorId,
  creatorMenuId: menuId,
  projectType: body.project_type,
  productName: body.product_name,
  freeOfferDetail: body.free_offer_detail,
  productUrl: body.product_url,
  deadline: body.deadline,
  requirements: body.requirements,
  hasFreeOffer: body.has_free_offer,
  wantsSecondaryUse: body.wants_secondary_use,
  prAccount: body.pr_account,
  prHashtags: body.pr_hashtags,
  postNotes: body.post_notes,
  referenceAssets: body.reference_assets,
});

function existingOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-existing",
    b_user_id: userId,
    creator_id: creatorId,
    creator_user_id: creatorUserId,
    creator_menu_id: menuId,
    stripe_customer_id: "cus_snapshot",
    stripe_checkout_session_id: null,
    currency: "JPY",
    menu_price_amount: 7000,
    stripe_amount: 7350,
    buyer_marketplace_fee_rate_bps: 500,
    buyer_marketplace_fee_amount: 350,
    buyer_total_amount: 7350,
    creator_transaction_fee_rate_bps: 1500,
    creator_transaction_fee_amount: 1050,
    creator_payout_amount: 5950,
    platform_gross_revenue_amount: 1400,
    menu_title_snapshot: "Snapshot menu",
    menu_description_snapshot: "Snapshot description",
    payout_method: "manual_bank_transfer",
    project_type: "provided_assets",
    fulfillment_type: "material_provided",
    preparation_status: "materials_provided",
    metadata: { checkout_payload_fingerprint: fingerprint },
    ...overrides,
  };
}

function makeRouteMock(options: {
  orderLookups?: Array<Record<string, unknown> | null>;
  insertError?: Record<string, unknown> | null;
  insertOrderId?: string;
  retrievedSession?: Record<string, unknown> | null;
}) {
  const calls = {
    orderInserts: 0,
    orderUpdates: 0,
    assetInserts: 0,
    sessionCreates: [] as Array<{ params: any; options: any }>,
    sessionRetrieves: [] as string[],
  };
  const orderLookups = [...(options.orderLookups ?? [null])];

  const resultFor = (table: string, operation: string) => {
    if (table === "user_roles") return { data: { role: "company" }, error: null };
    if (table === "user_suspensions") return { data: [], error: null };
    if (table === "companies") {
      return {
        data: {
          company_name: "Buyer Co",
          contact_email: "buyer@example.test",
          approval_status: "approved",
          created_at: "2026-09-01T00:00:00.000Z",
        },
        error: null,
      };
    }
    if (table === "user_states") {
      if (operation === "upsert") return { data: null, error: null };
      return {
        data: {
          company_profile_completed: true,
          company_access_status: "approved",
          company_plan_code: "free",
          company_subscription_status: "active",
          monthly_request_limit: null,
          monthly_request_used: 0,
          stripe_customer_id: "cus_current",
        },
        error: null,
      };
    }
    if (table === "creators") {
      return {
        data: {
          id: creatorId,
          user_id: creatorUserId,
          approval_status: "approved",
          is_public: true,
          stripe_account_id: null,
          stripe_onboarding_completed: false,
        },
        error: null,
      };
    }
    if (table === "creator_payout_profiles") {
      return { data: { payout_method: "manual_bank_transfer", status: "verified" }, error: null };
    }
    if (table === "creator_menus") {
      return {
        data: {
          id: menuId,
          creator_id: creatorId,
          title: "Current menu",
          description: "Current description",
          price: 1000,
          currency: "JPY",
          is_active: true,
          allow_secondary_use: false,
        },
        error: null,
      };
    }
    if (table === "orders") {
      if (operation === "lookup") return { data: orderLookups.shift() ?? null, error: null };
      if (operation === "insert") {
        calls.orderInserts += 1;
        return options.insertError
          ? { data: null, error: options.insertError }
          : { data: { id: options.insertOrderId ?? "order-new" }, error: null };
      }
      if (operation === "update") {
        calls.orderUpdates += 1;
        return { data: null, error: null };
      }
    }
    if (table === "order_reference_assets") {
      if (operation === "insert") calls.assetInserts += 1;
      return { data: operation === "lookup" ? [] : null, error: null };
    }
    return { data: null, error: null };
  };

  const supabaseAdmin = {
    auth: { getUser: async () => ({ data: { user: { id: userId, email: "buyer@example.test" } }, error: null }) },
    from(table: string) {
      let operation = table === "orders" ? "lookup" : table === "order_reference_assets" ? "lookup" : "select";
      const builder: any = {
        select() { return builder; },
        eq() { return builder; },
        limit() { return builder; },
        maybeSingle() { return Promise.resolve(resultFor(table, operation)); },
        insert() { operation = "insert"; return builder; },
        update() { operation = "update"; return builder; },
        upsert() { operation = "upsert"; return Promise.resolve(resultFor(table, operation)); },
        single() { return Promise.resolve(resultFor(table, operation)); },
        then(resolve: any, reject: any) { return Promise.resolve(resultFor(table, operation)).then(resolve, reject); },
      };
      return builder;
    },
  };

  const stripe = {
    customers: {
      retrieve: async () => ({ id: "cus_current", metadata: { supabase_user_id: userId } }),
      list: async () => ({ data: [{ id: "cus_current", metadata: { supabase_user_id: userId } }] }),
      create: async () => ({ id: "cus_created" }),
    },
    checkout: {
      sessions: {
        retrieve: async (id: string) => {
          calls.sessionRetrieves.push(id);
          return options.retrievedSession;
        },
        create: async (params: any, requestOptions: any) => {
          calls.sessionCreates.push({ params, options: requestOptions });
          return { id: "cs_created", url: "https://checkout.stripe.com/c/test" };
        },
      },
    },
  };

  __setCheckoutServerDepsLoaderForTests(async () => ({
    supabaseAdmin,
    getStripe: () => stripe,
    getBaseUrl: () => "https://app.example.test",
    calculateOrderFees: () => ({
      menuPriceAmount: 1000,
      buyerPlanCodeSnapshot: "free",
      buyerPlanPublicNameSnapshot: "free",
      buyerMarketplaceFeeRateBps: 2000,
      buyerMarketplaceFeeAmount: 200,
      buyerTotalAmount: 1200,
      creatorTransactionFeeRateBps: 1500,
      creatorTransactionFeeAmount: 150,
      creatorPayoutAmount: 850,
      platformGrossRevenueAmount: 350,
    }),
    normalizeInternalPlanCode: (value) => value ?? "free",
  }));

  return calls;
}

async function postCheckout(payload = body) {
  return POST(new Request("https://app.example.test/api/orders/checkout", {
    method: "POST",
    headers: { authorization: "Bearer test", "content-type": "application/json" },
    body: JSON.stringify(payload),
  }) as never);
}

afterEach(() => __setCheckoutServerDepsLoaderForTests());

test("route creates one new order and one initial Checkout Session", async () => {
  const calls = makeRouteMock({ orderLookups: [null], insertOrderId: "order-new" });
  const response = await postCheckout();
  const json = await response.json();

  assert.equal(response.status, 200);
  assert.equal(json.order_id, "order-new");
  assert.equal(json.checkout_session_id, "cs_created");
  assert.equal(calls.orderInserts, 1);
  assert.equal(calls.sessionCreates.length, 1);
  assert.equal(calls.sessionCreates[0].options.idempotencyKey, "trendmart_checkout:order-new:initial");
});

test("route reuses an open Session without an order insert or Session create", async () => {
  const order = existingOrder({ stripe_checkout_session_id: "cs_open" });
  const calls = makeRouteMock({ orderLookups: [order], retrievedSession: { id: "cs_open", status: "open", url: "https://checkout.stripe.com/c/open" } });
  const response = await postCheckout();
  const json = await response.json();

  assert.equal(response.status, 200);
  assert.equal(json.url, "https://checkout.stripe.com/c/open");
  assert.equal(calls.orderInserts, 0);
  assert.equal(calls.sessionCreates.length, 0);
});

test("route recovers 23505 with the existing Order snapshot", async () => {
  const order = existingOrder();
  const calls = makeRouteMock({ orderLookups: [null, order], insertError: { code: "23505" } });
  const response = await postCheckout();
  const json = await response.json();
  const created = calls.sessionCreates[0];

  assert.equal(response.status, 200);
  assert.equal(json.order_id, order.id);
  assert.equal(calls.orderInserts, 1);
  assert.equal(created.options.idempotencyKey, `trendmart_checkout:${order.id}:initial`);
  assert.equal(created.params.customer, "cus_snapshot");
  assert.equal(created.params.line_items[0].price_data.unit_amount, 7000);
  assert.equal(created.params.line_items[0].price_data.product_data.name, "Snapshot menu");
  assert.equal(created.params.payment_intent_data.metadata.buyer_total_amount, "7350");
});

test("route rejects a payload mismatch before Stripe or asset side effects", async () => {
  const order = existingOrder({ metadata: { checkout_payload_fingerprint: "different" }, stripe_checkout_session_id: "cs_open" });
  const calls = makeRouteMock({ orderLookups: [order] });
  const response = await postCheckout();
  const json = await response.json();

  assert.equal(response.status, 409);
  assert.equal(json.code, "checkout_attempt_payload_mismatch");
  assert.equal(calls.sessionRetrieves.length, 0);
  assert.equal(calls.sessionCreates.length, 0);
  assert.equal(calls.assetInserts, 0);
  assert.equal(calls.orderUpdates, 0);
});

test("route retries a sessionless Order with its initial key", async () => {
  const order = existingOrder();
  const calls = makeRouteMock({ orderLookups: [order] });
  const response = await postCheckout();

  assert.equal(response.status, 200);
  assert.equal(calls.orderInserts, 0);
  assert.equal(calls.sessionCreates[0].options.idempotencyKey, `trendmart_checkout:${order.id}:initial`);
});

test("route rejects a completed Session without creating another", async () => {
  const order = existingOrder({ stripe_checkout_session_id: "cs_complete" });
  const calls = makeRouteMock({ orderLookups: [order], retrievedSession: { id: "cs_complete", status: "complete", url: null } });
  const response = await postCheckout();
  const json = await response.json();

  assert.equal(response.status, 409);
  assert.equal(json.code, "checkout_already_completed");
  assert.equal(calls.orderInserts, 0);
  assert.equal(calls.sessionCreates.length, 0);
});

test("route replaces an expired Session from the existing Order snapshot", async () => {
  const order = existingOrder({ stripe_checkout_session_id: "cs_expired" });
  const calls = makeRouteMock({ orderLookups: [order], retrievedSession: { id: "cs_expired", status: "expired", url: null } });
  const response = await postCheckout();
  const created = calls.sessionCreates[0];

  assert.equal(response.status, 200);
  assert.equal(calls.orderInserts, 0);
  assert.equal(created.options.idempotencyKey, `trendmart_checkout:${order.id}:after:cs_expired`);
  assert.equal(created.params.line_items[0].price_data.unit_amount, 7000);
  assert.equal(created.params.line_items[0].price_data.product_data.name, "Snapshot menu");
});
