import type Stripe from "stripe";
import { createHash } from "node:crypto";

import { isSafeTrendreLinkCheckoutMetadata } from "./quote-checkout-policy";

export type TrendreLinkCheckoutIdentity = {
  quoteId: string;
  inquiryId: string;
  companyUserId: string;
  creatorUserId: string;
};

export type TrendreLinkCheckoutSessionExpectation =
  TrendreLinkCheckoutIdentity & {
    sessionId: string;
    customerId: string;
    amountTotal: number;
    currency: string;
    customerEmailHash: string;
    paymentIntentId?: string | null;
    allowedStatuses: Array<"open" | "complete" | "expired">;
  };

export type StoredTrendreLinkCheckoutRequest = {
  mode: "payment";
  customer: string;
  client_reference_id: string;
  line_items: Stripe.Checkout.SessionCreateParams.LineItem[];
  payment_method_types: Array<"card">;
  payment_intent_data: Stripe.Checkout.SessionCreateParams.PaymentIntentData;
  metadata: Record<string, string>;
  success_url: string;
  cancel_url: string;
  allow_promotion_codes: false;
  expires_at: number;
};

export function normalizeCheckoutEmail(value: string) {
  return value.trim().normalize("NFKC").toLowerCase();
}

export function checkoutEmailHash(value: string) {
  return createHash("sha256").update(normalizeCheckoutEmail(value), "utf8").digest("hex");
}

function sessionEmailMismatch(
  session: Stripe.Checkout.Session,
  expectedHash: string
) {
  const candidates = [session.customer_email, session.customer_details?.email]
    .filter((value): value is string => typeof value === "string" && Boolean(value.trim()));
  return candidates.some((value) => checkoutEmailHash(value) !== expectedHash);
}

function paymentIntentId(session: Stripe.Checkout.Session) {
  return typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id ?? null;
}

function customerId(session: Stripe.Checkout.Session) {
  return typeof session.customer === "string"
    ? session.customer
    : session.customer?.id ?? null;
}

export function checkoutIdempotencyKey(quoteId: string, attemptToken: string) {
  return `trendre-link-quote-checkout-${quoteId}-${attemptToken}`;
}

export function isAmbiguousStripeCreateError(error: unknown) {
  if (!(error instanceof Error)) return true;
  const type = "type" in error && typeof error.type === "string" ? error.type : "";
  return (
    error.message === "stripe_checkout_result_unknown" ||
    type === "StripeConnectionError" ||
    type === "StripeAPIError" ||
    /timeout|timed out|connection|socket|network/i.test(error.message)
  );
}

export function validateTrendreLinkCheckoutSession(
  session: Stripe.Checkout.Session,
  expected: TrendreLinkCheckoutSessionExpectation
) {
  if (session.id !== expected.sessionId) return "session_id_mismatch";
  if (session.mode !== "payment") return "session_mode_mismatch";
  if (session.client_reference_id !== expected.quoteId) {
    return "session_reference_mismatch";
  }
  if (
    !isSafeTrendreLinkCheckoutMetadata(session.metadata, expected)
  ) {
    return "session_metadata_mismatch";
  }
  if (customerId(session) !== expected.customerId) {
    return "session_customer_mismatch";
  }
  if (sessionEmailMismatch(session, expected.customerEmailHash)) {
    return "session_customer_email_mismatch";
  }
  if (session.amount_total !== expected.amountTotal) {
    return "session_amount_mismatch";
  }
  if ((session.currency ?? "").toUpperCase() !== expected.currency.toUpperCase()) {
    return "session_currency_mismatch";
  }
  if (!session.status || !expected.allowedStatuses.includes(session.status)) {
    return "session_status_mismatch";
  }

  const intentId = paymentIntentId(session);
  if (expected.paymentIntentId && intentId !== expected.paymentIntentId) {
    return "session_payment_intent_mismatch";
  }
  if (session.status === "complete" && !intentId) {
    return "session_payment_intent_missing";
  }

  // Checkout with manual capture normally completes while the PaymentIntent is
  // requires_capture. Stripe may report the Session as unpaid until capture;
  // succeeded PaymentIntents can report paid. No other state is accepted.
  if (
    (session.status === "open" && session.payment_status !== "unpaid") ||
    (session.status === "complete" &&
      session.payment_status !== "unpaid" &&
      session.payment_status !== "paid") ||
    (session.status === "expired" && session.payment_status !== "unpaid")
  ) {
    return "session_payment_status_mismatch";
  }

  return null;
}

