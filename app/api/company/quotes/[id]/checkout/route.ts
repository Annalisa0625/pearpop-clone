import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import type Stripe from "stripe";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getBaseUrl, getStripe } from "@/lib/stripe";
import { UUID_PATTERN } from "@/lib/trendre-link/items-server";
import { allowQuoteAccessRequest } from "@/lib/trendre-link/request-rate-limit";
import { getQuoteCheckoutRejection, isOwnedQuoteCheckout } from "@/lib/trendre-link/quote-checkout-policy";
import {
  checkoutIdempotencyKey,
  checkoutEmailHash,
  isAmbiguousStripeCreateError,
  parseStoredCheckoutRequest,
  validateTrendreLinkCheckoutSession,
  type StoredTrendreLinkCheckoutRequest,
} from "@/lib/trendre-link/quote-checkout-session";
import { getCheckoutBaseUrl } from "@/lib/trendre-link/quote-checkout-url";
import { getQuoteCheckoutAmounts } from "@/lib/trendre-link/quote-checkout-amount";
import { authorizeCheckoutCompany } from "@/lib/trendre-link/quote-checkout-company";
import { decideCheckoutAttempt } from "@/lib/trendre-link/quote-checkout-attempt";
import { createStripeSessionForClaim } from "@/lib/trendre-link/quote-checkout-execution";

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
  attemptToken: string;
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
    args.stripe.customers.create(
      {
        email: args.email,
        name: args.companyName || args.email,
        metadata: {
          supabase_user_id: args.userId,
          source: "trendre_link_quote",
        },
      },
      {
        idempotencyKey: `trendre-link-customer-${args.userId}-${args.attemptToken}`,
      }
    ),
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
  let claimedUpdatedAt: string | null = null;
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
      .select("inquiry_id,quote_id,user_id")
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
        checkout_attempt_token,
        checkout_session_request,
        stripe_checkout_session_id,
        stripe_payment_intent_id,
        checkout_started_at,
        checkout_completed_at,
        valid_until,
        updated_at
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
      !isOwnedQuoteCheckout({
        userId: user.id,
        accessUserId: access.user_id,
        accessInquiryId: access.inquiry_id,
        quoteCompanyUserId: quote.company_user_id,
        quoteInquiryId: quote.inquiry_id,
      })
    ) {
      return errorResponse(
        "見積もりが見つかりません。",
        404
      );
    }

    const checkoutRejection = getQuoteCheckoutRejection({
      status: quote.status,
      validUntil: quote.valid_until,
    });
    if (checkoutRejection) return errorResponse(checkoutRejection, 409);

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

    const amounts = getQuoteCheckoutAmounts({
      quotedAmount: quote.quoted_amount,
      marketplaceFeeAmount: quote.buyer_marketplace_fee_amount,
      buyerTotalAmount: quote.buyer_total_amount,
      currency: quote.currency,
    });
    if (!amounts.ok) {
      return errorResponse(
        amounts.reason === "currency"
          ? "この見積もりの通貨には対応していません。"
          : amounts.reason === "total"
            ? "見積もりの合計金額が一致していません。"
            : "見積もりの決済金額を確認できませんでした。",
        amounts.reason === "total" ? 409 : 400
      );
    }

    const companyAuthorization = await authorizeCheckoutCompany({
      userId: user.id,
      loadCompany: async (userId) => {
        const { data, error } = await admin
          .from("companies")
          .select("user_id,approval_status,company_name,contact_email")
          .eq("user_id", userId)
          .maybeSingle();
        if (error) throw new Error("quote_checkout_company_load_failed");
        return data;
      },
    });
    if (!companyAuthorization.ok) {
      return errorResponse(
        companyAuthorization.reason === "not_approved"
          ? "承認済みの企業アカウントでログインしてください。"
          : "企業アカウントを確認できませんでした。",
        403
      );
    }
    const approvedCompany = companyAuthorization.company;
    const checkoutEmail = user.email || approvedCompany.contact_email || null;
    if (!checkoutEmail) {
      return errorResponse(
        "決済に必要なメールアドレスを取得できませんでした。",
        400
      );
    }
    const storedEmailHash =
      quote &&
      typeof quote.checkout_session_request === "object" &&
      quote.checkout_session_request !== null &&
      !Array.isArray(quote.checkout_session_request) &&
      typeof (quote.checkout_session_request as Record<string, unknown>).metadata === "object" &&
      (quote.checkout_session_request as Record<string, unknown>).metadata !== null
        ? ((quote.checkout_session_request as Record<string, { checkout_customer_email_sha256?: unknown }>).metadata
            .checkout_customer_email_sha256 ?? null)
        : null;
    let checkoutCustomerEmailHash =
      typeof storedEmailHash === "string" && /^[0-9a-f]{64}$/i.test(storedEmailHash)
        ? storedEmailHash.toLowerCase()
        : checkoutEmailHash(checkoutEmail);
    const {
      quoteAmount,
      marketplaceFeeAmount,
      totalAmount,
      currency,
      quoteStripeAmount,
      feeStripeAmount,
      totalStripeAmount,
    } = amounts;

    const { data: checkoutCreator, error: checkoutCreatorError } = await admin
      .from("creators")
      .select("id,stripe_account_id,stripe_onboarding_completed")
      .eq("user_id", quote.creator_user_id)
      .maybeSingle();
    if (checkoutCreatorError || !checkoutCreator) {
      throw new Error("quote_checkout_creator_load_failed");
    }
    const { data: payoutProfile, error: payoutProfileError } = await admin
      .from("creator_payout_profiles")
      .select("payout_method,status")
      .eq("creator_id", checkoutCreator.id)
      .maybeSingle();
    if (payoutProfileError) {
      throw new Error("quote_checkout_payout_profile_load_failed");
    }
    const payoutMethod =
      payoutProfile?.payout_method === "stripe_connect"
        ? "stripe_connect"
        : "manual_bank_transfer";
    const payoutReady =
      (payoutMethod === "manual_bank_transfer" &&
        (payoutProfile?.status === "submitted" || payoutProfile?.status === "verified")) ||
      (payoutMethod === "stripe_connect" &&
        Boolean(checkoutCreator.stripe_account_id) &&
        checkoutCreator.stripe_onboarding_completed === true);
    if (!payoutReady) {
      return errorResponse(
        "このクリエイターは現在、報酬受け取り設定が未完了のため支払いへ進めません。",
        409
      );
    }

    const stripe = getStripe();
    const baseUrl = getCheckoutBaseUrl({
      requestOrigin: request.nextUrl.origin,
      fallbackBaseUrl: getBaseUrl(),
      vercelEnv: process.env.VERCEL_ENV,
      vercelUrl: process.env.VERCEL_URL,
      vercelBranchUrl: process.env.VERCEL_BRANCH_URL,
    });

    let checkoutStatus =
      typeof quote.checkout_status === "string"
        ? quote.checkout_status
        : "not_started";

    let existingSessionId =
      typeof quote.stripe_checkout_session_id === "string"
        ? quote.stripe_checkout_session_id
        : null;
    let attemptToken =
      typeof quote.checkout_attempt_token === "string"
        ? quote.checkout_attempt_token
        : null;
    let checkoutRequest = parseStoredCheckoutRequest(
      quote.checkout_session_request,
      {
        quoteId: id,
        inquiryId: quote.inquiry_id,
        companyUserId: user.id,
        creatorUserId: quote.creator_user_id,
        amountTotal: totalStripeAmount,
        currency,
        customerEmailHash: checkoutCustomerEmailHash,
      }
    );

    if (existingSessionId) {
      try {
        const existingSession = await withTimeout(
          stripe.checkout.sessions.retrieve(
            existingSessionId
          ),
          STRIPE_TIMEOUT_MS,
          "既存のStripe Checkout確認に時間がかかっています。"
        );

        if (!checkoutRequest) {
          return errorResponse(
            "保存済みの決済情報を安全に確認できませんでした。サポートへお問い合わせください。",
            409
          );
        }
        const sessionMismatch = validateTrendreLinkCheckoutSession(
          existingSession,
          {
            quoteId: id,
            inquiryId: quote.inquiry_id,
            companyUserId: user.id,
            creatorUserId: quote.creator_user_id,
            sessionId: existingSessionId,
            customerId: checkoutRequest.customer,
            amountTotal: totalStripeAmount,
            currency,
            customerEmailHash: checkoutCustomerEmailHash,
            paymentIntentId: quote.stripe_payment_intent_id,
            allowedStatuses: ["open", "complete", "expired"],
          }
        );
        const lifecycleMismatch =
          checkoutStatus === "completed" && existingSession.status !== "complete"
            ? "session_lifecycle_mismatch"
            : null;
        if (sessionMismatch || lifecycleMismatch) {
          console.error("quote checkout stored session mismatch", {
            quoteId: id,
            reason: sessionMismatch ?? lifecycleMismatch,
          });
          return errorResponse(
            "保存済みの決済情報が見積もりと一致しません。サポートへお問い合わせください。",
            409
          );
        }

        if (
          existingSession.status === "open" &&
          existingSession.url
        ) {
          if (checkoutStatus !== "open") {
            const { data: opened, error: openError } = await admin
              .from("creator_inquiry_quotes")
              .update({
                checkout_status: "open",
                checkout_last_error: null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", id)
              .eq("company_user_id", user.id)
              .eq("stripe_checkout_session_id", existingSession.id)
              .select("id")
              .maybeSingle();
            if (openError || !opened) {
              throw openError ?? new Error("quote_checkout_open_state_update_failed");
            }
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
          const { data: completed, error: completeError } = await admin
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
            .eq("company_user_id", user.id)
            .eq("stripe_checkout_session_id", existingSession.id)
            .select("id")
            .maybeSingle();
          if (completeError || !completed) {
            throw completeError ?? new Error("quote_checkout_complete_state_update_failed");
          }

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
          const { data: expired, error: expireStateError } = await admin
            .from("creator_inquiry_quotes")
            .update({
              checkout_status: "expired",
              stripe_checkout_session_id: null,
              stripe_payment_intent_id: null,
              checkout_attempt_token: null,
              checkout_session_request: null,
              checkout_last_error: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .eq("company_user_id", user.id)
            .eq("stripe_checkout_session_id", existingSession.id)
            .select("id")
            .maybeSingle();
          if (expireStateError || !expired) {
            throw expireStateError ?? new Error("quote_checkout_expired_state_update_failed");
          }

          checkoutStatus = "expired";
          existingSessionId = null;
          attemptToken = null;
          checkoutRequest = null;
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
          checkout_attempt_token: null,
          checkout_session_request: null,
            checkout_last_error:
              "stripe_checkout_session_not_found",
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .eq("company_user_id", user.id);

        checkoutStatus = "failed";
        existingSessionId = null;
        attemptToken = null;
        checkoutRequest = null;
      }
    }

    if (checkoutStatus === "completed") {
      return errorResponse(
        "この見積もりの支払いはすでに完了しています。",
        409
      );
    }

    const currentAttempt = Number.isInteger(Number(quote.checkout_attempt_count))
      ? Number(quote.checkout_attempt_count)
      : 0;
    let activeAttempt = currentAttempt;
    const attemptDecision = decideCheckoutAttempt({
      checkoutStatus,
      hasSessionId: Boolean(existingSessionId),
      attemptCount: currentAttempt,
      attemptToken,
      checkoutStartedAt: quote.checkout_started_at,
      lockUpdatedAt: quote.updated_at,
    });

    if (attemptDecision.action === "busy") {
      return errorResponse(
        "決済画面を準備しています。少し待ってからもう一度お試しください。",
        409
      );
    }

    if (attemptDecision.action === "recovery_required") {
      const { data: recoveryRequired, error: recoveryRequiredError } = await admin
        .from("creator_inquiry_quotes")
        .update({
          checkout_status: "recovery_required",
          checkout_last_error: attemptDecision.reason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("company_user_id", user.id)
        .eq("checkout_attempt_count", currentAttempt)
        .eq("checkout_status", checkoutStatus)
        .eq("updated_at", quote.updated_at)
        .select("id")
        .maybeSingle();
      if (recoveryRequiredError) {
        throw new Error("quote_checkout_recovery_required_update_failed");
      }
      if (!recoveryRequired) {
        return errorResponse(
          "別の決済処理が進行しています。少し待ってからもう一度お試しください。",
          409
        );
      }
      return errorResponse(
        "決済状態を確認中のため、新しい決済画面は作成できません。サポートへお問い合わせください。",
        409
      );
    }

    if (attemptDecision.action === "recover") {
      if (!attemptToken) {
        return errorResponse(
          "決済状態を安全に確認できませんでした。サポートへお問い合わせください。",
          409
        );
      }

      const recoveryStartedAt = new Date().toISOString();
      const { data: recovered, error: recoveryError } = await admin
        .from("creator_inquiry_quotes")
        .update({
          checkout_status: "creating",
          checkout_last_error: null,
          updated_at: recoveryStartedAt,
        })
        .eq("id", id)
        .eq("company_user_id", user.id)
        .eq("status", "accepted")
        .gt("valid_until", new Date().toISOString())
        .eq("checkout_attempt_count", currentAttempt)
        .eq("checkout_attempt_token", attemptToken)
        .eq("updated_at", quote.updated_at)
        .in("checkout_status", ["creating", "open"])
        .select("checkout_attempt_count,checkout_attempt_token")
        .maybeSingle();
      if (recoveryError) throw new Error("quote_checkout_recovery_lock_failed");
      if (!recovered) {
        return errorResponse(
          "別の決済処理が進行しています。少し待ってからもう一度お試しください。",
          409
        );
      }
      claimedAttempt = currentAttempt;
      claimedUpdatedAt = recoveryStartedAt;
    } else {
      const nextAttempt = currentAttempt + 1;
      attemptToken = randomUUID();
      const startedAt = new Date().toISOString();
      const { data: claimed, error: claimError } = await admin
        .from("creator_inquiry_quotes")
        .update({
          checkout_status: "creating",
          checkout_attempt_count: nextAttempt,
          checkout_attempt_token: attemptToken,
          checkout_session_request: null,
          stripe_checkout_session_id: null,
          stripe_payment_intent_id: null,
          checkout_started_at: startedAt,
          checkout_completed_at: null,
          checkout_last_error: null,
          updated_at: startedAt,
        })
        .eq("id", id)
        .eq("company_user_id", user.id)
        .eq("status", "accepted")
        .gt("valid_until", startedAt)
        .eq("checkout_attempt_count", currentAttempt)
        .in("checkout_status", ["not_started", "failed", "expired", "cancelled"])
        .select("checkout_attempt_count,checkout_attempt_token")
        .maybeSingle();
      if (claimError) throw new Error("quote_checkout_lock_update_failed");
      if (!claimed) {
        return errorResponse(
          "別の決済処理が進行しています。少し待ってからもう一度お試しください。",
          409
        );
      }
      activeAttempt = nextAttempt;
      claimedAttempt = nextAttempt;
      claimedUpdatedAt = startedAt;
    }

    if (!attemptToken) {
      throw new Error("quote_checkout_attempt_token_missing");
    }

    const [
      { data: inquiry, error: inquiryError },
      { data: linkPage },
      { data: creator },
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
        email: checkoutEmail,
        companyName:
          approvedCompany.company_name ||
          inquiry.company_name ||
          null,
         existingCustomerId:
           userState?.stripe_customer_id ||
           null,
         attemptToken,
        });

    if (!checkoutRequest) {
      checkoutCustomerEmailHash = checkoutEmailHash(customer.email || checkoutEmail);
    }

    if (userState) {
      await admin
        .from("user_states")
        .update({
          stripe_customer_id: customer.id,
        })
        .eq("user_id", user.id);
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
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
      payout_method: payoutMethod,
      currency,
      quoted_amount: String(quoteAmount),
      buyer_marketplace_fee_amount: String(
        marketplaceFeeAmount
      ),
      buyer_total_amount: String(totalAmount),
      checkout_attempt: String(activeAttempt),
      checkout_customer_email_sha256: checkoutCustomerEmailHash,
    };

    if (!checkoutRequest) {
      checkoutRequest = {
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
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      } satisfies StoredTrendreLinkCheckoutRequest;

      const requestPersistedAt = new Date().toISOString();
      const { data: requestPersisted, error: requestPersistError } = await admin
        .from("creator_inquiry_quotes")
        .update({
          checkout_session_request: checkoutRequest,
          updated_at: requestPersistedAt,
        })
        .eq("id", id)
        .eq("company_user_id", user.id)
        .eq("checkout_status", "creating")
        .eq("checkout_attempt_count", activeAttempt)
        .eq("checkout_attempt_token", attemptToken)
        .select("id")
        .maybeSingle();
      if (requestPersistError || !requestPersisted) {
        throw new Error("quote_checkout_request_persist_failed");
      }
      claimedUpdatedAt = requestPersistedAt;
    }

    const session = await createStripeSessionForClaim({
      verifyClaim: async () => {
        if (!claimedUpdatedAt) return false;
        const { data, error } = await admin
          .from("creator_inquiry_quotes")
          .select("id")
          .eq("id", id)
          .eq("company_user_id", user.id)
          .eq("checkout_status", "creating")
          .eq("checkout_attempt_count", activeAttempt)
          .eq("checkout_attempt_token", attemptToken)
          .eq("updated_at", claimedUpdatedAt)
          .maybeSingle();
        if (error) throw new Error("quote_checkout_claim_verify_failed");
        return Boolean(data);
      },
      createSession: () =>
        withTimeout(
          stripe.checkout.sessions.create(checkoutRequest, {
            idempotencyKey: checkoutIdempotencyKey(id, attemptToken),
          }),
          STRIPE_SESSION_TIMEOUT_MS,
          "stripe_checkout_result_unknown"
        ),
    });

    createdSessionId = session.id;
    const createdSessionMismatch = validateTrendreLinkCheckoutSession(session, {
      quoteId: id,
      inquiryId: quote.inquiry_id,
      companyUserId: user.id,
      creatorUserId: quote.creator_user_id,
      sessionId: session.id,
      customerId: checkoutRequest.customer,
      amountTotal: totalStripeAmount,
      currency,
      customerEmailHash: checkoutCustomerEmailHash,
      allowedStatuses: ["open", "complete", "expired"],
    });
    if (createdSessionMismatch) {
      throw new Error(`stripe_checkout_session_mismatch:${createdSessionMismatch}`);
    }
    if (session.status === "open" && !session.url) {
      throw new Error("stripe_checkout_url_missing");
    }

    const { data: persisted, error: persistError } =
      await admin
        .from("creator_inquiry_quotes")
        .update({
          checkout_status: session.status === "expired" ? "expired" : session.status,
          stripe_checkout_session_id: session.status === "expired" ? null : session.id,
          stripe_payment_intent_id:
            typeof session.payment_intent === "string" ? session.payment_intent : null,
          checkout_attempt_token: session.status === "expired" ? null : attemptToken,
          checkout_session_request: session.status === "expired" ? null : checkoutRequest,
          checkout_completed_at:
            session.status === "complete" ? new Date().toISOString() : null,
          checkout_last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("company_user_id", user.id)
        .eq("status", "accepted")
        .eq("checkout_status", "creating")
        .eq("checkout_attempt_count", activeAttempt)
        .eq("checkout_attempt_token", attemptToken)
        .select("id")
        .maybeSingle();

    if (persistError || !persisted) {
      throw new Error("quote_checkout_session_persist_unknown");
    }

    if (session.status === "expired") {
      return errorResponse(
        "以前の決済画面は期限切れです。もう一度お試しください。",
        409
      );
    }

    if (session.status === "complete") {
      return NextResponse.json<QuoteCheckoutResponse>({
        ok: true,
        completed: true,
        duplicate: true,
        checkoutSessionId: session.id,
        redirectTo:
          `${baseUrl}/b/quotes/${id}?checkout=success&session_id=` +
          encodeURIComponent(session.id),
      });
    }

    return NextResponse.json<QuoteCheckoutResponse>(
      {
        ok: true,
        url: session.url ?? undefined,
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
      const resultUnknown =
        createdSessionId !== null || isAmbiguousStripeCreateError(error);
      try {
        const { error: stateError } = await admin
          .from("creator_inquiry_quotes")
          .update({
            checkout_status: resultUnknown ? "creating" : "failed",
            ...(resultUnknown
              ? {}
              : {
                  checkout_attempt_token: null,
                  checkout_session_request: null,
                }),
            checkout_last_error:
              resultUnknown
                ? "stripe_checkout_result_unknown"
                : safeStripeError(error),
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .eq("checkout_status", "creating")
          .eq(
            "checkout_attempt_count",
            claimedAttempt
          );
        if (stateError) {
          console.error("quote checkout failure state could not be persisted", {
            quoteId: id,
            cause: stateError.message,
          });
        }
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
