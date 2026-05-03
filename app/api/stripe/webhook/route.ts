// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CompanyPlanCode = "free" | "standard" | "global_pro";

type SubscriptionWithExtras = Stripe.Subscription & {
  cancel_at?: number | null;
  canceled_at?: number | null;
  ended_at?: number | null;
  current_period_end?: number | null;
  cancellation_details?: {
    comment?: string | null;
    feedback?: string | null;
    reason?: string | null;
  } | null;
};

function inferPlanCodeFromPriceId(priceId?: string | null): CompanyPlanCode {
  if (!priceId) return "free";

  if (priceId === process.env.STRIPE_PRICE_STANDARD_MONTHLY) {
    return "standard";
  }

  if (priceId === process.env.STRIPE_PRICE_GLOBAL_PRO_MONTHLY) {
    return "global_pro";
  }

  return "free";
}

function getNextFreeResetAtIso() {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
}

function getFreeStatePatch() {
  return {
    company_subscription_status: "active",
    company_plan_code: "free",
    monthly_request_limit: 5,
    monthly_request_used: 0,
    request_usage_reset_at: getNextFreeResetAtIso(),
    stripe_subscription_status: "canceled",
    stripe_subscription_id: null,
    stripe_price_id: null,
    stripe_current_period_end: null,
    stripe_cancel_at_period_end: false,
  };
}

function getPaidActiveStatePatch(
  planCode: "standard" | "global_pro",
  currentPeriodEndIso: string | null,
  subscriptionStatus: string,
  cancelScheduled: boolean
) {
  return {
    company_subscription_status: "active",
    company_plan_code: planCode,
    monthly_request_limit: null,
    request_usage_reset_at: currentPeriodEndIso,
    stripe_subscription_status: subscriptionStatus,
    stripe_current_period_end: currentPeriodEndIso,
    stripe_cancel_at_period_end: cancelScheduled,
  };
}

function getPaidInactiveStatePatch(
  planCode: "standard" | "global_pro",
  currentPeriodEndIso: string | null,
  subscriptionStatus: string,
  cancelScheduled: boolean
) {
  return {
    company_subscription_status: "inactive",
    company_plan_code: planCode,
    monthly_request_limit: null,
    request_usage_reset_at: currentPeriodEndIso,
    stripe_subscription_status: subscriptionStatus,
    stripe_current_period_end: currentPeriodEndIso,
    stripe_cancel_at_period_end: cancelScheduled,
  };
}

function isPaidActiveStatus(status: Stripe.Subscription.Status) {
  return status === "active" || status === "trialing";
}

function isPaidInactiveStatus(status: Stripe.Subscription.Status) {
  return (
    status === "past_due" ||
    status === "incomplete" ||
    status === "unpaid" ||
    status === "paused"
  );
}

function isTerminalStatus(status: Stripe.Subscription.Status) {
  return status === "canceled" || status === "incomplete_expired";
}

function getCancelScheduledFlag(subscription: Stripe.Subscription): boolean {
  const raw = subscription as SubscriptionWithExtras;

  if (subscription.cancel_at_period_end === true) {
    return true;
  }

  if (typeof raw.cancel_at === "number" && raw.cancel_at > 0) {
    return true;
  }

  if (raw.cancellation_details?.reason === "cancellation_requested") {
    return true;
  }

  return false;
}

async function upsertUserState(
  userId: string,
  patch: Record<string, string | number | boolean | null>
) {
  const { error } = await supabaseAdmin
    .from("user_states")
    .upsert(
      {
        user_id: userId,
        ...patch,
      },
      {
        onConflict: "user_id",
      }
    );

  if (error) {
    throw error;
  }
}

async function getUserIdByStripeCustomerId(customerId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_states")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.user_id ?? null;
}

