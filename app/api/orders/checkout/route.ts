// File: app/api/orders/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getBaseUrl, getStripe } from "@/lib/stripe";
import {
  calculateOrderFees,
  normalizeInternalPlanCode,
} from "@/lib/orders/fees";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProjectType = "visit_experience" | "product_delivery" | "provided_assets";

type CheckoutBody = {
  creator_id?: string;
  creator_menu_id?: string;
  project_type?: string;
  product_name?: string;
  product_url?: string;
  deadline?: string;
  requirements?: string;
  note?: string;
  has_free_offer?: boolean;
  wants_secondary_use?: boolean;
};

const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

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
    .select(
      `
      user_id,
      company_profile_completed,
      company_access_status,
      company_plan_code,
      company_subscription_status,
      monthly_request_limit,
      monthly_request_used,
      request_usage_reset_at,
      stripe_customer_id
    `
    )
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
      // 壊れた customer id は無視して、email + metadata で探し直す
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

function normalizeCurrency(value: string | null | undefined) {
  const normalized = (value ?? "JPY").trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(normalized)) {
    return "JPY";
  }

  return normalized;
}

function toStripeAmount(amount: number, currency: string) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  if (ZERO_DECIMAL_CURRENCIES.has(currency)) {
    return Math.round(amount);
  }

  return Math.round(amount * 100);
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getNullableString(value: unknown) {
  const text = getString(value);
  return text ? text : null;
}

function getBoolean(value: unknown) {
  return value === true;
}

function normalizeProjectType(value: unknown): ProjectType | null {
  if (value === "visit_experience") return "visit_experience";
  if (value === "product_delivery") return "product_delivery";
  if (value === "provided_assets") return "provided_assets";
  return null;
}

function isUgcMenuSnapshot(menu: {
  menu_type?: string | null;
  category?: string | null;
  platform?: string | null;
  sns?: string | null;
  title?: string | null;
  description?: string | null;
}) {
  const text = [
    menu.menu_type,
    menu.category,
    menu.platform,
    menu.sns,
    menu.title,
    menu.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    text.includes("ugc") ||
    text.includes("素材") ||
    text.includes("動画素材") ||
    text.includes("画像素材")
  );
}

