// app/api/stripe/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getBaseUrl, getStripe, getStripePriceId } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CheckoutPlan = "standard" | "global_pro";

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

async function ensureNoActiveSuspension(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_suspensions")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1);

  if (error) {
    throw error;
  }

  return (data ?? []).length === 0;
}

async function getCompany(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("company_name, contact_email, approval_status")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function getUserState(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_states")
    .select(`
      user_id,
      company_plan_code,
      company_subscription_status,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_subscription_status,
      stripe_cancel_at_period_end,
      stripe_price_id,
      stripe_current_period_end
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

function inferPlanCodeFromPriceId(
  priceId?: string | null
): CheckoutPlan | null {
  if (!priceId) return null;

  if (priceId === process.env.STRIPE_PRICE_STANDARD_MONTHLY) {
    return "standard";
  }

  if (priceId === process.env.STRIPE_PRICE_GLOBAL_PRO_MONTHLY) {
    return "global_pro";
  }

  return null;
}

function isTerminalSubscriptionStatus(
  status: Stripe.Subscription.Status
) {
  return status === "canceled" || status === "incomplete_expired";
}

function isBlockingSubscriptionStatus(
  status: Stripe.Subscription.Status
) {
  return (
    status === "active" ||
    status === "trialing" ||
    status === "past_due" ||
    status === "incomplete" ||
    status === "unpaid" ||
    status === "paused"
  );
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

function buildUserStatePatchFromSubscription(
  subscription: Stripe.Subscription
): Record<string, string | number | boolean | null> {
  const firstItem = subscription.items.data[0];
  const priceId = firstItem?.price?.id ?? null;
  const planCode = inferPlanCodeFromPriceId(priceId);
  const currentPeriodEndIso = getCurrentPeriodEndIsoFromSubscription(
    subscription
  );

  const patch: Record<string, string | number | boolean | null> = {
    stripe_subscription_id: subscription.id,
    stripe_subscription_status: subscription.status,
    stripe_price_id: priceId,
    stripe_current_period_end: currentPeriodEndIso,
    stripe_cancel_at_period_end: subscription.cancel_at_period_end,
  };

  if (typeof subscription.customer === "string") {
    patch.stripe_customer_id = subscription.customer;
  }

  if (planCode) {
    patch.company_plan_code = planCode;
    patch.monthly_request_limit = null;
    patch.request_usage_reset_at = currentPeriodEndIso;

    if (
      subscription.status === "active" ||
      subscription.status === "trialing"
    ) {
      patch.company_subscription_status = "active";
    } else if (isBlockingSubscriptionStatus(subscription.status)) {
      patch.company_subscription_status = "inactive";
    }
  }

  return patch;
}

async function findOrCreateStripeCustomer(args: {
  userId: string;
  email: string;
  companyName?: string | null;
  existingCustomerId?: string | null;
}) {
  const stripe = getStripe();

  if (args.existingCustomerId) {
    try {
      const existingCustomer = await stripe.customers.retrieve(
        args.existingCustomerId
      );

      if (!("deleted" in existingCustomer)) {
        const metadataUserId =
          existingCustomer.metadata?.supabase_user_id ?? null;

        if (!metadataUserId || metadataUserId === args.userId) {
          return existingCustomer;
        }
      }
    } catch {
      // 壊れたIDや削除済みは無視して新規探索へ進む
    }
  }

  const byEmail = await stripe.customers.list({
    email: args.email,
    limit: 20,
  });

  const matchedByMetadata =
    byEmail.data.find(
      (customer) => customer.metadata?.supabase_user_id === args.userId
    ) ?? null;

  if (matchedByMetadata) {
    return matchedByMetadata;
  }

  return stripe.customers.create({
    email: args.email,
    name: args.companyName ?? args.email,
    metadata: {
      supabase_user_id: args.userId,
    },
  });
}

async function findExistingManagedSubscription(args: {
  customerId: string;
  storedSubscriptionId?: string | null;
}) {
  const stripe = getStripe();

  if (args.storedSubscriptionId) {
    try {
      const storedSubscription = await stripe.subscriptions.retrieve(
        args.storedSubscriptionId
      );

      if (
        typeof storedSubscription.customer === "string" &&
        storedSubscription.customer === args.customerId &&
        isBlockingSubscriptionStatus(storedSubscription.status)
      ) {
        return storedSubscription;
      }
    } catch {
      // Stripe 上で見つからない / 壊れたIDは無視して customer 一覧探索へ進む
    }
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: args.customerId,
    status: "all",
    limit: 20,
  });

  const blockingSubscriptions = subscriptions.data
    .filter((subscription) => !isTerminalSubscriptionStatus(subscription.status))
    .filter((subscription) => isBlockingSubscriptionStatus(subscription.status))
    .sort((a, b) => b.created - a.created);

  return blockingSubscriptions[0] ?? null;
}

function getExistingSubscriptionErrorMessage(
  subscription: Stripe.Subscription
) {
  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const planCode = inferPlanCodeFromPriceId(priceId);

  const planLabel =
    planCode === "global_pro"
      ? "GlobalPro"
      : planCode === "standard"
      ? "Standard"
      : "有料プラン";

  if (subscription.cancel_at_period_end) {
    return `${planLabel} は現在「期間終了時解約」の状態です。終了日までは重複して新しい Checkout を開始できません。Billing Portal で現在の契約状態をご確認ください。`;
  }

  if (
    subscription.status === "past_due" ||
    subscription.status === "incomplete" ||
    subscription.status === "unpaid" ||
    subscription.status === "paused"
  ) {
    return `${planLabel} の契約情報が Stripe 上に残っています。重複課金防止のため、新しい Checkout は開始できません。Billing Portal でお支払い状況または契約状態をご確認ください。`;
  }

  return `すでに ${planLabel} の契約情報があります。重複課金防止のため、新しい Checkout は開始できません。Billing Portal で現在の契約状態をご確認ください。`;
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

    const canUseBilling = await ensureNoActiveSuspension(user.id);

    if (!canUseBilling) {
      return NextResponse.json(
        { error: "現在このアカウントでは課金手続きを開始できません" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const plan = body?.plan as CheckoutPlan | undefined;

    if (plan !== "standard" && plan !== "global_pro") {
      return NextResponse.json(
        { error: "対象外のプランです" },
        { status: 400 }
      );
    }

    const company = await getCompany(user.id);

    if (!company) {
      return NextResponse.json(
        { error: "企業情報が見つかりませんでした" },
        { status: 400 }
      );
    }

    if (company.approval_status !== "approved") {
      return NextResponse.json(
        { error: "審査承認後に課金手続きを開始できます" },
        { status: 403 }
      );
    }

    const userState = await getUserState(user.id);

    const email = user.email ?? company.contact_email ?? null;

    if (!email) {
      return NextResponse.json(
        { error: "メールアドレスを取得できませんでした" },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const priceId = getStripePriceId(plan);
    const baseUrl = getBaseUrl();

    const customer = await findOrCreateStripeCustomer({
      userId: user.id,
      email,
      companyName: company.company_name ?? null,
      existingCustomerId: userState?.stripe_customer_id ?? null,
    });

    await upsertUserState(user.id, {
      stripe_customer_id: customer.id,
    });

    const existingSubscription = await findExistingManagedSubscription({
      customerId: customer.id,
      storedSubscriptionId: userState?.stripe_subscription_id ?? null,
    });

    if (existingSubscription) {
      await upsertUserState(user.id, {
        stripe_customer_id: customer.id,
        ...buildUserStatePatchFromSubscription(existingSubscription),
      });

      return NextResponse.json(
        {
          error: getExistingSubscriptionErrorMessage(existingSubscription),
        },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customer.id,
      client_reference_id: user.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/b/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/b/billing?checkout=cancelled`,
      metadata: {
        supabase_user_id: user.id,
        plan_code: plan,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan_code: plan,
        },
      },
      allow_promotion_codes: false,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Checkout URL の作成に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("stripe checkout error", error);
    return NextResponse.json(
      { error: "Stripe Checkout の作成に失敗しました" },
      { status: 500 }
    );
  }
}