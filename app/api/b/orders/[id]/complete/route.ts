// File: app/api/b/orders/[id]/complete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Json } from "@/types/database.types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PayoutMethod = "manual_bank_transfer" | "stripe_connect";

type PayoutStatus = "unpaid" | "pending" | "paid" | "withheld" | "failed";

type OrderForComplete = {
  id: string;
  b_user_id: string;
  creator_id: string | null;
  creator_user_id: string;
  status: string;
  payment_status: string;
  delivered_post_url: string | null;
  completed_at: string | null;
  payout_method: PayoutMethod | null;
  payout_status: PayoutStatus | null;
  payout_due_at: string | null;
  payout_paid_at: string | null;
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

function normalizePayoutStatus(value: unknown): PayoutStatus {
  if (value === "paid") return "paid";
  if (value === "withheld") return "withheld";
  if (value === "failed") return "failed";
  if (value === "pending") return "pending";
  return "unpaid";
}

/**
 * 月末締め・翌月末払いのMVP用。
 * JSTの翌月末 23:59:59.999 をUTC ISOに変換して保存します。
 */
function getNextMonthEndDueAtIso(from = new Date()) {
  const jstNow = new Date(from.getTime() + 9 * 60 * 60 * 1000);

  const jstYear = jstNow.getUTCFullYear();
  const jstMonth = jstNow.getUTCMonth();

  // JST翌月末 23:59:59.999 = UTC 14:59:59.999
  const dueAtUtc = new Date(
    Date.UTC(jstYear, jstMonth + 2, 0, 14, 59, 59, 999)
  );

  return dueAtUtc.toISOString();
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
        delivered_post_url,
        completed_at,
        payout_method,
        payout_status,
        payout_due_at,
        payout_paid_at
      `
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      throw orderError;
    }

    const order = orderRow as OrderForComplete | null;

    if (!order) {
      return NextResponse.json(
        { error: "注文が見つかりませんでした" },
        { status: 404 }
      );
    }

    if (order.b_user_id !== user.id) {
      return NextResponse.json(
        { error: "この注文を完了する権限がありません" },
        { status: 403 }
      );
    }

    const payoutMethod = normalizePayoutMethod(order.payout_method);
    const currentPayoutStatus = normalizePayoutStatus(order.payout_status);

    if (order.status === "completed") {
      return NextResponse.json({
        ok: true,
        order_id: order.id,
        status: "completed",
        completed_at: order.completed_at,
        payout_method: payoutMethod,
        payout_status: currentPayoutStatus,
        payout_due_at: order.payout_due_at,
        payout_paid_at: order.payout_paid_at,
      });
    }

    if (order.status !== "delivered") {
      return NextResponse.json(
        { error: "この注文は現在完了できません" },
        { status: 409 }
      );
    }

    if (order.payment_status !== "captured") {
      return NextResponse.json(
        { error: "決済確定済みの注文のみ完了できます" },
        { status: 409 }
      );
    }

    if (!order.delivered_post_url) {
      return NextResponse.json(
        { error: "納品URLが未提出です" },
        { status: 409 }
      );
    }

    const nowIso = new Date().toISOString();
    const payoutDueAt = getNextMonthEndDueAtIso(new Date(nowIso));

    const nextPayoutStatus: PayoutStatus =
      currentPayoutStatus === "paid" ||
      currentPayoutStatus === "withheld" ||
      currentPayoutStatus === "failed"
        ? currentPayoutStatus
        : "pending";

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        status: "completed",
        completed_at: nowIso,
        payout_method: payoutMethod,
        payout_status: nextPayoutStatus,
        payout_due_at:
          nextPayoutStatus === "pending" ? payoutDueAt : order.payout_due_at,
        updated_at: nowIso,
      })
      .eq("id", order.id);

    if (updateError) {
      throw updateError;
    }

    await safeInsertOrderEvent({
      orderId: order.id,
      actorUserId: user.id,
      eventType: "company_completed_order",
      eventData: {
        delivered_post_url: order.delivered_post_url,
        payout_method: payoutMethod,
        payout_status: nextPayoutStatus,
        payout_due_at:
          nextPayoutStatus === "pending" ? payoutDueAt : order.payout_due_at,
      },
    });

    if (nextPayoutStatus === "pending") {
      await safeInsertOrderEvent({
        orderId: order.id,
        actorUserId: user.id,
        eventType: "creator_payout_marked_pending",
        eventData: {
          payout_method: payoutMethod,
          payout_status: "pending",
          payout_due_at: payoutDueAt,
          rule: "month_end_close_next_month_end_manual_bank_transfer",
        },
      });
    }

    return NextResponse.json({
      ok: true,
      order_id: order.id,
      status: "completed",
      completed_at: nowIso,
      payout_method: payoutMethod,
      payout_status: nextPayoutStatus,
      payout_due_at:
        nextPayoutStatus === "pending" ? payoutDueAt : order.payout_due_at,
    });
  } catch (error) {
    console.error("company order complete error", error);

    return NextResponse.json(
      { error: "注文の完了処理に失敗しました" },
      { status: 500 }
    );
  }
}