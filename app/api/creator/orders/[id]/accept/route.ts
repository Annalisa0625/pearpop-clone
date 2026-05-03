// File: app/api/creator/orders/[id]/accept/route.ts
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
    message: "POST this route to accept and capture the order.",
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
        stripe_payment_intent_id,
        stripe_amount,
        currency
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
        { error: "この注文を承認する権限がありません" },
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

      await supabaseAdmin.from("order_events").insert({
        order_id: order.id,
        actor_user_id: user.id,
        event_type: "stripe_capture_failed",
        event_data: {
          stripe_payment_intent_id: order.stripe_payment_intent_id,
          stripe_payment_intent_status: capturedPaymentIntent.status,
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
        accepted_at: nowIso,
        captured_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", order.id);

    if (updateError) {
      throw updateError;
    }

    await supabaseAdmin.from("order_events").insert({
      order_id: order.id,
      actor_user_id: user.id,
      event_type: "creator_accepted_and_stripe_captured",
      event_data: {
        stripe_payment_intent_id: order.stripe_payment_intent_id,
        stripe_payment_intent_status: capturedPaymentIntent.status,
      },
    });

    return NextResponse.json({
      ok: true,
      order_id: order.id,
      status: "accepted_captured",
      payment_status: "captured",
      stripe_payment_status: capturedPaymentIntent.status,
    });
  } catch (error) {
    console.error("creator order accept error", error);

    return NextResponse.json(
      { error: "注文の承認処理に失敗しました" },
      { status: 500 }
    );
  }
}