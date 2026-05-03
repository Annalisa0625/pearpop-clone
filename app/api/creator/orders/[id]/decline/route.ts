// File: app/api/creator/orders/[id]/decline/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select(
        `
        id,
        b_user_id,
        creator_id,
        creator_user_id,
        status,
        payment_status,
        stripe_payment_intent_id
      `
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      throw orderError;
    }

    if (!order) {
      return NextResponse.json(
        { error: "注文が見つかりませんでした" },
        { status: 404 }
      );
    }

    if (order.creator_user_id !== user.id) {
      return NextResponse.json(
        { error: "この注文を辞退する権限がありません" },
        { status: 403 }
      );
    }

    if (
      order.status !== "authorized_pending_creator" ||
      order.payment_status !== "authorized"
    ) {
      return NextResponse.json(
        { error: "この注文は現在辞退できません" },
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

    let nextStripeStatus = currentPaymentIntent.status;

    if (currentPaymentIntent.status === "requires_capture") {
      const canceledPaymentIntent = await stripe.paymentIntents.cancel(
        order.stripe_payment_intent_id,
        {
          cancellation_reason: "requested_by_customer",
        }
      );

      nextStripeStatus = canceledPaymentIntent.status;
    }

    const nowIso = new Date().toISOString();

    if (nextStripeStatus !== "canceled") {
      await supabaseAdmin
        .from("orders")
        .update({
          status: "cancel_failed",
          payment_status: "failed",
          stripe_payment_status: nextStripeStatus,
          updated_at: nowIso,
        })
        .eq("id", order.id);

      await supabaseAdmin.from("order_events").insert({
        order_id: order.id,
        actor_user_id: user.id,
        event_type: "stripe_cancel_failed",
        event_data: {
          stripe_payment_intent_id: order.stripe_payment_intent_id,
          stripe_payment_intent_status: nextStripeStatus,
        },
      });

      return NextResponse.json(
        { error: "Stripe与信の取消に失敗しました" },
        { status: 500 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        status: "declined_canceled",
        payment_status: "canceled",
        stripe_payment_status: nextStripeStatus,
        declined_at: nowIso,
        canceled_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", order.id);

    if (updateError) {
      throw updateError;
    }

    await supabaseAdmin.from("order_events").insert({
      order_id: order.id,
      actor_user_id: user.id,
      event_type: "creator_declined_and_stripe_canceled",
      event_data: {
        stripe_payment_intent_id: order.stripe_payment_intent_id,
        stripe_payment_intent_status: nextStripeStatus,
      },
    });

    return NextResponse.json({
      ok: true,
      order_id: order.id,
      status: "declined_canceled",
      payment_status: "canceled",
      stripe_payment_status: nextStripeStatus,
    });
  } catch (error) {
    console.error("creator order decline error", error);

    return NextResponse.json(
      { error: "注文の辞退処理に失敗しました" },
      { status: 500 }
    );
  }
}