// File: app/api/admin/orders/auto-cancel-unaccepted/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DueOrderRow = {
  id: string;
  b_user_id: string;
  creator_user_id: string;
  status: string;
  payment_status: string;
  stripe_payment_intent_id: string | null;
  stripe_payment_status: string | null;
  creator_accept_deadline: string | null;
};

type AuthResult = {
  ok: boolean;
  actorUserId: string | null;
  authType: "admin" | "cron" | null;
  error?: string;
  status?: number;
};

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  return token || null;
}

async function authenticateAdminOrCron(request: NextRequest): Promise<AuthResult> {
  const token = getBearerToken(request);

  if (!token) {
    return {
      ok: false,
      actorUserId: null,
      authType: null,
      error: "認証トークンがありません。",
      status: 401,
    };
  }

  const cronSecret = process.env.CRON_SECRET?.trim();

  if (cronSecret && token === cronSecret) {
    return {
      ok: true,
      actorUserId: null,
      authType: "cron",
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    return {
      ok: false,
      actorUserId: null,
      authType: null,
      error: "認証に失敗しました。",
      status: 401,
    };
  }

  const { data: roleRow, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError) {
    console.error("auto cancel admin role check error:", roleError);

    return {
      ok: false,
      actorUserId: null,
      authType: null,
      error: "管理者権限の確認に失敗しました。",
      status: 500,
    };
  }

  if (!roleRow) {
    return {
      ok: false,
      actorUserId: null,
      authType: null,
      error: "管理者のみ実行できます。",
      status: 403,
    };
  }

  return {
    ok: true,
    actorUserId: user.id,
    authType: "admin",
  };
}

async function autoCancelUnacceptedOrders(actorUserId: string | null) {
  const nowIso = new Date().toISOString();

  const { data: dueOrders, error: loadError } = await supabaseAdmin
    .from("orders")
    .select(
      `
      id,
      b_user_id,
      creator_user_id,
      status,
      payment_status,
      stripe_payment_intent_id,
      stripe_payment_status,
      creator_accept_deadline
    `
    )
    .eq("status", "authorized_pending_creator")
    .eq("payment_status", "authorized")
    .not("stripe_payment_intent_id", "is", null)
    .not("creator_accept_deadline", "is", null)
    .lte("creator_accept_deadline", nowIso);

  if (loadError) {
    throw loadError;
  }

  const orders = (dueOrders ?? []) as DueOrderRow[];

  if (orders.length === 0) {
    return {
      scannedAt: nowIso,
      canceledCount: 0,
      canceledOrderIds: [] as string[],
      skippedOrderIds: [] as string[],
    };
  }

  const stripe = getStripe();
  const canceledOrderIds: string[] = [];
  const skippedOrderIds: string[] = [];

  for (const order of orders) {
    const paymentIntentId = order.stripe_payment_intent_id;

    if (!paymentIntentId) {
      skippedOrderIds.push(order.id);
      continue;
    }

    try {
      const currentPaymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId
      );

      let nextStripeStatus = currentPaymentIntent.status;

      if (currentPaymentIntent.status === "requires_capture") {
        const canceledPaymentIntent = await stripe.paymentIntents.cancel(
          paymentIntentId,
          {
            cancellation_reason: "abandoned",
          }
        );

        nextStripeStatus = canceledPaymentIntent.status;
      }

      const canceledAt = new Date().toISOString();

      if (nextStripeStatus !== "canceled") {
        const { error: failedUpdateError } = await supabaseAdmin
          .from("orders")
          .update({
            status: "cancel_failed",
            payment_status: "failed",
            stripe_payment_status: nextStripeStatus,
            updated_at: canceledAt,
          })
          .eq("id", order.id);

        if (failedUpdateError) {
          console.error("auto cancel failed-status update error:", {
            orderId: order.id,
            failedUpdateError,
          });
        }

        await supabaseAdmin.from("order_events").insert({
          order_id: order.id,
          actor_user_id: actorUserId,
          event_type: "stripe_auto_cancel_failed_after_72h",
          event_data: {
            stripe_payment_intent_id: paymentIntentId,
            stripe_payment_intent_status: nextStripeStatus,
            creator_accept_deadline: order.creator_accept_deadline,
          },
        });

        skippedOrderIds.push(order.id);
        continue;
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from("orders")
        .update({
          status: "expired_canceled",
          payment_status: "canceled",
          stripe_payment_status: nextStripeStatus,
          canceled_at: canceledAt,
          updated_at: canceledAt,
        })
        .eq("id", order.id)
        .eq("status", "authorized_pending_creator")
        .eq("payment_status", "authorized")
        .select("id")
        .maybeSingle();

      if (updateError) {
        console.error("auto cancel order update error:", {
          orderId: order.id,
          updateError,
        });

        skippedOrderIds.push(order.id);
        continue;
      }

      if (!updated?.id) {
        skippedOrderIds.push(order.id);
        continue;
      }

      canceledOrderIds.push(updated.id);

      const { error: eventError } = await supabaseAdmin
        .from("order_events")
        .insert({
          order_id: order.id,
          actor_user_id: actorUserId,
          event_type: "order_auto_canceled_unaccepted_after_72h",
          event_data: {
            stripe_payment_intent_id: paymentIntentId,
            stripe_payment_intent_status: nextStripeStatus,
            creator_accept_deadline: order.creator_accept_deadline,
          },
        });

      if (eventError) {
        console.error("auto cancel order event insert error:", {
          orderId: order.id,
          eventError,
        });
      }
    } catch (error) {
      console.error("auto cancel single order error:", {
        orderId: order.id,
        error,
      });

      skippedOrderIds.push(order.id);
    }
  }

  return {
    scannedAt: nowIso,
    canceledCount: canceledOrderIds.length,
    canceledOrderIds,
    skippedOrderIds,
  };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAdminOrCron(request);

    if (!auth.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: auth.error,
        },
        {
          status: auth.status ?? 401,
        }
      );
    }

    const result = await autoCancelUnacceptedOrders(auth.actorUserId);

    return NextResponse.json({
      ok: true,
      authType: auth.authType,
      ...result,
    });
  } catch (error) {
    console.error("auto cancel unaccepted orders error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "未承認注文の自動キャンセル処理に失敗しました。",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "admin orders auto-cancel-unaccepted",
    auth: {
      adminBearer: true,
      cronSecret: !!process.env.CRON_SECRET,
    },
    message:
      "POST this route with Authorization: Bearer <admin access token> or Authorization: Bearer <CRON_SECRET> to cancel authorized orders whose creator_accept_deadline has passed.",
  });
}