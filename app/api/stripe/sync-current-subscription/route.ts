// app/api/stripe/sync-current-subscription/route.ts
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
  current_period_start?: number | null;
  current_period_end?: number | null;
  cancellation_details?: {
    comment?: string | null;
    feedback?: string | null;
    reason?: string | null;
  } | null;
};

async function getAuthenticatedUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    return { user: null, error: "認証トークンがありません" };
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return { user: null, error: "認証に失敗しました" };
  }

  return { user, error: null };
}

async function ensureCompanyUser(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "company")
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  return true;
}

async function getUserState(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_states")
    .select(`
      user_id,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_subscription_status,
      company_plan_code,
      company_subscription_status
    `)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
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

function buildUserStatePatchFromSubscription(subscription: Stripe.Subscription) {
  const firstItem = subscription.items.data[0];
  const priceId = firstItem?.price?.id ?? null;
  const planCode =
    (subscription.metadata?.plan_code as CompanyPlanCode | undefined) ??
    inferPlanCodeFromPriceId(priceId);
  const currentPeriodEndIso = getCurrentPeriodEndIsoFromSubscription(
    subscription
  );
  const cancelScheduled = getCancelScheduledFlag(subscription);

  const commonPatch: Record<string, string | number | boolean | null> = {
    stripe_customer_id:
      typeof subscription.customer === "string" ? subscription.customer : null,
    stripe_subscription_id: subscription.id,
    stripe_subscription_status: subscription.status,
    stripe_price_id: priceId,
    stripe_current_period_end: currentPeriodEndIso,
    stripe_cancel_at_period_end: cancelScheduled,
  };

  if (isTerminalStatus(subscription.status)) {
    return {
      ...commonPatch,
      company_plan_code: "free",
      company_subscription_status: "active",
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

  if (planCode === "standard" || planCode === "global_pro") {
    if (isPaidActiveStatus(subscription.status)) {
      return {
        ...commonPatch,
        company_plan_code: planCode,
        company_subscription_status: "active",
        monthly_request_limit: null,
        request_usage_reset_at: currentPeriodEndIso,
      };
    }

    if (isPaidInactiveStatus(subscription.status)) {
      return {
        ...commonPatch,
        company_plan_code: planCode,
        company_subscription_status: "inactive",
        monthly_request_limit: null,
        request_usage_reset_at: currentPeriodEndIso,
      };
    }
  }

  return commonPatch;
}

function scoreSubscription(subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const planCode =
    (subscription.metadata?.plan_code as CompanyPlanCode | undefined) ??
    inferPlanCodeFromPriceId(priceId);

  const paidPlan =
    planCode === "standard" || planCode === "global_pro" ? 1 : 0;

  const nonTerminal = isTerminalStatus(subscription.status) ? 0 : 1;

  const activeRank = isPaidActiveStatus(subscription.status)
    ? 3
    : isPaidInactiveStatus(subscription.status)
    ? 2
    : 1;

  return {
    subscription,
    planCode,
    paidPlan,
    nonTerminal,
    activeRank,
    created: subscription.created,
  };
}

function logSubscriptionDetails(label: string, subscription: Stripe.Subscription) {
  const raw = subscription as SubscriptionWithExtras;
  const cancelScheduled = getCancelScheduledFlag(subscription);

  console.log(label, {
    id: subscription.id,
    customer:
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id ?? null,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    cancelAt: raw.cancel_at ?? null,
    canceledAt: raw.canceled_at ?? null,
    endedAt: raw.ended_at ?? null,
    currentPeriodStart: raw.current_period_start ?? null,
    currentPeriodEnd: raw.current_period_end ?? null,
    cancellationDetails: raw.cancellation_details ?? null,
    cancelScheduled,
    created: subscription.created,
    priceId: subscription.items.data[0]?.price?.id ?? null,
    metadata: subscription.metadata ?? {},
  });
}

async function findLatestRelevantSubscription(args: {
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}) {
  const stripe = getStripe();

  if (args.stripeCustomerId) {
    const subscriptions = await stripe.subscriptions.list({
      customer: args.stripeCustomerId,
      status: "all",
      limit: 100,
    });

    if (subscriptions.data.length > 0) {
      const ranked = subscriptions.data
        .map(scoreSubscription)
        .sort((a, b) => {
          if (b.paidPlan !== a.paidPlan) return b.paidPlan - a.paidPlan;
          if (b.nonTerminal !== a.nonTerminal) return b.nonTerminal - a.nonTerminal;
          if (b.activeRank !== a.activeRank) return b.activeRank - a.activeRank;
          return b.created - a.created;
        });

      console.log(
        "sync-current-subscription: candidate subscriptions",
        ranked.map((row) => ({
          id: row.subscription.id,
          status: row.subscription.status,
          cancelAtPeriodEnd: row.subscription.cancel_at_period_end,
          cancelScheduled: getCancelScheduledFlag(row.subscription),
          created: row.subscription.created,
          planCode: row.planCode,
          priceId: row.subscription.items.data[0]?.price?.id ?? null,
        }))
      );

      const selected = ranked[0]?.subscription ?? null;

      if (selected) {
        const refreshed = await stripe.subscriptions.retrieve(selected.id);

        logSubscriptionDetails(
          "sync-current-subscription: selected from list (raw list object)",
          selected
        );
        logSubscriptionDetails(
          "sync-current-subscription: selected retrieved again",
          refreshed
        );

        return refreshed;
      }
    }
  }

  if (args.stripeSubscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(
        args.stripeSubscriptionId
      );

      logSubscriptionDetails(
        "sync-current-subscription: fallback stored subscription",
        subscription
      );

      return subscription;
    } catch {
      // no-op
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(req);

    if (authError || !user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const isCompany = await ensureCompanyUser(user.id);

    if (!isCompany) {
      return NextResponse.json(
        { error: "企業ユーザーのみ利用できます" },
        { status: 403 }
      );
    }

    const userState = await getUserState(user.id);

    console.log("sync-current-subscription: current user_state", {
      userId: user.id,
      stripeCustomerId: userState?.stripe_customer_id ?? null,
      stripeSubscriptionId: userState?.stripe_subscription_id ?? null,
      companyPlanCode: userState?.company_plan_code ?? null,
      companySubscriptionStatus: userState?.company_subscription_status ?? null,
      stripeSubscriptionStatus: userState?.stripe_subscription_status ?? null,
    });

    const subscription = await findLatestRelevantSubscription({
      stripeCustomerId: userState?.stripe_customer_id ?? null,
      stripeSubscriptionId: userState?.stripe_subscription_id ?? null,
    });

    if (!subscription) {
      console.log("sync-current-subscription: no subscription found", {
        userId: user.id,
      });

      return NextResponse.json({
        ok: true,
        synced: false,
        reason: "no_subscription_found",
      });
    }

    const patch = buildUserStatePatchFromSubscription(subscription);

    await upsertUserState(user.id, patch);

    console.log("sync-current-subscription: applied patch", {
      userId: user.id,
      subscriptionId: subscription.id,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      cancelScheduled: getCancelScheduledFlag(subscription),
      patch,
    });

    return NextResponse.json({
      ok: true,
      synced: true,
      company_plan_code: patch.company_plan_code ?? null,
      company_subscription_status: patch.company_subscription_status ?? null,
      stripe_subscription_id: patch.stripe_subscription_id ?? null,
      stripe_subscription_status: patch.stripe_subscription_status ?? null,
      stripe_price_id: patch.stripe_price_id ?? null,
      stripe_current_period_end: patch.stripe_current_period_end ?? null,
      stripe_cancel_at_period_end: patch.stripe_cancel_at_period_end ?? null,
    });
  } catch (error) {
    console.error("sync-current-subscription error", error);
    return NextResponse.json(
      { error: "現在の契約状態の同期に失敗しました" },
      { status: 500 }
    );
  }
}