async function getUserIdByStripeSubscriptionId(subscriptionId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_states")
    .select("user_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.user_id ?? null;
}

async function getUserIdFromCustomerId(customerId: string) {
  const mappedUserId = await getUserIdByStripeCustomerId(customerId);
  if (mappedUserId) {
    return mappedUserId;
  }

  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(customerId);

  if ("deleted" in customer) {
    return null;
  }

  const fromMetadata = customer.metadata?.supabase_user_id ?? null;

  if (fromMetadata) {
    await upsertUserState(fromMetadata, {
      stripe_customer_id: customerId,
    });
  }

  return fromMetadata;
}

async function resolveUserIdFromSubscription(subscription: Stripe.Subscription) {
  const fromMetadata = subscription.metadata?.supabase_user_id;
  if (fromMetadata) {
    return fromMetadata;
  }

  const mappedBySubscription = await getUserIdByStripeSubscriptionId(
    subscription.id
  );

  if (mappedBySubscription) {
    return mappedBySubscription;
  }

  if (typeof subscription.customer === "string") {
    return getUserIdFromCustomerId(subscription.customer);
  }

  return null;
}

function getCurrentPeriodEndIsoFromSubscription(
  subscription: Stripe.Subscription
): string | null {
  const raw = subscription as SubscriptionWithExtras;

  if (typeof raw.current_period_end === "number" && raw.current_period_end > 0) {
    return new Date(raw.current_period_end * 1000).toISOString();
  }

  const firstItem = subscription.items.data[0];
  if (!firstItem) {
    return null;
  }

  const itemWithPeriod = firstItem as Stripe.SubscriptionItem & {
    current_period_end?: number | null;
  };

  const currentPeriodEnd = itemWithPeriod.current_period_end ?? null;

  return currentPeriodEnd
    ? new Date(currentPeriodEnd * 1000).toISOString()
    : null;
}

function extractSubscriptionIdFromInvoice(
  invoice: Stripe.Invoice
): string | null {
  const invoiceWithLegacySubscription = invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
  };

  const legacySubscription = invoiceWithLegacySubscription.subscription;

  if (typeof legacySubscription === "string") {
    return legacySubscription;
  }

  if (
    legacySubscription &&
    typeof legacySubscription === "object" &&
    "id" in legacySubscription &&
    typeof legacySubscription.id === "string"
  ) {
    return legacySubscription.id;
  }

  const invoiceWithParent = invoice as Stripe.Invoice & {
    parent?: {
      subscription_details?: {
        subscription?: string | null;
      } | null;
    } | null;
  };

  const nestedSubscription =
    invoiceWithParent.parent?.subscription_details?.subscription;

  if (typeof nestedSubscription === "string") {
    return nestedSubscription;
  }

  return null;
}

function logSubscriptionSnapshot(args: {
  source: string;
  subscription: Stripe.Subscription;
  userId: string | null;
  planCode: CompanyPlanCode;
  priceId: string | null;
  currentPeriodEndIso: string | null;
}) {
  const raw = args.subscription as SubscriptionWithExtras;
  const cancelScheduled = getCancelScheduledFlag(args.subscription);

  console.log("webhook: subscription snapshot", {
    source: args.source,
    subscriptionId: args.subscription.id,
    customer:
      typeof args.subscription.customer === "string"
        ? args.subscription.customer
        : null,
    status: args.subscription.status,
    cancelAtPeriodEnd: args.subscription.cancel_at_period_end,
    cancelAt: raw.cancel_at ?? null,
    canceledAt: raw.canceled_at ?? null,
    endedAt: raw.ended_at ?? null,
    cancellationDetails: raw.cancellation_details ?? null,
    cancelScheduled,
    userId: args.userId,
    planCode: args.planCode,
    priceId: args.priceId,
    currentPeriodEndIso: args.currentPeriodEndIso,
    metadata: args.subscription.metadata,
  });
}

async function syncFromSubscription(
  subscription: Stripe.Subscription,
  source: string
) {
  const userId = await resolveUserIdFromSubscription(subscription);

  const firstItem = subscription.items.data[0];
  const priceId = firstItem?.price?.id ?? null;
  const currentPeriodEndIso = getCurrentPeriodEndIsoFromSubscription(subscription);
  const cancelScheduled = getCancelScheduledFlag(subscription);

  const planCode =
    (subscription.metadata?.plan_code as CompanyPlanCode | undefined) ??
    inferPlanCodeFromPriceId(priceId);

  logSubscriptionSnapshot({
    source,
    subscription,
    userId,
    planCode,
    priceId,
    currentPeriodEndIso,
  });

  if (!userId) {
    console.warn(
      "webhook: could not resolve userId from subscription",
      subscription.id
    );
    return;
  }

  if (planCode === "free" && priceId) {
    console.warn("webhook: unknown paid price id", {
      source,
      subscriptionId: subscription.id,
      priceId,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      cancelScheduled,
    });
    return;
  }

  const commonPatch = {
    stripe_customer_id:
      typeof subscription.customer === "string" ? subscription.customer : null,
    stripe_subscription_id: subscription.id,
    stripe_subscription_status: subscription.status,
    stripe_price_id: priceId,
    stripe_current_period_end: currentPeriodEndIso,
    stripe_cancel_at_period_end: cancelScheduled,
  };

  if (isTerminalStatus(subscription.status)) {
    const patch = {
      stripe_customer_id: commonPatch.stripe_customer_id,
      ...getFreeStatePatch(),
    };

    await upsertUserState(userId, patch);

    console.log("webhook: applied free state patch", {
      source,
      userId,
      subscriptionId: subscription.id,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      cancelScheduled,
      patch,
    });
    return;
  }

  if (planCode === "standard" || planCode === "global_pro") {
    if (isPaidActiveStatus(subscription.status)) {
      const patch = {
        ...commonPatch,
        ...getPaidActiveStatePatch(
          planCode,
          currentPeriodEndIso,
          subscription.status,
          cancelScheduled
        ),
      };

      await upsertUserState(userId, patch);

      console.log("webhook: applied paid active patch", {
        source,
        userId,
        subscriptionId: subscription.id,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        cancelScheduled,
        patch,
      });
      return;
    }

    if (isPaidInactiveStatus(subscription.status)) {
      const patch = {
        ...commonPatch,
        ...getPaidInactiveStatePatch(
          planCode,
          currentPeriodEndIso,
          subscription.status,
          cancelScheduled
        ),
      };

      await upsertUserState(userId, patch);

      console.log("webhook: applied paid inactive patch", {
        source,
        userId,
        subscriptionId: subscription.id,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        cancelScheduled,
        patch,
      });
      return;
    }
  }

  console.warn("webhook: unrecognized subscription state", {
    source,
    subscriptionId: subscription.id,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    cancelScheduled,
    planCode,
    priceId,
  });
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  if (session.subscription) {
    const stripe = getStripe();
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription.id;

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await syncFromSubscription(subscription, "checkout.session.completed");
    return;
  }

  let userId = session.metadata?.supabase_user_id ?? null;

  if (!userId && typeof session.customer === "string") {
    userId = await getUserIdFromCustomerId(session.customer);
  }

  if (!userId) {
    console.warn(
      "webhook: could not resolve userId from checkout session",
      session.id
    );
    return;
  }

  await upsertUserState(userId, {
    stripe_customer_id:
      typeof session.customer === "string" ? session.customer : null,
  });

  console.log("webhook: checkout session synced customer only", {
    sessionId: session.id,
    userId,
    customer:
      typeof session.customer === "string" ? session.customer : null,
  });
}

