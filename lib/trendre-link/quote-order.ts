import type Stripe from "stripe";

import { createNotifications } from "@/lib/notifications/createNotification";
import { getStripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { UUID_PATTERN } from "@/lib/trendre-link/items-server";
import { isSafeTrendreLinkCheckoutMetadata } from "@/lib/trendre-link/quote-checkout-policy";
import {
  parseStoredCheckoutRequest,
  validateTrendreLinkCheckoutSession,
  validateTrendreLinkPaymentIntent,
} from "@/lib/trendre-link/quote-checkout-session";
import { repairQuoteOrderState } from "@/lib/trendre-link/quote-order-repair";
import { trendreLinkOrderOrigin } from "@/lib/trendre-link/quote-order-origin";
import { getManualCaptureOrderPlan } from "@/lib/trendre-link/manual-capture-order";
import { insertOrRecoverUnique } from "@/lib/db/unique-insert";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function integer(value: unknown) {
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

function stripeAmount(amount: number, currency: string) {
  return currency.toUpperCase() === "JPY" ? amount : Math.round(amount * 100);
}

function paymentIntentId(session: Stripe.Checkout.Session) {
  return typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id ?? null;
}

export async function createOrderFromTrendreLinkCheckout(
  session: Stripe.Checkout.Session
) {
  if (session.metadata?.source !== "trendre_link_quote") return null;

  const quoteId = session.metadata.trendre_link_quote_id;
  const inquiryId = session.metadata.trendre_link_inquiry_id;
  if (!UUID_PATTERN.test(quoteId ?? "") || !UUID_PATTERN.test(inquiryId ?? "")) {
    throw new Error("trendre_link_checkout_metadata_invalid");
  }

  const admin = supabaseAdmin;
  const { data: quote, error: quoteError } = await admin
    .from("creator_inquiry_quotes")
    .select(
      "id,inquiry_id,creator_user_id,company_user_id,status,currency,quoted_amount,buyer_plan_code_snapshot,buyer_marketplace_fee_rate_bps,buyer_marketplace_fee_amount,buyer_total_amount,creator_transaction_fee_rate_bps,creator_transaction_fee_amount,creator_payout_amount,platform_gross_revenue_amount,scope,delivery_text,note,stripe_checkout_session_id,stripe_payment_intent_id,checkout_status,checkout_session_request"
    )
    .eq("id", quoteId)
    .maybeSingle();
  if (quoteError || !quote) throw new Error("trendre_link_checkout_quote_missing");
  if (
    !quote.company_user_id ||
    quote.inquiry_id !== inquiryId ||
    quote.status !== "accepted" ||
    quote.stripe_checkout_session_id !== session.id ||
    !isSafeTrendreLinkCheckoutMetadata(session.metadata, {
      quoteId,
      inquiryId,
      companyUserId: quote.company_user_id,
      creatorUserId: quote.creator_user_id,
    })
  ) {
    throw new Error("trendre_link_checkout_mismatch");
  }
  const companyUserId = quote.company_user_id;

  const totalAmount = integer(quote.buyer_total_amount);
  const currency = String(quote.currency || "").toUpperCase();
  const totalStripeAmount =
    totalAmount && totalAmount > 0 && currency === "JPY"
      ? stripeAmount(totalAmount, currency)
      : null;
  const requestMetadata = record(record(quote.checkout_session_request).metadata);
  const customerEmailHash = text(requestMetadata.checkout_customer_email_sha256);
  const storedRequest = totalStripeAmount
    && customerEmailHash && /^[0-9a-f]{64}$/i.test(customerEmailHash)
    ? parseStoredCheckoutRequest(quote.checkout_session_request, {
        quoteId,
        inquiryId,
        companyUserId,
        creatorUserId: quote.creator_user_id,
        amountTotal: totalStripeAmount,
        currency,
        customerEmailHash,
      })
    : null;
  if (!storedRequest || !totalStripeAmount || !customerEmailHash) {
    throw new Error("trendre_link_checkout_request_invalid");
  }
  const sessionMismatch = validateTrendreLinkCheckoutSession(session, {
    quoteId,
    inquiryId,
    companyUserId,
    creatorUserId: quote.creator_user_id,
    sessionId: quote.stripe_checkout_session_id,
    customerId: storedRequest.customer,
    amountTotal: totalStripeAmount,
    currency,
    customerEmailHash,
    paymentIntentId: quote.stripe_payment_intent_id,
    allowedStatuses: ["complete"],
  });
  if (sessionMismatch) {
    throw new Error(`trendre_link_checkout_session_${sessionMismatch}`);
  }

  const intentId = paymentIntentId(session);
  if (!intentId) throw new Error("trendre_link_checkout_payment_intent_missing");
  const intent = await getStripe().paymentIntents.retrieve(intentId);
  const intentMismatch = validateTrendreLinkPaymentIntent(intent, {
    quoteId,
    inquiryId,
    companyUserId,
    creatorUserId: quote.creator_user_id,
    paymentIntentId: intentId,
    amount: totalStripeAmount,
    currency,
  });
  if (intentMismatch) throw new Error(`trendre_link_checkout_${intentMismatch}`);

  const { data: existingOrder, error: existingOrderError } = await admin
    .from("orders")
    .select("id,b_user_id,creator_user_id,trendre_link_inquiry_id,stripe_checkout_session_id,stripe_payment_intent_id,status,payment_status")
    .eq("trendre_link_quote_id", quoteId)
    .maybeSingle();
  if (existingOrderError) throw existingOrderError;
  if (
    existingOrder &&
    (existingOrder.b_user_id !== companyUserId ||
      existingOrder.creator_user_id !== quote.creator_user_id ||
      existingOrder.trendre_link_inquiry_id !== inquiryId ||
      existingOrder.stripe_checkout_session_id !== session.id ||
      existingOrder.stripe_payment_intent_id !== intent.id)
  ) {
    throw new Error("trendre_link_existing_order_mismatch");
  }

  const manualCapturePlan = getManualCaptureOrderPlan({
    paymentIntentStatus: intent.status,
    existingOrder: existingOrder
      ? {
          status: existingOrder.status,
          paymentStatus: existingOrder.payment_status,
        }
      : null,
  });
  if (!manualCapturePlan.ok) {
    throw new Error(`trendre_link_checkout_manual_capture_${manualCapturePlan.reason}`);
  }

  let orderId = existingOrder?.id as string | undefined;
  let created = false;
  if (!orderId) {
    const [{ data: inquiry, error: inquiryError }, { data: creator, error: creatorError }] =
      await Promise.all([
        admin
          .from("creator_inquiries")
          .select("id,product_name,message,request_data")
          .eq("id", inquiryId)
          .single(),
        admin
          .from("creators")
          .select("id,user_id")
          .eq("user_id", quote.creator_user_id)
          .single(),
      ]);
    if (inquiryError || !inquiry || creatorError || !creator) {
      throw new Error("trendre_link_checkout_order_source_missing");
    }

    const requestData = record(inquiry.request_data);
    const projectType = text(requestData.project_type);
    const fulfillmentType =
      projectType === "visit_experience"
        ? "visit"
        : projectType === "product_delivery"
          ? "product_shipping"
          : "material_provided";
    const preparationStatus =
      fulfillmentType === "visit"
        ? "waiting_schedule"
        : fulfillmentType === "product_shipping"
          ? "waiting_shipping_address"
          : "materials_provided";
    const now = new Date();
    const authorized = manualCapturePlan.paymentStatus === "authorized";
    const payoutMethod =
      session.metadata?.payout_method === "stripe_connect"
        ? "stripe_connect"
        : "manual_bank_transfer";
    const creatorAcceptDeadline = authorized
      ? new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString()
      : null;
    const quotedAmount = integer(quote.quoted_amount) ?? 0;
    const buyerFee = integer(quote.buyer_marketplace_fee_amount) ?? 0;
    const creatorFee = integer(quote.creator_transaction_fee_amount) ?? 0;
    const platformRevenue = integer(quote.platform_gross_revenue_amount) ?? 0;

    const orderInsert = await insertOrRecoverUnique({
      insert: async () => {
        const { data, error } = await admin.from("orders").insert({
        b_user_id: companyUserId,
        creator_id: creator.id,
        creator_user_id: quote.creator_user_id,
        ...trendreLinkOrderOrigin(inquiryId, quoteId),
        status: manualCapturePlan.orderStatus,
        payment_status: manualCapturePlan.paymentStatus,
        payment_flow: "manual_capture",
        payout_method: payoutMethod,
        payout_status: "unpaid",
        project_type: projectType,
        fulfillment_type: fulfillmentType,
        preparation_status: preparationStatus,
        preparation_started_at: now.toISOString(),
        preparation_data: { source: "trendre_link_quote" },
        product_name: text(inquiry.product_name) || "Trendre Linkからの依頼",
        product_url: text(requestData.product_url),
        requirements: [text(quote.scope), text(quote.note), text(inquiry.message)]
          .filter(Boolean)
          .join("\n\n") || "詳細は注文後のチャットで相談します。",
        deadline: null,
        has_free_offer: requestData.has_free_offer === true,
        wants_secondary_use: Array.isArray(requestData.usage_purposes),
        pr_account: null,
        pr_hashtags: [],
        pr_copy_text: null,
        post_notes: text(quote.note),
        menu_title_snapshot: "Trendre Link 見積もり",
        menu_description_snapshot: text(quote.scope),
        menu_platform_snapshot: Array.isArray(requestData.requested_platforms)
          ? requestData.requested_platforms.join(",")
          : null,
        menu_type_snapshot: text(requestData.request_mode),
        menu_category_snapshot: null,
        menu_deliverables_snapshot: null,
        menu_delivery_days_snapshot: null,
        menu_allow_secondary_use_snapshot: Array.isArray(requestData.usage_purposes),
        currency,
        menu_price_amount: quotedAmount,
        stripe_amount: intent.amount,
        buyer_plan_code_snapshot: quote.buyer_plan_code_snapshot,
        buyer_marketplace_fee_rate_bps: quote.buyer_marketplace_fee_rate_bps,
        buyer_marketplace_fee_amount: buyerFee,
        buyer_total_amount: totalAmount,
        creator_transaction_fee_rate_bps: quote.creator_transaction_fee_rate_bps,
        creator_transaction_fee_amount: creatorFee,
        platform_gross_revenue_amount: platformRevenue,
        fee_rate_bps: quote.buyer_marketplace_fee_rate_bps,
        platform_fee_amount: platformRevenue,
        creator_payout_amount: quote.creator_payout_amount,
        stripe_customer_id:
          typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: intent.id,
        stripe_payment_status: intent.status,
        authorized_at: authorized ? now.toISOString() : null,
        captured_at: authorized ? null : now.toISOString(),
        creator_accept_deadline: creatorAcceptDeadline,
        metadata: {
          source: "trendre_link_quote",
          trendre_link_quote_id: quoteId,
          trendre_link_inquiry_id: inquiryId,
        },
        }).select("id,b_user_id,creator_user_id,trendre_link_inquiry_id,stripe_checkout_session_id,stripe_payment_intent_id").single();
        return { data, error };
      },
      recover: async () => {
        const { data, error } = await admin
          .from("orders")
          .select("id,b_user_id,creator_user_id,trendre_link_inquiry_id,stripe_checkout_session_id,stripe_payment_intent_id")
          .eq("trendre_link_quote_id", quoteId)
          .single();
        return { data, error };
      },
      validateRecovered: (raced) =>
        raced.b_user_id === companyUserId &&
        raced.creator_user_id === quote.creator_user_id &&
        raced.trendre_link_inquiry_id === inquiryId &&
        raced.stripe_checkout_session_id === session.id &&
        raced.stripe_payment_intent_id === intent.id,
      missingError: "trendre_link_order_insert_failed",
    });
    orderId = orderInsert.value.id;
    created = !orderInsert.duplicate;
  }

  if (!orderId) throw new Error("trendre_link_order_id_missing");
  const nowIso = new Date().toISOString();
  const eventDedupeKey = `trendre-link-checkout:${quoteId}`;
  await repairQuoteOrderState({
    repairOrder: async () => {
      if (!manualCapturePlan.repairExistingOrder) return;
      const { data: repairedOrder, error: orderRepairError } = await admin
        .from("orders")
        .update({
          status: "accepted_captured",
          payment_status: "captured",
          stripe_payment_status: intent.status,
          accepted_at: nowIso,
          captured_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", orderId)
        .eq("stripe_payment_intent_id", intent.id)
        .eq("status", "authorized_pending_creator")
        .eq("payment_status", "authorized")
        .select("id")
        .maybeSingle();
      if (orderRepairError) throw orderRepairError;
      if (!repairedOrder) {
        const { data: concurrentlyRepaired, error: concurrentRepairError } = await admin
          .from("orders")
          .select("id")
          .eq("id", orderId)
          .eq("stripe_payment_intent_id", intent.id)
          .eq("status", "accepted_captured")
          .eq("payment_status", "captured")
          .maybeSingle();
        if (concurrentRepairError || !concurrentlyRepaired) {
          throw concurrentRepairError ?? new Error("trendre_link_order_capture_repair_failed");
        }
      }
    },
    updateQuote: async () => {
      const { data: updatedQuote, error: quoteUpdateError } = await admin
        .from("creator_inquiry_quotes")
        .update({
          checkout_status: "completed",
          stripe_payment_intent_id: intent.id,
          checkout_completed_at: nowIso,
          checkout_last_error: null,
          updated_at: nowIso,
        })
        .eq("id", quoteId)
        .eq("stripe_checkout_session_id", session.id)
        .eq("company_user_id", companyUserId)
        .select("id")
        .maybeSingle();
      if (quoteUpdateError || !updatedQuote) {
        throw quoteUpdateError ?? new Error("trendre_link_quote_repair_failed");
      }
    },
    updateInquiry: async () => {
      const { data: updatedInquiry, error: inquiryUpdateError } = await admin
        .from("creator_inquiries")
        .update({ status: "converted", converted_order_id: orderId, updated_at: nowIso })
        .eq("id", inquiryId)
        .eq("creator_user_id", quote.creator_user_id)
        .or(`converted_order_id.is.null,converted_order_id.eq.${orderId}`)
        .select("id")
        .maybeSingle();
      if (inquiryUpdateError || !updatedInquiry) {
        throw inquiryUpdateError ?? new Error("trendre_link_inquiry_repair_failed");
      }
    },
    upsertEvent: async () => {
      const { error: eventError } = await admin.from("order_events").upsert(
        {
          order_id: orderId,
          actor_user_id: companyUserId,
          event_type: "trendre_link_quote_checkout_completed",
          dedupe_key: eventDedupeKey,
          event_data: {
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id: intent.id,
            stripe_payment_intent_status: intent.status,
          },
        },
        { onConflict: "dedupe_key", ignoreDuplicates: true }
      );
      if (eventError) throw eventError;
    },
    ensureNotifications: async () => {
      await createNotifications([
        {
          recipientUserId: companyUserId,
          notificationType: "trendre_link_order_created",
          title: "お支払いを確認しました",
          body: "見積もりから正式注文を作成しました。",
          linkPath: `/b/orders/${orderId}`,
          entityType: "order",
          entityId: orderId,
          orderId,
          dedupeKey: `trendre-link-order-company:${quoteId}`,
        },
        {
          recipientUserId: quote.creator_user_id,
          actorUserId: companyUserId,
          notificationType: "trendre_link_order_created",
          title: "見積もりが正式注文になりました",
          body: "企業がお支払い手続きを完了しました。注文内容を確認してください。",
          linkPath: `/creator/orders/${orderId}`,
          entityType: "order",
          entityId: orderId,
          orderId,
          importance: "high",
          dedupeKey: `trendre-link-order-creator:${quoteId}`,
        },
      ]);
    },
  });

  return { orderId, created };
}
