import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getBaseUrl, getStripe } from "@/lib/stripe";
import { UUID_PATTERN } from "@/lib/trendre-link/items-server";
import { allowQuoteAccessRequest } from "@/lib/trendre-link/request-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type CheckoutSuccessResponse = {
  ok: true;
  url?: string;
  redirectTo?: string;
  checkoutSessionId: string;
  duplicate?: boolean;
  completed?: boolean;
};

type CheckoutErrorResponse = {
  ok: false;
  error: string;
  setupRequired?: boolean;
};

type QuoteCheckoutResponse =
  | CheckoutSuccessResponse
  | CheckoutErrorResponse;

const STRIPE_TIMEOUT_MS = 15_000;
const STRIPE_SESSION_TIMEOUT_MS = 20_000;
const CREATING_LOCK_MS = 2 * 60 * 1000;

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

function errorResponse(
  error: string,
  status: number,
  setupRequired = false
) {
  return NextResponse.json<QuoteCheckoutResponse>(
    {
      ok: false,
      error,
      ...(setupRequired ? { setupRequired: true } : {}),
    },
    {
      status,
      headers: {
        "cache-control": "no-store",
      },
    }
  );
}

function withTimeout<T>(
  promiseLike: PromiseLike<T> | T,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const promise = Promise.resolve(promiseLike);
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function isSameOriginRequest(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function normalizeOrigin(value: string | null | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    return url.origin.replace(/\/$/, "");
  } catch {
    return null;
  }
}

function normalizeVercelHost(value: string | null | undefined) {
  const trimmed = value?.trim().toLowerCase();
  if (!trimmed) return null;

  try {
    const url = trimmed.includes("://")
      ? new URL(trimmed)
      : new URL(`https://${trimmed}`);

    return url.host.toLowerCase();
  } catch {
    return null;
  }
}

function getCheckoutBaseUrl(
  request: NextRequest,
  fallbackBaseUrl: string
) {
  const fallback = fallbackBaseUrl.replace(/\/$/, "");
  const requestOrigin = normalizeOrigin(request.nextUrl.origin);

  if (!requestOrigin) {
    return fallback;
  }

  const requestUrl = new URL(requestOrigin);
  const vercelEnv = (process.env.VERCEL_ENV ?? "")
    .trim()
    .toLowerCase();

  if (vercelEnv === "production") {
    return fallback;
  }

  if (vercelEnv === "preview") {
    const allowedPreviewHosts = new Set(
      [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]
        .map(normalizeVercelHost)
        .filter((host): host is string => Boolean(host))
    );

    if (
      requestUrl.protocol === "https:" &&
      allowedPreviewHosts.has(requestUrl.host.toLowerCase())
    ) {
      return requestOrigin;
    }

    return fallback;
  }

  const hostname = requestUrl.hostname.toLowerCase();
  const isLocalhost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1";

  if (requestUrl.protocol === "http:" && isLocalhost) {
    return requestOrigin;
  }

  return fallback;
}

function normalizeCurrency(value: unknown) {
  const currency =
    typeof value === "string"
      ? value.trim().toUpperCase()
      : "JPY";

  return /^[A-Z]{3}$/.test(currency) ? currency : "JPY";
}

function numberValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
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

function safeStripeError(error: unknown) {
  const message =
    error instanceof Error && error.message
      ? error.message
      : "quote_checkout_failed";

  return message
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/[A-Za-z0-9_-]{32,}/g, "[redacted]")
    .slice(0, 500);
}

function isStripeResourceMissing(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const candidate = error as {
    code?: unknown;
    raw?: {
      code?: unknown;
    };
  };

  return (
    candidate.code === "resource_missing" ||
    candidate.raw?.code === "resource_missing"
  );
}