async function handleSubscriptionChanged(
  subscription: Stripe.Subscription,
  source: "customer.subscription.created" | "customer.subscription.updated"
) {
  // ここは retrieve し直さず、webhook に載ってきた event object を優先
  // Portal 解約予約直後の更新内容を落とさないため
  await syncFromSubscription(subscription, source);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = await resolveUserIdFromSubscription(subscription);

  logSubscriptionSnapshot({
    source: "customer.subscription.deleted",
    subscription,
    userId,
    planCode:
      (subscription.metadata?.plan_code as CompanyPlanCode | undefined) ??
      inferPlanCodeFromPriceId(subscription.items.data[0]?.price?.id ?? null),
    priceId: subscription.items.data[0]?.price?.id ?? null,
    currentPeriodEndIso: getCurrentPeriodEndIsoFromSubscription(subscription),
  });

  if (!userId) {
    console.warn(
      "webhook: could not resolve userId from deleted subscription",
      subscription.id
    );
    return;
  }

  const patch = {
    stripe_customer_id:
      typeof subscription.customer === "string" ? subscription.customer : null,
    ...getFreeStatePatch(),
  };

  await upsertUserState(userId, patch);

  console.log("webhook: applied deleted subscription free patch", {
    userId,
    subscriptionId: subscription.id,
    patch,
  });
}

async function syncFromInvoice(
  invoice: Stripe.Invoice,
  source: "invoice.payment_failed" | "invoice.paid"
) {
  const subscriptionId = extractSubscriptionIdFromInvoice(invoice);

  if (!subscriptionId) {
    console.warn("webhook: invoice event had no subscription", {
      source,
      invoiceId: invoice.id,
    });
    return;
  }

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await syncFromSubscription(subscription, source);
}

export async function POST(req: NextRequest) {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return NextResponse.json(
        { error: "STRIPE_WEBHOOK_SECRET is not set" },
        { status: 500 }
      );
    }

    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing Stripe-Signature header" },
        { status: 400 }
      );
    }

    const payload = await req.text();
    const stripe = getStripe();

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error: any) {
      console.error("webhook signature verification failed", error?.message);
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 }
      );
    }

    console.log("webhook: received event", {
      eventId: event.id,
      eventType: event.type,
    });

    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;
      }

      case "customer.subscription.created": {
        await handleSubscriptionChanged(
          event.data.object as Stripe.Subscription,
          "customer.subscription.created"
        );
        break;
      }

      case "customer.subscription.updated": {
        await handleSubscriptionChanged(
          event.data.object as Stripe.Subscription,
          "customer.subscription.updated"
        );
        break;
      }

      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;
      }

      case "invoice.payment_failed": {
        await syncFromInvoice(
          event.data.object as Stripe.Invoice,
          "invoice.payment_failed"
        );
        break;
      }

      case "invoice.paid": {
        await syncFromInvoice(
          event.data.object as Stripe.Invoice,
          "invoice.paid"
        );
        break;
      }

      default: {
        console.log("webhook: unhandled event type", event.type);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("stripe webhook error", error);
    return NextResponse.json(
      { error: "Webhook handling failed" },
      { status: 500 }
    );
  }
}