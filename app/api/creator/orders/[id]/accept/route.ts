// File: app/api/creator/orders/[id]/accept/route.ts
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { isOrderCreator, shouldRepairAcceptedOrder } from "@/lib/orders/order-acceptance";
import { completeOrderPaymentActionEffects } from "@/lib/orders/order-payment-action-effects";
import {
  executeOrderPaymentAction,
  OrderPaymentActionError,
  type OrderPaymentActionRow,
} from "@/lib/orders/order-payment-action";
import { orderPaymentActionStore } from "@/lib/orders/order-payment-action-server";
import { getStripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PayoutMethod = "manual_bank_transfer" | "stripe_connect";
type CreatorPayoutState = {
  id: string;
  user_id: string;
  stripe_account_id: string | null;
  stripe_onboarding_completed: boolean | null;
};
type PayoutProfile = {
  payout_method: PayoutMethod | null;
  status: "not_submitted" | "submitted" | "verified" | "rejected" | null;
};
type OrderForAccept = OrderPaymentActionRow & {
  creator_id: string;
  stripe_payment_status: string | null;
  payout_method: PayoutMethod | null;
  payout_status: string | null;
};

async function getAuthenticatedUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
  if (!token) return { user: null, error: "認証トークンがありません" };

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return { user: null, error: "認証に失敗しました" };
  return { user, error: null };
}

function normalizePayoutMethod(value: unknown): PayoutMethod {
  return value === "stripe_connect" ? "stripe_connect" : "manual_bank_transfer";
}

function isManualPayoutReady(profile: PayoutProfile | null) {
  if (!profile) return false;
  return normalizePayoutMethod(profile.payout_method) === "manual_bank_transfer" &&
    (profile.status === "submitted" || profile.status === "verified");
}

function isStripeConnectReady(args: {
  creator: CreatorPayoutState | null;
  payoutMethod: PayoutMethod;
}) {
  return args.payoutMethod === "stripe_connect" &&
    !!args.creator?.stripe_account_id &&
    args.creator.stripe_onboarding_completed === true;
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return NextResponse.json({
    ok: true,
    route: "creator order accept",
    order_id: id,
    message: "POST this route to accept and capture the order. Manual bank payout is supported.",
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
      .select(`
        id, b_user_id, creator_id, creator_user_id, creator_menu_id,
        trendre_link_quote_id, trendre_link_inquiry_id,
        status, payment_status, stripe_payment_status,
        stripe_payment_intent_id, stripe_amount, currency,
        creator_accept_deadline, payment_action_type,
        payment_action_token, payment_action_state,
        payment_action_started_at, payment_action_execution_started_at,
        payment_action_updated_at, payment_action_effects_completed_at,
        payment_action_reconcile_attempted_at,
        payment_action_effects_attempted_at,
        payment_action_auto_cancel_attempted_at,
        payout_method, payout_status
      `)
      .eq("id", orderId)
      .maybeSingle();
    if (orderError) throw orderError;

    const order = orderRow as OrderForAccept | null;
    if (!order) {
      return NextResponse.json({ error: "注文が見つかりませんでした" }, { status: 404 });
    }
    if (!isOrderCreator(order, user.id)) {
      return NextResponse.json({ error: "この注文を受諾する権限がありません" }, { status: 403 });
    }

    const { data: creatorRow, error: creatorError } = await supabaseAdmin
      .from("creators")
      .select("id, user_id, stripe_account_id, stripe_onboarding_completed")
      .eq("user_id", user.id)
      .maybeSingle();
    if (creatorError) throw creatorError;
    const creator = (creatorRow ?? null) as CreatorPayoutState | null;
    if (!creator || creator.id !== order.creator_id) {
      return NextResponse.json({ error: "クリエイター情報が見つかりませんでした" }, { status: 404 });
    }

    const payoutMethod = normalizePayoutMethod(order.payout_method);
    const { data: payoutProfileRow, error: payoutProfileError } = await supabaseAdmin
      .from("creator_payout_profiles")
      .select("payout_method, status")
      .eq("creator_id", creator.id)
      .maybeSingle();
    if (payoutProfileError) throw payoutProfileError;
    const payoutProfile = (payoutProfileRow ?? null) as PayoutProfile | null;
    const manualPayoutReady = payoutMethod === "manual_bank_transfer" &&
      isManualPayoutReady(payoutProfile);
    const stripeConnectReady = isStripeConnectReady({ creator, payoutMethod });
    if (!manualPayoutReady && !stripeConnectReady) {
      return NextResponse.json({
        error: "報酬受け取り設定が未完了です。設定後に注文を受諾してください。",
        redirect_to: "/creator/payouts",
      }, { status: 403 });
    }

    if (shouldRepairAcceptedOrder(order)) {
      const { chatId } = await completeOrderPaymentActionEffects({
        order,
        outcome: { kind: "accepted", stripeStatus: "succeeded" },
        actorUserId: user.id,
      });
      return NextResponse.json({
        ok: true,
        order_id: order.id,
        chat_id: chatId,
        status: order.status,
        payment_status: order.payment_status,
        stripe_payment_status: order.stripe_payment_status,
        payout_method: payoutMethod,
        payout_status: order.payout_status || "unpaid",
      });
    }

    const stripe = getStripe();
    let actionResult;
    try {
      actionResult = await executeOrderPaymentAction({
        order,
        action: "accept",
        claimToken: randomUUID(),
        expectedCreatorUserId: user.id,
        store: orderPaymentActionStore,
        gateway: {
          retrieve: (id) => stripe.paymentIntents.retrieve(id),
          capture: (id, key) => stripe.paymentIntents.capture(id, {}, { idempotencyKey: key }),
          cancel: (id, key) => stripe.paymentIntents.cancel(
            id,
            { cancellation_reason: "abandoned" },
            { idempotencyKey: key }
          ),
        },
      });
    } catch (error) {
      if (error instanceof OrderPaymentActionError) {
        const deadlineError = error.code === "deadline_missing" || error.code === "deadline_expired";
        return NextResponse.json({
          error: deadlineError
            ? "この注文の受諾期限を過ぎているため、受諾できません"
            : "この注文は現在受諾できません",
          error_code: error.code,
        }, { status: error.code === "payment_intent_missing" ? 400 : 409 });
      }
      throw error;
    }

    if (actionResult.kind === "conflict" || actionResult.kind === "processing") {
      return NextResponse.json({
        error: "この注文は別の決済処理中です。しばらく待ってから再度お試しください",
        error_code: actionResult.kind === "processing"
          ? "stripe_capture_in_progress"
          : "order_payment_action_conflict",
      }, { status: 409 });
    }
    if (actionResult.kind !== "accepted") {
      return NextResponse.json({
        error: "この注文のオーソリはすでに取り消されているため受諾できません",
        error_code: "payment_intent_canceled",
      }, { status: 409 });
    }

    const { chatId } = await completeOrderPaymentActionEffects({
      order,
      outcome: { kind: "accepted", stripeStatus: actionResult.stripeStatus },
      actorUserId: user.id,
    });

    return NextResponse.json({
      ok: true,
      order_id: order.id,
      chat_id: chatId,
      status: "accepted_captured",
      payment_status: "captured",
      stripe_payment_status: actionResult.stripeStatus,
      payout_method: payoutMethod,
      payout_status: order.payout_status || "unpaid",
    });
  } catch (error) {
    console.error("creator order accept error", error);
    return NextResponse.json({ error: "注文の受諾処理に失敗しました" }, { status: 500 });
  }
}
