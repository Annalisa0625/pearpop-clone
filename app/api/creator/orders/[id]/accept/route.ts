// File: app/api/creator/orders/[id]/accept/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStripe } from "@/lib/stripe";
import type { Json } from "@/types/database.types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PayoutMethod = "manual_bank_transfer" | "stripe_connect";

type PayoutProfileStatus =
  | "not_submitted"
  | "submitted"
  | "verified"
  | "rejected";

type CreatorPayoutState = {
  id: string;
  user_id: string;
  stripe_account_id: string | null;
  stripe_onboarding_completed: boolean | null;
};

type PayoutProfile = {
  payout_method: PayoutMethod | null;
  status: PayoutProfileStatus | null;
};

type OrderForAccept = {
  id: string;
  b_user_id: string;
  creator_id: string;
  creator_user_id: string;
  status: string;
  payment_status: string;
  stripe_payment_intent_id: string | null;
  stripe_amount: number | null;
  currency: string | null;
  payout_method: PayoutMethod | null;
  payout_status: string | null;
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

function normalizePayoutMethod(value: unknown): PayoutMethod {
  return value === "stripe_connect" ? "stripe_connect" : "manual_bank_transfer";
}

function isManualPayoutReady(profile: PayoutProfile | null) {
  if (!profile) return false;

  const method = normalizePayoutMethod(profile.payout_method);
  const status = profile.status ?? "not_submitted";

  return (
    method === "manual_bank_transfer" &&
    (status === "submitted" || status === "verified")
  );
}

function isStripeConnectReady(args: {
  creator: CreatorPayoutState | null;
  payoutMethod: PayoutMethod;
}) {
  return (
    args.payoutMethod === "stripe_connect" &&
    !!args.creator?.stripe_account_id &&
    args.creator?.stripe_onboarding_completed === true
  );
}

async function safeInsertOrderEvent(args: {
  orderId: string;
  actorUserId: string | null;
  eventType: string;
  eventData: Json;
}) {
  try {
    await supabaseAdmin.from("order_events").insert({
      order_id: args.orderId,
      actor_user_id: args.actorUserId,
      event_type: args.eventType,
      event_data: args.eventData,
    });
  } catch (error) {
    console.warn("order event insert skipped", error);
  }
}

// ルート存在確認用。
// ブラウザで直接 /api/creator/orders/[id]/accept を開いた時に、
// 404ではなくこのJSONが出れば、Next.jsがAPIルートを認識できています。
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  return NextResponse.json({
    ok: true,
    route: "creator order accept",
    order_id: id,
    message:
      "POST this route to accept and capture the order. Manual bank payout is supported.",
  });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await context.params;

  try {
    const { user, error: authError } = await getAuthenticatedUser(req);

    if (authError || !user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const { data: orderRow, error: orderError } = await supabaseAdmin
      .from("orders")
      .select(
        `
        id,
        b_user_id,
        creator_id,
        creator_user_id,
        status,
        payment_status,
        stripe_payment_intent_id,
        stripe_amount,
        currency,
        payout_method,
        payout_status
      `
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      throw orderError;
    }

    const order = orderRow as OrderForAccept | null;

    if (!order) {
      return NextResponse.json(
        { error: "注文が見つかりませんでした" },
        { status: 404 }
      );
    }

    if (order.creator_user_id !== user.id) {
      return NextResponse.json(
        { error: "この注文を承認する権限がありません" },
        { status: 403 }
      );
    }

    const { data: creatorRow, error: creatorError } = await supabaseAdmin
      .from("creators")
      .select(
        `
        id,
        user_id,
        stripe_account_id,
        stripe_onboarding_completed
      `
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (creatorError) {
      throw creatorError;
    }

    const creator = (creatorRow ?? null) as CreatorPayoutState | null;

    if (!creator || creator.id !== order.creator_id) {
      return NextResponse.json(
        { error: "インフルエンサー情報が見つかりませんでした" },
        { status: 404 }
      );
    }

    const payoutMethod = normalizePayoutMethod(order.payout_method);

    const { data: payoutProfileRow, error: payoutProfileError } =
      await supabaseAdmin
        .from("creator_payout_profiles")
        .select("payout_method, status")
        .eq("creator_id", creator.id)
        .maybeSingle();

    if (payoutProfileError) {
      throw payoutProfileError;
    }

    const payoutProfile = (payoutProfileRow ?? null) as PayoutProfile | null;

    const manualPayoutReady =
      payoutMethod === "manual_bank_transfer" &&
      isManualPayoutReady(payoutProfile);

    const stripeConnectReady = isStripeConnectReady({
      creator,
      payoutMethod,
    });

    if (!manualPayoutReady && !stripeConnectReady) {
      return NextResponse.json(
        {
          error:
            "報酬受け取り設定が未完了です。銀行口座を登録してから注文を承認してください。",
          redirect_to: "/creator/payouts",
        },
        { status: 403 }
      );
    }

    if (
      order.status !== "authorized_pending_creator" ||
      order.payment_status !== "authorized"
    ) {
      return NextResponse.json(
        { error: "この注文は現在承認できません" },
        { status: 409 }
      );
    }

    if (!order.stripe_payment_intent_id) {
      return NextResponse.json(
        { error: "PaymentIntentが見つかりません" },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    const currentPaymentIntent = await stripe.paymentIntents.retrieve(
      order.stripe_payment_intent_id
    );

    let capturedPaymentIntent = currentPaymentIntent;

    if (currentPaymentIntent.status === "requires_capture") {
      capturedPaymentIntent = await stripe.paymentIntents.capture(
        order.stripe_payment_intent_id
      );
    }

    const nowIso = new Date().toISOString();

    if (capturedPaymentIntent.status !== "succeeded") {
      await supabaseAdmin
        .from("orders")
        .update({
          status: "capture_failed",
          payment_status: "failed",
          stripe_payment_status: capturedPaymentIntent.status,
          updated_at: nowIso,
        })
        .eq("id", order.id);

      await safeInsertOrderEvent({
        orderId: order.id,
        actorUserId: user.id,
        eventType: "stripe_capture_failed",
        eventData: {
          stripe_payment_intent_id: order.stripe_payment_intent_id,
          stripe_payment_intent_status: capturedPaymentIntent.status,
          payout_method: payoutMethod,
        },
      });

      return NextResponse.json(
        { error: "Stripe決済の確定に失敗しました" },
        { status: 500 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        status: "accepted_captured",
        payment_status: "captured",
        stripe_payment_status: capturedPaymentIntent.status,
        payout_method: payoutMethod,
        payout_status: order.payout_status || "unpaid",
        accepted_at: nowIso,
        captured_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", order.id);

    if (updateError) {
      throw updateError;
    }

    await safeInsertOrderEvent({
      orderId: order.id,
      actorUserId: user.id,
      eventType: "creator_accepted_and_stripe_captured",
      eventData: {
        stripe_payment_intent_id: order.stripe_payment_intent_id,
        stripe_payment_intent_status: capturedPaymentIntent.status,
        payout_method: payoutMethod,
        payout_profile_status: payoutProfile?.status ?? null,
        manual_bank_transfer_ready: manualPayoutReady,
        stripe_connect_ready: stripeConnectReady,
        creator_stripe_account_id:
          payoutMethod === "stripe_connect"
            ? creator.stripe_account_id
            : null,
      },
    });

    return NextResponse.json({
      ok: true,
      order_id: order.id,
      status: "accepted_captured",
      payment_status: "captured",
      stripe_payment_status: capturedPaymentIntent.status,
      payout_method: payoutMethod,
      payout_status: order.payout_status || "unpaid",
    });
  } catch (error) {
    console.error("creator order accept error", error);

    return NextResponse.json(
      { error: "注文の承認処理に失敗しました" },
      { status: 500 }
    );
  }
}