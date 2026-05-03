// app/api/stripe/sync-checkout-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CompanyPlanCode = "free" | "standard" | "global_pro";

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
      stripe_subscription_id
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

function getCurrentPeriodEndIsoFromSubscription(
  subscription: Stripe.Subscription
): string | null {
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

function getNextFreeResetAtIso() {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
}

function buildUserStatePatchFromSubscription(
  subscription: Stripe.Subscription
) {
  const firstItem = subscription.items.data[0];
  const priceId = firstItem?.price?.id ?? null;
  const planCode = inferPlanCodeFromPriceId(priceId);
  const currentPeriodEndIso = getCurrentPeriodEndIsoFromSubscription(
    subscription
  );

  const commonPatch: Record<string, string | number | boolean | null> = {
    stripe_customer_id:
      typeof subscription.customer === "string" ? subscription.customer : null,
    stripe_subscription_id: subscription.id,
    stripe_subscription_status: subscription.status,
    stripe_price_id: priceId,
    stripe_current_period_end: currentPeriodEndIso,
    stripe_cancel_at_period_end: subscription.cancel_at_period_end,
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

    const body = await req.json().catch(() => null);
    const sessionId = body?.sessionId as string | undefined;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    if (session.mode !== "subscription") {
      return NextResponse.json(
        { error: "対象外の Checkout Session です" },
        { status: 400 }
      );
    }

    const sessionUserId =
      session.metadata?.supabase_user_id ??
      (typeof session.client_reference_id === "string"
        ? session.client_reference_id
        : null);

    if (sessionUserId && sessionUserId !== user.id) {
      return NextResponse.json(
        { error: "この Checkout Session にはアクセスできません" },
        { status: 403 }
      );
    }

    const userState = await getUserState(user.id);

    if (
      typeof session.customer === "string" &&
      userState?.stripe_customer_id &&
      userState.stripe_customer_id !== session.customer
    ) {
      return NextResponse.json(
        { error: "Stripe customer が一致しません" },
        { status: 403 }
      );
    }

    let subscription: Stripe.Subscription | null = null;

    if (!session.subscription) {
      return NextResponse.json(
        { error: "subscription が見つかりません" },
        { status: 400 }
      );
    }

    if (typeof session.subscription === "string") {
      subscription = await stripe.subscriptions.retrieve(session.subscription);
    } else {
      subscription = session.subscription as Stripe.Subscription;
    }

    await upsertUserState(user.id, {
      stripe_customer_id:
        typeof session.customer === "string" ? session.customer : null,
    });

    const patch = buildUserStatePatchFromSubscription(subscription);

    await upsertUserState(user.id, patch);

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
    console.error("stripe sync checkout session error", error);
    return NextResponse.json(
      { error: "Checkout Session の同期に失敗しました" },
      { status: 500 }
    );
  }
}