// File: app/api/b/orders/[id]/complete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Json } from "@/types/database.types";
import {
  buildLineMessage,
  sendLineTextToUserId,
} from "@/lib/notifications/line";

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
  product_name: string | null;
  menu_title_snapshot: string | null;
  creator_payout_amount: number | null;
  currency: string | null;
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

function getOrderTitle(
  order: Pick<OrderForComplete, "product_name" | "menu_title_snapshot">
) {
  const productName = order.product_name?.trim();
  const menuTitle = order.menu_title_snapshot?.trim();

  return productName || menuTitle || "注文";
}

function formatAmount(value: number | null | undefined, currency: string | null) {
  if (value == null) {
    return null;
  }

  const safeCurrency = currency || "JPY";

  try {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: safeCurrency === "JPY" ? 0 : 2,
    }).format(value);
  } catch {
    return safeCurrency === "USD"
      ? `$${Number(value).toLocaleString()}`
      : `¥${Number(value).toLocaleString()}`;
  }
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

async function safeSendOrderCompletedLineNotification(args: {
  order: OrderForComplete;
  payoutStatus: PayoutStatus;
  payoutDueAt: string | null;
}) {
  try {
    if (!args.order.creator_user_id) {
      return;
    }

    const amountText = formatAmount(
      args.order.creator_payout_amount,
      args.order.currency
    );

    const bodyLines = [
      "納品が承認され、注文が完了しました。",
      "",
      `案件：${getOrderTitle(args.order)}`,
    ];

    if (amountText) {
      bodyLines.push(`報酬予定：${amountText}`);
    }

    bodyLines.push("", "報酬ページにも反映されます。");

    const message = buildLineMessage({
      title: "納品が承認されました",
      body: bodyLines.join("\n"),
      linkPath: `/creator/orders/${args.order.id}`,
    });

    const result = await sendLineTextToUserId(args.order.creator_user_id, message, {
      notificationType: "order_completed",
      creatorId: args.order.creator_id,
      entityType: "order",
      entityId: args.order.id,
    });

    if (!result?.ok) {
      console.warn("order completed LINE notification not sent:", {
        orderId: args.order.id,
        creatorUserId: args.order.creator_user_id,
        payoutStatus: args.payoutStatus,
        payoutDueAt: args.payoutDueAt,
        skipped: result?.skipped ?? false,
        error: result?.error ?? null,
      });
    }
  } catch (error) {
    console.warn("order completed LINE notification skipped:", error);
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
        payout_paid_at,
        product_name,
        menu_title_snapshot,
        creator_payout_amount,
        currency
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

    await safeSendOrderCompletedLineNotification({
      order,
      payoutStatus: nextPayoutStatus,
      payoutDueAt:
        nextPayoutStatus === "pending" ? payoutDueAt : order.payout_due_at,
    });

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