function isDateStringOrNull(value: string | null) {
  if (!value) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isPaidPlan(planCode: string | null | undefined) {
  const normalized = normalizeInternalPlanCode(planCode);
  return normalized === "standard" || normalized === "global_pro";
}

export async function POST(req: NextRequest) {
  let createdOrderId: string | null = null;

  try {
    const { user, error: authError } = await getAuthenticatedUser(req);

    if (authError || !user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const isCompany = await ensureCompanyUser(user.id);

    if (!isCompany) {
      return NextResponse.json(
        { error: "企業ユーザーのみ注文できます" },
        { status: 403 }
      );
    }

    const canUseOrders = await ensureNoActiveSuspension(user.id);

    if (!canUseOrders) {
      return NextResponse.json(
        { error: "現在このアカウントでは注文を開始できません" },
        { status: 403 }
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
        { error: "審査承認後に注文できます" },
        { status: 403 }
      );
    }

    const userState = await getUserState(user.id);
    const planCode = normalizeInternalPlanCode(userState?.company_plan_code);

    if (!userState?.company_profile_completed) {
      return NextResponse.json(
        { error: "注文前に企業プロフィールを完了してください" },
        { status: 403 }
      );
    }

    if (userState.company_access_status !== "approved") {
      return NextResponse.json(
        { error: "企業アカウントの承認後に注文できます" },
        { status: 403 }
      );
    }

    // Basicは無料プランなので、subscription_statusがactiveでなくても注文可能。
    // Pro/Premium相当の内部プランだけ、月額課金がactiveであることを要求する。
    if (
      isPaidPlan(planCode) &&
      userState.company_subscription_status !== "active"
    ) {
      return NextResponse.json(
        { error: "有料プランの利用には月額課金の有効化が必要です" },
        { status: 403 }
      );
    }

    const monthlyLimit =
      typeof userState.monthly_request_limit === "number"
        ? userState.monthly_request_limit
        : null;

    const monthlyUsed =
      typeof userState.monthly_request_used === "number"
        ? userState.monthly_request_used
        : 0;

    if (monthlyLimit !== null && monthlyUsed >= monthlyLimit) {
      return NextResponse.json(
        { error: "今月の注文上限に達しています" },
        { status: 403 }
      );
    }

    const body = (await req.json().catch(() => null)) as CheckoutBody | null;

    if (!body) {
      return NextResponse.json(
        { error: "注文内容を取得できませんでした" },
        { status: 400 }
      );
    }

    const creatorId = getString(body.creator_id);
    const creatorMenuId = getString(body.creator_menu_id);
    const projectType = normalizeProjectType(body.project_type);
    const productName = getString(body.product_name);
    const productUrl = getNullableString(body.product_url);
    const deadline = getNullableString(body.deadline);
    const requirements = getString(body.requirements ?? body.note);
    const hasFreeOffer = getBoolean(body.has_free_offer);
    const requestedSecondaryUse = getBoolean(body.wants_secondary_use);

    if (!creatorId) {
      return NextResponse.json(
        { error: "クリエイターIDがありません" },
        { status: 400 }
      );
    }

    if (!creatorMenuId) {
      return NextResponse.json(
        { error: "注文するメニューを選択してください" },
        { status: 400 }
      );
    }

    if (!projectType) {
      return NextResponse.json(
        { error: "案件タイプを選択してください" },
        { status: 400 }
      );
    }

    if (!productName) {
      return NextResponse.json(
        { error: "商品名・案件名を入力してください" },
        { status: 400 }
      );
    }

    if (requirements.length < 10) {
      return NextResponse.json(
        { error: "依頼内容・requirements は10文字以上で入力してください" },
        { status: 400 }
      );
    }

    if (!isDateStringOrNull(deadline)) {
      return NextResponse.json(
        { error: "納期の日付形式が正しくありません" },
        { status: 400 }
      );
    }

    const { data: creator, error: creatorError } = await supabaseAdmin
      .from("creators")
      .select(
        `
        id,
        user_id,
        display_name,
        approval_status,
        is_public,
        stripe_account_id,
        stripe_onboarding_completed
      `
      )
      .eq("id", creatorId)
      .eq("approval_status", "approved")
      .eq("is_public", true)
      .eq("stripe_onboarding_completed", true)
      .maybeSingle();

    if (creatorError) {
      throw creatorError;
    }

    if (!creator) {
      return NextResponse.json(
        { error: "クリエイターが見つかりませんでした" },
        { status: 404 }
      );
    }

    if (
      !creator.stripe_account_id ||
      creator.stripe_onboarding_completed !== true
    ) {
      return NextResponse.json(
        {
          error:
            "このクリエイターは現在、報酬受け取り設定が未完了のため注文できません。",
        },
        { status: 403 }
      );
    }

    const { data: menu, error: menuError } = await supabaseAdmin
      .from("creator_menus")
      .select(
        `
        id,
        creator_id,
        title,
        description,
        platform,
        sns,
        menu_type,
        category,
        price,
        currency,
        deliverables,
        delivery_days,
        account_url,
        reference_price_text,
        allow_secondary_use,
        notes,
        is_active
      `
      )
      .eq("id", creatorMenuId)
      .eq("creator_id", creator.id)
      .eq("is_active", true)
      .maybeSingle();

    if (menuError) {
      throw menuError;
    }

    if (!menu) {
      return NextResponse.json(
        { error: "メニューが見つかりませんでした" },
        { status: 404 }
      );
    }

    const menuIsUgc = isUgcMenuSnapshot(menu);
    const wantsSecondaryUse =
      requestedSecondaryUse && (!!menu.allow_secondary_use || menuIsUgc);

    if (requestedSecondaryUse && !wantsSecondaryUse) {
      return NextResponse.json(
        { error: "このメニューでは二次利用は許可されていません" },
        { status: 400 }
      );
    }

    const menuPriceNumber = Number(menu.price);
    const menuPriceAmount = Number.isFinite(menuPriceNumber)
      ? Math.round(menuPriceNumber)
      : null;

    if (!menuPriceAmount || menuPriceAmount <= 0) {
      return NextResponse.json(
        { error: "このメニューには有効な価格が設定されていません" },
        { status: 400 }
      );
    }

    const currency = normalizeCurrency(menu.currency);

    // 初期MVPは「日本CがJPYで出す → 日本BがJPYで買う」に固定。
    if (currency !== "JPY") {
      return NextResponse.json(
        { error: "現在のMVPではJPYメニューのみ注文できます" },
        { status: 400 }
      );
    }

    const fees = calculateOrderFees({
      menuPriceAmount,
      buyerPlanCode: planCode,
    });

    const stripeAmount = toStripeAmount(fees.buyerTotalAmount, currency);

    if (!stripeAmount || stripeAmount <= 0) {
      return NextResponse.json(
        { error: "決済金額の計算に失敗しました" },
        { status: 400 }
      );
    }

    const email = user.email ?? company.contact_email ?? null;

    if (!email) {
      return NextResponse.json(
        { error: "メールアドレスを取得できませんでした" },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const baseUrl = getBaseUrl();

    const customer = await findOrCreateStripeCustomer({
      userId: user.id,
      email,
      companyName: company.company_name ?? null,
      existingCustomerId: userState.stripe_customer_id ?? null,
    });

    await upsertUserState(user.id, {
      stripe_customer_id: customer.id,
    });

    const orderInsert = {
      b_user_id: user.id,
      creator_id: creator.id,
      creator_user_id: creator.user_id,
      creator_menu_id: menu.id,

      status: "checkout_pending",
      payment_status: "checkout_pending",
      payment_flow: "manual_capture",

      project_type: projectType,
      product_name: productName,
      product_url: productUrl,
      requirements,
      deadline,
      has_free_offer: hasFreeOffer,
      wants_secondary_use: wantsSecondaryUse,

      menu_title_snapshot: menu.title,
      menu_description_snapshot: menu.description,
      menu_platform_snapshot: menu.platform ?? menu.sns,
      menu_type_snapshot: menu.menu_type,
      menu_category_snapshot: menu.category,
      menu_deliverables_snapshot: menu.deliverables,
      menu_delivery_days_snapshot: menu.delivery_days,
      menu_allow_secondary_use_snapshot: !!menu.allow_secondary_use || menuIsUgc,

      currency,
      menu_price_amount: fees.menuPriceAmount,
      stripe_amount: stripeAmount,

      buyer_plan_code_snapshot: fees.buyerPlanCodeSnapshot,
      buyer_plan_public_name_snapshot: fees.buyerPlanPublicNameSnapshot,
      buyer_marketplace_fee_rate_bps: fees.buyerMarketplaceFeeRateBps,
      buyer_marketplace_fee_amount: fees.buyerMarketplaceFeeAmount,
      buyer_total_amount: fees.buyerTotalAmount,

      creator_transaction_fee_rate_bps: fees.creatorTransactionFeeRateBps,
      creator_transaction_fee_amount: fees.creatorTransactionFeeAmount,
      platform_gross_revenue_amount: fees.platformGrossRevenueAmount,

      // 既存画面・既存APIとの後方互換用。
      fee_rate_bps: fees.buyerMarketplaceFeeRateBps,
      platform_fee_amount: fees.platformGrossRevenueAmount,
      creator_payout_amount: fees.creatorPayoutAmount,

      stripe_customer_id: customer.id,
      stripe_payment_status: "checkout_pending",

      metadata: {
        source: "orders_checkout_api_v2_collabstr_like_fees",
        plan_code: planCode,
        plan_public_name: fees.buyerPlanPublicNameSnapshot,
        payment_flow: "manual_capture",
        project_type: projectType,
        buyer_marketplace_fee_rate_bps: fees.buyerMarketplaceFeeRateBps,
        creator_transaction_fee_rate_bps: fees.creatorTransactionFeeRateBps,
      },
    };

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert(orderInsert as never)
      .select("id")
      .single();

    if (orderError || !order) {
      throw orderError ?? new Error("Order creation failed");
    }

    createdOrderId = order.id;

    await supabaseAdmin.from("order_events").insert({
      order_id: order.id,
      actor_user_id: user.id,
      event_type: "order_checkout_pending_created",
      event_data: {
        creator_id: creator.id,
        creator_user_id: creator.user_id,
        creator_menu_id: menu.id,
        currency,
        menu_price_amount: fees.menuPriceAmount,
        buyer_marketplace_fee_amount: fees.buyerMarketplaceFeeAmount,
        buyer_total_amount: fees.buyerTotalAmount,
        creator_transaction_fee_amount: fees.creatorTransactionFeeAmount,
        creator_payout_amount: fees.creatorPayoutAmount,
        platform_gross_revenue_amount: fees.platformGrossRevenueAmount,
        stripe_amount: stripeAmount,
        payment_flow: "manual_capture",
        project_type: projectType,
      },
    });

    const successUrl = `${baseUrl}/b/orders/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/b/creators/${creator.id}/request?menuId=${menu.id}&checkout=cancelled`;

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: toStripeAmount(fees.menuPriceAmount, currency)!,
          product_data: {
            name: menu.title,
            description: menu.description?.slice(0, 500) ?? undefined,
            metadata: {
              creator_id: creator.id,
              creator_menu_id: menu.id,
              order_id: order.id,
              item_type: "creator_menu",
            },
          },
        },
        quantity: 1,
      },
    ];

    if (fees.buyerMarketplaceFeeAmount > 0) {
      lineItems.push({
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: toStripeAmount(
            fees.buyerMarketplaceFeeAmount,
            currency
          )!,
          product_data: {
            name: "Trendre marketplace fee",
            description: `Buyer marketplace fee (${fees.buyerMarketplaceFeeRateBps / 100}%)`,
            metadata: {
              order_id: order.id,
              item_type: "buyer_marketplace_fee",
            },
          },
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customer.id,
      client_reference_id: order.id,
      payment_method_types: ["card"],
      line_items: lineItems,
      payment_intent_data: {
        capture_method: "manual",
        metadata: {
          order_id: order.id,
          supabase_user_id: user.id,
          b_user_id: user.id,
          creator_id: creator.id,
          creator_user_id: creator.user_id,
          creator_menu_id: menu.id,
          payment_flow: "manual_capture",
          project_type: projectType,
          menu_price_amount: String(fees.menuPriceAmount),
          buyer_marketplace_fee_amount: String(
            fees.buyerMarketplaceFeeAmount
          ),
          buyer_total_amount: String(fees.buyerTotalAmount),
          creator_transaction_fee_amount: String(
            fees.creatorTransactionFeeAmount
          ),
          creator_payout_amount: String(fees.creatorPayoutAmount),
          platform_gross_revenue_amount: String(
            fees.platformGrossRevenueAmount
          ),
        },
      },
      metadata: {
        order_id: order.id,
        supabase_user_id: user.id,
        b_user_id: user.id,
        creator_id: creator.id,
        creator_user_id: creator.user_id,
        creator_menu_id: menu.id,
        payment_flow: "manual_capture",
        project_type: projectType,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: false,
    });

    if (!session.url) {
      throw new Error("Checkout URL was not created");
    }

    await supabaseAdmin
      .from("orders")
      .update({
        stripe_checkout_session_id: session.id,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", order.id);

    await supabaseAdmin.from("order_events").insert({
      order_id: order.id,
      actor_user_id: user.id,
      event_type: "stripe_checkout_session_created",
      event_data: {
        stripe_checkout_session_id: session.id,
        checkout_amount: stripeAmount,
        menu_price_amount: fees.menuPriceAmount,
        buyer_marketplace_fee_amount: fees.buyerMarketplaceFeeAmount,
        buyer_total_amount: fees.buyerTotalAmount,
        creator_transaction_fee_amount: fees.creatorTransactionFeeAmount,
        creator_payout_amount: fees.creatorPayoutAmount,
        platform_gross_revenue_amount: fees.platformGrossRevenueAmount,
        project_type: projectType,
      },
    });

    return NextResponse.json({
      url: session.url,
      order_id: order.id,
      checkout_session_id: session.id,
      amount: {
        currency,
        menu_price_amount: fees.menuPriceAmount,
        buyer_marketplace_fee_amount: fees.buyerMarketplaceFeeAmount,
        buyer_total_amount: fees.buyerTotalAmount,
        creator_transaction_fee_amount: fees.creatorTransactionFeeAmount,
        creator_payout_amount: fees.creatorPayoutAmount,
        platform_gross_revenue_amount: fees.platformGrossRevenueAmount,
      },
    });
  } catch (error) {
    console.error("orders checkout error", error);

    if (createdOrderId) {
      await supabaseAdmin.from("order_events").insert({
        order_id: createdOrderId,
        actor_user_id: null,
        event_type: "orders_checkout_error",
        event_data: {
          message:
            error instanceof Error
              ? error.message
              : "Unknown orders checkout error",
        },
      });
    }

    return NextResponse.json(
      { error: "注文用Checkoutの作成に失敗しました" },
      { status: 500 }
    );
  }
}