export function validateTrendreLinkPaymentIntent(
  intent: Stripe.PaymentIntent,
  expected: TrendreLinkCheckoutIdentity & {
    paymentIntentId: string;
    amount: number;
    currency: string;
  }
) {
  if (intent.id !== expected.paymentIntentId) return "payment_intent_id_mismatch";
  if (intent.capture_method !== "manual") return "payment_intent_capture_method_mismatch";
  if (intent.status !== "requires_capture" && intent.status !== "succeeded") {
    return "payment_intent_status_mismatch";
  }
  if (!isSafeTrendreLinkCheckoutMetadata(intent.metadata, expected)) {
    return "payment_intent_metadata_mismatch";
  }
  if (intent.amount !== expected.amount) return "payment_intent_amount_mismatch";
  if (intent.currency.toUpperCase() !== expected.currency.toUpperCase()) {
    return "payment_intent_currency_mismatch";
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseStoredCheckoutRequest(
  value: unknown,
  expected: TrendreLinkCheckoutIdentity & {
    amountTotal: number;
    currency: string;
    customerEmailHash: string;
  }
): StoredTrendreLinkCheckoutRequest | null {
  if (!isRecord(value) || value.mode !== "payment") return null;
  if (
    typeof value.customer !== "string" ||
    !value.customer ||
    value.client_reference_id !== expected.quoteId ||
    value.allow_promotion_codes !== false ||
    !Number.isSafeInteger(value.expires_at) ||
    !Array.isArray(value.payment_method_types) ||
    value.payment_method_types.length !== 1 ||
    value.payment_method_types[0] !== "card" ||
    !Array.isArray(value.line_items) ||
    value.line_items.length < 1 ||
    !isRecord(value.metadata) ||
    !isSafeTrendreLinkCheckoutMetadata(
      value.metadata as Record<string, string>,
      expected
    ) ||
    value.metadata.checkout_customer_email_sha256 !== expected.customerEmailHash ||
    !isRecord(value.payment_intent_data) ||
    value.payment_intent_data.capture_method !== "manual" ||
    !isSafeTrendreLinkCheckoutMetadata(
      isRecord(value.payment_intent_data.metadata)
        ? (value.payment_intent_data.metadata as Record<string, string>)
        : null,
      expected
    ) ||
    (value.payment_intent_data.metadata as Record<string, unknown>)
      .checkout_customer_email_sha256 !== expected.customerEmailHash ||
    typeof value.success_url !== "string" ||
    typeof value.cancel_url !== "string"
  ) {
    return null;
  }

  try {
    const success = new URL(value.success_url);
    const cancel = new URL(value.cancel_url);
    if (
      success.origin !== cancel.origin ||
      success.pathname !== `/b/quotes/${expected.quoteId}` ||
      cancel.pathname !== `/b/quotes/${expected.quoteId}` ||
      success.searchParams.get("checkout") !== "success" ||
      !success.search.includes("{CHECKOUT_SESSION_ID}") ||
      cancel.searchParams.get("checkout") !== "cancelled" ||
      (success.protocol !== "https:" && success.hostname !== "localhost")
    ) {
      return null;
    }
  } catch {
    return null;
  }

  let amount = 0;
  for (const item of value.line_items) {
    if (!isRecord(item) || !isRecord(item.price_data)) return null;
    const unitAmount = item.price_data.unit_amount;
    const quantity = item.quantity;
    if (
      !Number.isSafeInteger(unitAmount) ||
      Number(unitAmount) <= 0 ||
      !Number.isSafeInteger(quantity) ||
      Number(quantity) <= 0 ||
      String(item.price_data.currency ?? "").toUpperCase() !==
        expected.currency.toUpperCase()
    ) {
      return null;
    }
    amount += Number(unitAmount) * Number(quantity);
  }
  if (amount !== expected.amountTotal) return null;

  return value as StoredTrendreLinkCheckoutRequest;
}
