// File: app/api/creator/orders/[id]/decline/route.ts
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import {
  executeOrderPaymentAction,
  OrderPaymentActionError,
  type OrderPaymentActionRow,
} from "@/lib/orders/order-payment-action";
import { completeOrderPaymentActionEffects } from "@/lib/orders/order-payment-action-effects";
import { orderPaymentActionStore } from "@/lib/orders/order-payment-action-server";
import { getStripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
        id, b_user_id, creator_user_id, creator_menu_id,
        trendre_link_quote_id, trendre_link_inquiry_id,
        status, payment_status, stripe_payment_intent_id,
        stripe_amount, currency, creator_accept_deadline,
        payment_action_type, payment_action_token, payment_action_state,
        payment_action_started_at, payment_action_execution_started_at,
        payment_action_updated_at, payment_action_effects_completed_at,
        payment_action_reconcile_attempted_at,
        payment_action_effects_attempted_at,
        payment_action_auto_cancel_attempted_at
      `)
      .eq("id", orderId)
      .maybeSingle();
    if (orderError) throw orderError;
    const order = orderRow as OrderPaymentActionRow | null;
    if (!order) {
      return NextResponse.json({ error: "注文が見つかりませんでした" }, { status: 404 });
    }
    if (order.creator_user_id !== user.id) {
      return NextResponse.json({ error: "この注文を辞退する権限がありません" }, { status: 403 });
    }

    const stripe = getStripe();
    let result;
    try {
      result = await executeOrderPaymentAction({
        order,
        action: "decline",
        claimToken: randomUUID(),
        expectedCreatorUserId: user.id,
        store: orderPaymentActionStore,
        gateway: {
          retrieve: (id) => stripe.paymentIntents.retrieve(id),
          capture: (id, key) => stripe.paymentIntents.capture(id, {}, { idempotencyKey: key }),
          cancel: (id, key) => stripe.paymentIntents.cancel(
            id,
            { cancellation_reason: "requested_by_customer" },
            { idempotencyKey: key }
          ),
        },
      });
    } catch (error) {
      if (error instanceof OrderPaymentActionError) {
        return NextResponse.json({
          error: error.code === "deadline_expired"
            ? "この注文は返答期限を過ぎているため辞退処理できません"
            : "この注文は現在辞退できません",
          error_code: error.code,
        }, { status: error.code === "payment_intent_missing" ? 400 : 409 });
      }
      throw error;
    }

    if (result.kind === "conflict" || result.kind === "processing") {
      return NextResponse.json({
        error: "この注文は別の決済処理中です。しばらく待ってから再度お試しください",
        error_code: result.kind === "processing"
          ? "stripe_cancel_in_progress"
          : "order_payment_action_conflict",
      }, { status: 409 });
    }
    if (result.kind === "accepted") {
      await completeOrderPaymentActionEffects({
        order,
        outcome: { kind: "accepted", stripeStatus: "succeeded" },
        actorUserId: user.id,
      });
      return NextResponse.json({
        error: "決済がすでに確定しているため辞退できません",
        error_code: "payment_intent_already_succeeded",
      }, { status: 409 });
    }

    await completeOrderPaymentActionEffects({
      order,
      outcome: {
        kind: "canceled",
        action: result.action,
        stripeStatus: result.stripeStatus,
      },
      actorUserId: user.id,
    });

    return NextResponse.json({
      ok: true,
      order_id: order.id,
      status: result.action === "decline" ? "declined_canceled" : "expired_canceled",
      payment_status: "canceled",
      stripe_payment_status: result.stripeStatus,
    });
  } catch (error) {
    console.error("creator order decline error", error);
    return NextResponse.json({ error: "注文の辞退処理に失敗しました" }, { status: 500 });
  }
}
