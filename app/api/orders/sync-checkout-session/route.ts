// File: app/api/orders/sync-checkout-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
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

function getPaymentIntentFromSession(session: Stripe.Checkout.Session) {
  const paymentIntent = session.payment_intent;

  if (!paymentIntent) {
    return null;
  }

  if (typeof paymentIntent === "string") {
    return {
      id: paymentIntent,
      status: null as Stripe.PaymentIntent.Status | null,
    };
  }

  return {
    id: paymentIntent.id,
    status: paymentIntent.status,
  };
}

function addHoursIso(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(req);

    if (authError || !user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const sessionId =
      typeof body?.session_id === "string" ? body.session_id.trim() : "";

    if (!sessionId) {
      return NextResponse.json(
        { error: "Checkout session id がありません" },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    const orderId =
      session.metadata?.order_id ||
      (typeof session.client_reference_id === "string"
        ? session.client_reference_id
        : null);

    if (!orderId) {
      return NextResponse.json(
        { error: "注文IDを取得できませんでした" },
        { status: 400 }
      );
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select(
        `
        id,
        b_user_id,
        status,
        payment_status,
        stripe_checkout_session_id,
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

    if (order.b_user_id !== user.id) {
      return NextResponse.json(
        { error: "この注文を確認する権限がありません" },
        { status: 403 }
      );
    }

    if (
      order.stripe_checkout_session_id &&
      order.stripe_checkout_session_id !== session.id
    ) {
      return NextResponse.json(
        { error: "Checkout session が注文と一致しません" },
        { status: 400 }
      );
    }

    const paymentIntentInfo = getPaymentIntentFromSession(session);

    if (!paymentIntentInfo?.id) {
      return NextResponse.json(
        { error: "PaymentIntent を取得できませんでした" },
        { status: 400 }
      );
    }

    let paymentIntentStatus = paymentIntentInfo.status;

    if (!paymentIntentStatus) {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentInfo.id
      );
      paymentIntentStatus = paymentIntent.status;
    }

    const nowIso = new Date().toISOString();

    if (paymentIntentStatus === "requires_capture") {
      const shouldSetDeadline =
        order.status === "checkout_pending" ||
        order.payment_status === "checkout_pending";

      const creatorAcceptDeadline = shouldSetDeadline ? addHoursIso(48) : null;

      const patch: Record<string, string | null> = {
        status: "authorized_pending_creator",
        payment_status: "authorized",
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: paymentIntentInfo.id,
        stripe_payment_status: paymentIntentStatus,
        authorized_at: nowIso,
        updated_at: nowIso,
      };

      if (creatorAcceptDeadline) {
        patch.creator_accept_deadline = creatorAcceptDeadline;
      }

      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update(patch)
        .eq("id", order.id);

      if (updateError) {
        throw updateError;
      }

      await supabaseAdmin.from("order_events").insert({
        order_id: order.id,
        actor_user_id: user.id,
        event_type: "stripe_authorized_requires_capture",
        event_data: {
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: paymentIntentInfo.id,
          stripe_payment_intent_status: paymentIntentStatus,
          creator_accept_deadline: creatorAcceptDeadline,
        },
      });

      return NextResponse.json({
        ok: true,
        order_id: order.id,
        status: "authorized_pending_creator",
        payment_status: "authorized",
        payment_intent_status: paymentIntentStatus,
        creator_accept_deadline: creatorAcceptDeadline,
      });
    }

    if (paymentIntentStatus === "succeeded") {
      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update({
          status: "accepted_captured",
          payment_status: "captured",
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: paymentIntentInfo.id,
          stripe_payment_status: paymentIntentStatus,
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
        event_type: "stripe_payment_succeeded_unexpected",
        event_data: {
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: paymentIntentInfo.id,
          stripe_payment_intent_status: paymentIntentStatus,
        },
      });

      return NextResponse.json({
        ok: true,
        order_id: order.id,
        status: "accepted_captured",
        payment_status: "captured",
        payment_intent_status: paymentIntentStatus,
      });
    }

    if (paymentIntentStatus === "canceled") {
      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update({
          status: "declined_canceled",
          payment_status: "canceled",
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: paymentIntentInfo.id,
          stripe_payment_status: paymentIntentStatus,
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
        event_type: "stripe_payment_intent_canceled",
        event_data: {
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: paymentIntentInfo.id,
          stripe_payment_intent_status: paymentIntentStatus,
        },
      });

      return NextResponse.json({
        ok: true,
        order_id: order.id,
        status: "declined_canceled",
        payment_status: "canceled",
        payment_intent_status: paymentIntentStatus,
      });
    }

    await supabaseAdmin.from("order_events").insert({
      order_id: order.id,
      actor_user_id: user.id,
      event_type: "stripe_checkout_synced_without_state_change",
      event_data: {
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: paymentIntentInfo.id,
        stripe_payment_intent_status: paymentIntentStatus,
        checkout_payment_status: session.payment_status,
      },
    });

    return NextResponse.json({
      ok: true,
      order_id: order.id,
      status: order.status,
      payment_status: order.payment_status,
      payment_intent_status: paymentIntentStatus,
      message: "まだ注文状態は更新されていません",
    });
  } catch (error) {
    console.error("orders sync checkout session error", error);

    return NextResponse.json(
      { error: "Checkout結果の同期に失敗しました" },
      { status: 500 }
    );
  }
}