async function findOrCreateStripeCustomer(args: {
  stripe: ReturnType<typeof getStripe>;
  userId: string;
  email: string;
  companyName: string | null;
  existingCustomerId: string | null;
}) {
  if (args.existingCustomerId) {
    try {
      const customer = await withTimeout(
        args.stripe.customers.retrieve(args.existingCustomerId),
        STRIPE_TIMEOUT_MS,
        "Stripe顧客情報の確認に時間がかかっています。"
      );

      if (!("deleted" in customer)) {
        const metadataUserId =
          customer.metadata?.supabase_user_id ?? null;

        if (!metadataUserId || metadataUserId === args.userId) {
          return customer;
        }
      }
    } catch (error) {
      console.warn("quote checkout existing customer lookup skipped", {
        cause: safeStripeError(error),
      });
    }
  }

  try {
    const customers = await withTimeout(
      args.stripe.customers.list({
        email: args.email,
        limit: 20,
      }),
      STRIPE_TIMEOUT_MS,
      "Stripe顧客情報の検索に時間がかかっています。"
    );

    const matched =
      customers.data.find(
        (customer) =>
          customer.metadata?.supabase_user_id === args.userId
      ) ?? null;

    if (matched) {
      return matched;
    }
  } catch (error) {
    console.warn("quote checkout customer email lookup skipped", {
      cause: safeStripeError(error),
    });
  }

  return withTimeout(
    args.stripe.customers.create({
      email: args.email,
      name: args.companyName || args.email,
      metadata: {
        supabase_user_id: args.userId,
        source: "trendre_link_quote",
      },
    }),
    STRIPE_TIMEOUT_MS,
    "Stripe顧客情報の作成に時間がかかっています。"
  );
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  if (
    !allowQuoteAccessRequest({
      request,
      scope: "company-quote-checkout",
      limit: 15,
      windowMs: 10 * 60 * 1000,
    })
  ) {
    return errorResponse(
      "操作が集中しています。時間を置いてもう一度お試しください。",
      429
    );
  }

  if (!isSameOriginRequest(request)) {
    return errorResponse(
      "この操作を実行できませんでした。",
      403
    );
  }

  const { id } = await context.params;

  if (!UUID_PATTERN.test(id)) {
    return errorResponse(
      "見積もりが見つかりません。",
      404
    );
  }

  const admin = supabaseAdmin as any;
  let claimedAttempt: number | null = null;
  let createdSessionId: string | null = null;

  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return errorResponse("ログインが必要です。", 401);
    }

    const { data: access, error: accessError } = await admin
      .from("creator_inquiry_quote_access")
      .select("inquiry_id,quote_id")
      .eq("quote_id", id)
      .eq("user_id", user.id)
      .not("claimed_at", "is", null)
      .maybeSingle();

    if (accessError) {
      throw new Error("quote_checkout_access_load_failed");
    }

    if (!access) {
      return errorResponse(
        "見積もりが見つかりません。",
        404
      );
    }

    const { data: quote, error: quoteError } = await admin
      .from("creator_inquiry_quotes")
      .select(
        `
        id,
        inquiry_id,
        creator_user_id,
        company_user_id,
        status,
        currency,
        quoted_amount,
        buyer_marketplace_fee_amount,
        buyer_total_amount,
        checkout_status,
        checkout_attempt_count,
        stripe_checkout_session_id,
        stripe_payment_intent_id,
        checkout_started_at,
        checkout_completed_at
        `
      )
      .eq("id", id)
      .eq("company_user_id", user.id)
      .maybeSingle();

    if (quoteError) {
      if (
        quoteError.code === "42703" ||
        quoteError.code === "42P01"
      ) {
        return errorResponse(
          "見積もり決済機能の準備が完了していません。",
          503,
          true
        );
      }

      throw new Error("quote_checkout_quote_load_failed");
    }

    if (
      !quote ||
      quote.inquiry_id !== access.inquiry_id
    ) {
      return errorResponse(
        "見積もりが見つかりません。",
        404
      );
    }

    if (quote.status !== "accepted") {
      return errorResponse(
        "承認済みの見積もりのみ支払いへ進めます。",
        409
      );
    }

    const { data: existingOrder, error: existingOrderError } =
      await admin
        .from("orders")
        .select("id")
        .eq("trendre_link_quote_id", id)
        .maybeSingle();

    if (existingOrderError) {
      if (
        existingOrderError.code === "42703" ||
        existingOrderError.code === "42P01"
      ) {
        return errorResponse(
          "見積もり決済機能の準備が完了していません。",
          503,
          true
        );
      }

      throw new Error("quote_checkout_order_lookup_failed");
    }

    if (existingOrder?.id) {
      return errorResponse(
        "この見積もりからはすでに正式注文が作成されています。",
        409
      );
    }

    const quoteAmount = numberValue(quote.quoted_amount);
    const marketplaceFeeAmount =
      numberValue(quote.buyer_marketplace_fee_amount) ?? 0;
    const totalAmount = numberValue(quote.buyer_total_amount);
    const currency = normalizeCurrency(quote.currency);

    if (
      quoteAmount === null ||
      quoteAmount <= 0 ||
      marketplaceFeeAmount < 0 ||
      totalAmount === null ||
      totalAmount <= 0
    ) {
      return errorResponse(
        "見積もりの決済金額を確認できませんでした。",
        400
      );
    }

    if (
      Math.abs(
        quoteAmount +
          marketplaceFeeAmount -
          totalAmount
      ) > 0.01
    ) {
      return errorResponse(
        "見積もりの合計金額が一致していません。",
        409
      );
    }

    const quoteStripeAmount = toStripeAmount(
      quoteAmount,
      currency
    );
    const feeStripeAmount =
      marketplaceFeeAmount > 0
        ? toStripeAmount(
            marketplaceFeeAmount,
            currency
          )
        : null;
    const totalStripeAmount = toStripeAmount(
      totalAmount,
      currency
    );

    if (
      !quoteStripeAmount ||
      !totalStripeAmount ||
      (marketplaceFeeAmount > 0 &&
        !feeStripeAmount)
    ) {
      return errorResponse(
        "Stripe用の決済金額を作成できませんでした。",
        400
      );
    }

    const stripe = getStripe();
    const baseUrl = getCheckoutBaseUrl(
      request,
      getBaseUrl()
    );

    let checkoutStatus =
      typeof quote.checkout_status === "string"
        ? quote.checkout_status
        : "not_started";

    let existingSessionId =
      typeof quote.stripe_checkout_session_id === "string"
        ? quote.stripe_checkout_session_id
        : null;

    if (
      checkoutStatus === "completed" &&
      existingSessionId
    ) {
      return NextResponse.json<QuoteCheckoutResponse>(
        {
          ok: true,
          completed: true,
          duplicate: true,
          checkoutSessionId: existingSessionId,
          redirectTo:
            `${baseUrl}/b/quotes/${id}` +
            `?checkout=success&session_id=${encodeURIComponent(
              existingSessionId
            )}`,
        },
        {
          headers: {
            "cache-control": "no-store",
          },
        }
      );
    }

    if (existingSessionId) {
      try {
        const existingSession = await withTimeout(
          stripe.checkout.sessions.retrieve(
            existingSessionId
          ),
          STRIPE_TIMEOUT_MS,
          "既存のStripe Checkout確認に時間がかかっています。"
        );

        if (
          existingSession.status === "open" &&
          existingSession.url
        ) {
          if (checkoutStatus !== "open") {
            await admin
              .from("creator_inquiry_quotes")
              .update({
                checkout_status: "open",
                checkout_last_error: null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", id)
              .eq("company_user_id", user.id);
          }

          return NextResponse.json<QuoteCheckoutResponse>(
            {
              ok: true,
              url: existingSession.url,
              checkoutSessionId:
                existingSession.id,
              duplicate: true,
            },
            {
              headers: {
                "cache-control": "no-store",
              },
            }
          );
        }

        if (existingSession.status === "complete") {
          await admin
            .from("creator_inquiry_quotes")
            .update({
              checkout_status: "completed",
              stripe_payment_intent_id:
                typeof existingSession.payment_intent ===
                "string"
                  ? existingSession.payment_intent
                  : null,
              checkout_completed_at:
                new Date().toISOString(),
              checkout_last_error: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .eq("company_user_id", user.id);

          return NextResponse.json<QuoteCheckoutResponse>(
            {
              ok: true,
              completed: true,
              duplicate: true,
              checkoutSessionId:
                existingSession.id,
              redirectTo:
                `${baseUrl}/b/quotes/${id}` +
                `?checkout=success&session_id=${encodeURIComponent(
                  existingSession.id
                )}`,
            },
            {
              headers: {
                "cache-control": "no-store",
              },
            }
          );
        }

        if (existingSession.status === "expired") {
          await admin
            .from("creator_inquiry_quotes")
            .update({
              checkout_status: "expired",
              stripe_checkout_session_id: null,
              stripe_payment_intent_id: null,
              checkout_last_error: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .eq("company_user_id", user.id);

          checkoutStatus = "expired";
          existingSessionId = null;
        }
      } catch (error) {
        if (!isStripeResourceMissing(error)) {
          console.error(
            "quote checkout session retrieval failed",
            {
              quoteId: id,
              cause: safeStripeError(error),
            }
          );

          return errorResponse(
            "既存の決済画面を確認できませんでした。時間を置いてもう一度お試しください。",
            502
          );
        }

        await admin
          .from("creator_inquiry_quotes")
          .update({
            checkout_status: "failed",
            stripe_checkout_session_id: null,
            stripe_payment_intent_id: null,
            checkout_last_error:
              "stripe_checkout_session_not_found",
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .eq("company_user_id", user.id);

        checkoutStatus = "failed";
        existingSessionId = null;
      }
    }

    if (checkoutStatus === "completed") {
      return errorResponse(
        "この見積もりの支払いはすでに完了しています。",
        409
      );
    }

    if (checkoutStatus === "creating") {
      const startedAt = new Date(
        quote.checkout_started_at ?? ""
      ).getTime();

      if (
        Number.isFinite(startedAt) &&
        Date.now() - startedAt < CREATING_LOCK_MS
      ) {
        return errorResponse(
          "決済画面を準備しています。少し待ってからもう一度お試しください。",
          409
        );
      }
    }

    const currentAttempt =
      Number.isInteger(
        Number(quote.checkout_attempt_count)
      )
        ? Number(quote.checkout_attempt_count)
        : 0;

    const nextAttempt = currentAttempt + 1;
    const allowedStatuses = [
      "not_started",
      "failed",
      "expired",
      "cancelled",
    ];

    if (
      checkoutStatus === "creating" ||
      (checkoutStatus === "open" &&
        !existingSessionId)
    ) {
      allowedStatuses.push(checkoutStatus);
    }

    const { data: claimed, error: claimError } =
      await admin
        .from("creator_inquiry_quotes")
        .update({
          checkout_status: "creating",
          checkout_attempt_count: nextAttempt,
          stripe_checkout_session_id: null,
          stripe_payment_intent_id: null,
          checkout_started_at:
            new Date().toISOString(),
          checkout_completed_at: null,
          checkout_last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("company_user_id", user.id)
        .eq("status", "accepted")
        .eq(
          "checkout_attempt_count",
          currentAttempt
        )
        .in("checkout_status", allowedStatuses)
        .select("checkout_attempt_count")
        .maybeSingle();

    if (claimError) {
      throw new Error(
        "quote_checkout_lock_update_failed"
      );
    }

    if (!claimed) {
      return errorResponse(
        "別の決済処理が進行しています。少し待ってからもう一度お試しください。",
        409
      );
    }

    claimedAttempt = nextAttempt;

    const [
      { data: inquiry, error: inquiryError },
      { data: linkPage },
      { data: creator },
      { data: company },
      { data: userState },
    ] = await Promise.all([
      admin
        .from("creator_inquiries")
        .select(
          "id,product_name,company_name,contact_name,request_data"
        )
        .eq("id", quote.inquiry_id)
        .single(),
      admin
        .from("creator_link_pages")
        .select("display_name")
        .eq(
          "owner_user_id",
          quote.creator_user_id
        )
        .maybeSingle(),
      admin
        .from("creators")
        .select("display_name")
        .eq(
          "user_id",
          quote.creator_user_id
        )
        .maybeSingle(),
      admin
        .from("companies")
        .select("company_name,contact_email")
        .eq("user_id", user.id)
        .maybeSingle(),
      admin
        .from("user_states")
        .select("stripe_customer_id")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (inquiryError || !inquiry) {
      throw new Error(
        "quote_checkout_inquiry_load_failed"
      );
    }

    const email =
      user.email ||
      company?.contact_email ||
      null;

    if (!email) {
      return errorResponse(
        "決済に必要なメールアドレスを取得できませんでした。",
        400
      );
    }

    const creatorName = String(
      linkPage?.display_name ||
        creator?.display_name ||
        "クリエイター"
    )
      .replace(
        /[\u0000-\u001f\u007f]+/g,
        " "
      )
      .trim()
      .slice(0, 80);

    const productName = String(
      inquiry.product_name ||
        inquiry.request_data?.product_name ||
        "PR・制作依頼"
    )
      .replace(
        /[\u0000-\u001f\u007f]+/g,
        " "
      )
      .trim()
      .slice(0, 120);

    const customer =
      await findOrCreateStripeCustomer({
        stripe,
        userId: user.id,
        email,
        companyName:
          company?.company_name ||
          inquiry.company_name ||
          null,
        existingCustomerId:
          userState?.stripe_customer_id ||
          null,
      });

    if (userState) {
      await admin
        .from("user_states")
        .update({
          stripe_customer_id: customer.id,
        })
        .eq("user_id", user.id);
    }

    const lineItems: any[] = [
      {
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: quoteStripeAmount,
          product_data: {
            name: `${creatorName}さんへの依頼`,
            description: productName,
            metadata: {
              item_type:
                "trendre_link_quote",
              trendre_link_quote_id: id,
              trendre_link_inquiry_id:
                quote.inquiry_id,
            },
          },
        },
        quantity: 1,
      },
    ];

    if (
      marketplaceFeeAmount > 0 &&
      feeStripeAmount
    ) {
      lineItems.push({
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: feeStripeAmount,
          product_data: {
            name: "Trendre marketplace fee",
            description:
              "Buyer marketplace fee",
            metadata: {
              item_type:
                "buyer_marketplace_fee",
              trendre_link_quote_id: id,
              trendre_link_inquiry_id:
                quote.inquiry_id,
            },
          },
        },
        quantity: 1,
      });
    }

    const successUrl =
      `${baseUrl}/b/quotes/${id}` +
      "?checkout=success" +
      "&session_id={CHECKOUT_SESSION_ID}";

    const cancelUrl =
      `${baseUrl}/b/quotes/${id}` +
      "?checkout=cancelled";

    const metadata = {
      source: "trendre_link_quote",
      trendre_link_quote_id: id,
      trendre_link_inquiry_id:
        quote.inquiry_id,
      supabase_user_id: user.id,
      b_user_id: user.id,
      creator_user_id:
        quote.creator_user_id,
      payment_flow: "manual_capture",
      currency,
      quoted_amount: String(quoteAmount),
      buyer_marketplace_fee_amount: String(
        marketplaceFeeAmount
      ),
      buyer_total_amount: String(totalAmount),
      checkout_attempt: String(nextAttempt),
    };

    const session = await withTimeout(
      stripe.checkout.sessions.create(
        {
          mode: "payment",
          customer: customer.id,
          client_reference_id: id,
          payment_method_types: ["card"],
          line_items: lineItems,
          payment_intent_data: {
            capture_method: "manual",
            metadata,
          },
          metadata,
          success_url: successUrl,
          cancel_url: cancelUrl,
          allow_promotion_codes: false,
          expires_at:
            Math.floor(Date.now() / 1000) +
            30 * 60,
        },
        {
          idempotencyKey:
            `trendre-link-quote-checkout-` +
            `${id}-${nextAttempt}`,
        }
      ),
      STRIPE_SESSION_TIMEOUT_MS,
      "Stripe Checkoutの作成に時間がかかっています。"
    );

    createdSessionId = session.id;

    if (!session.url) {
      throw new Error(
        "stripe_checkout_url_missing"
      );
    }

    const { data: persisted, error: persistError } =
      await admin
        .from("creator_inquiry_quotes")
        .update({
          checkout_status: "open",
          stripe_checkout_session_id:
            session.id,
          checkout_last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("company_user_id", user.id)
        .eq("status", "accepted")
        .eq("checkout_status", "creating")
        .eq(
          "checkout_attempt_count",
          nextAttempt
        )
        .select("id")
        .maybeSingle();

    if (persistError || !persisted) {
      try {
        await stripe.checkout.sessions.expire(
          session.id
        );
      } catch (expireError) {
        console.warn(
          "orphan quote checkout session could not be expired",
          {
            quoteId: id,
            sessionId: session.id,
            cause: safeStripeError(expireError),
          }
        );
      }

      throw new Error(
        "quote_checkout_session_persist_failed"
      );
    }

    return NextResponse.json<QuoteCheckoutResponse>(
      {
        ok: true,
        url: session.url,
        checkoutSessionId: session.id,
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "company quote checkout failed",
      {
        quoteId: id,
        sessionId: createdSessionId,
        cause: safeStripeError(error),
      }
    );

    if (claimedAttempt !== null) {
      try {
        await admin
          .from("creator_inquiry_quotes")
          .update({
            checkout_status: "failed",
            checkout_last_error:
              safeStripeError(error),
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .eq("checkout_status", "creating")
          .eq(
            "checkout_attempt_count",
            claimedAttempt
          );
      } catch {
        // Preserve the original checkout error.
      }
    }

    return errorResponse(
      "決済画面を作成できませんでした。時間を置いてもう一度お試しください。",
      500
    );
  }
}