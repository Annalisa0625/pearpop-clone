// File: app/api/admin/payouts/mark-paid/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminApi } from "@/lib/admin/guard";
import type { Json } from "@/types/database.types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PayoutMethod = "manual_bank_transfer" | "stripe_connect";

type PayoutStatus = "unpaid" | "pending" | "paid" | "withheld" | "failed";

type MarkPaidBody = {
  order_ids?: unknown;
  paid_at?: unknown;
  note?: unknown;
};

type OrderPayoutRow = {
  id: string;
  b_user_id: string;
  creator_id: string | null;
  creator_user_id: string;
  status: string;
  payment_status: string;
  payout_method: PayoutMethod | null;
  payout_status: PayoutStatus | null;
  payout_due_at: string | null;
  payout_paid_at: string | null;
  payout_note: string | null;
  creator_payout_amount: number | null;
  currency: string | null;
};

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOrderIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of value) {
    const id = getString(item);

    if (!id) continue;
    if (seen.has(id)) continue;

    seen.add(id);
    result.push(id);
  }

  return result;
}

function normalizePaidAt(value: unknown) {
  const text = getString(value);

  if (!text) {
    return new Date().toISOString();
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
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

function getAmount(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? Math.round(amount) : 0;
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

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdminApi();

    if (!admin.ok) {
      return admin.response;
    }

    const body = (await req.json().catch(() => null)) as MarkPaidBody | null;

    if (!body) {
      return NextResponse.json(
        { error: "リクエスト内容を取得できませんでした" },
        { status: 400 }
      );
    }

    const orderIds = normalizeOrderIds(body.order_ids);
    const paidAt = normalizePaidAt(body.paid_at);
    const note = getString(body.note) || "Admin manual payout marked as paid";

    if (orderIds.length === 0) {
      return NextResponse.json(
        { error: "支払済みにする注文IDを選択してください" },
        { status: 400 }
      );
    }

    if (!paidAt) {
      return NextResponse.json(
        { error: "支払日の形式が正しくありません" },
        { status: 400 }
      );
    }

    const { data: orders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select(
        `
        id,
        b_user_id,
        creator_id,
        creator_user_id,
        status,
        payment_status,
        payout_method,
        payout_status,
        payout_due_at,
        payout_paid_at,
        payout_note,
        creator_payout_amount,
        currency
      `
      )
      .in("id", orderIds);

    if (ordersError) {
      console.error("admin mark paid orders error:", ordersError);
      throw ordersError;
    }

    const safeOrders = ((orders ?? []) as OrderPayoutRow[]).filter(Boolean);

    if (safeOrders.length === 0) {
      return NextResponse.json(
        { error: "対象の注文が見つかりませんでした" },
        { status: 404 }
      );
    }

    const foundOrderIds = new Set(safeOrders.map((order) => order.id));
    const missingOrderIds = orderIds.filter((id) => !foundOrderIds.has(id));

    const invalidOrders = safeOrders.filter((order) => {
      const payoutMethod = normalizePayoutMethod(order.payout_method);
      const payoutStatus = normalizePayoutStatus(order.payout_status);

      return (
        order.status !== "completed" ||
        order.payment_status !== "captured" ||
        payoutMethod !== "manual_bank_transfer" ||
        payoutStatus !== "pending"
      );
    });

    if (invalidOrders.length > 0) {
      return NextResponse.json(
        {
          error:
            "支払済みにできない注文が含まれています。completed / captured / manual_bank_transfer / pending の注文のみ対象です。",
          invalid_order_ids: invalidOrders.map((order) => order.id),
          missing_order_ids: missingOrderIds,
        },
        { status: 409 }
      );
    }

    const nowIso = new Date().toISOString();

    const { data: updatedRows, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        payout_status: "paid",
        payout_paid_at: paidAt,
        payout_note: note,
        updated_at: nowIso,
      })
      .in(
        "id",
        safeOrders.map((order) => order.id)
      )
      .select(
        `
        id,
        creator_user_id,
        creator_payout_amount,
        currency,
        payout_status,
        payout_paid_at
      `
      );

    if (updateError) {
      console.error("admin mark paid update error:", updateError);
      throw updateError;
    }

    const updated = (updatedRows ?? []) as Array<{
      id: string;
      creator_user_id: string;
      creator_payout_amount: number | null;
      currency: string | null;
      payout_status: string | null;
      payout_paid_at: string | null;
    }>;

    for (const order of safeOrders) {
      await safeInsertOrderEvent({
        orderId: order.id,
        actorUserId: admin.userId,
        eventType: "creator_payout_marked_paid",
        eventData: {
          payout_method: normalizePayoutMethod(order.payout_method),
          previous_payout_status: normalizePayoutStatus(order.payout_status),
          payout_status: "paid",
          payout_paid_at: paidAt,
          payout_note: note,
          creator_payout_amount: getAmount(order.creator_payout_amount),
          currency: order.currency || "JPY",
        },
      });
    }

    const totalAmount = safeOrders.reduce(
      (sum, order) => sum + getAmount(order.creator_payout_amount),
      0
    );

    return NextResponse.json({
      ok: true,
      updated_count: updated.length,
      requested_count: orderIds.length,
      missing_order_ids: missingOrderIds,
      order_ids: updated.map((order) => order.id),
      payout_status: "paid",
      payout_paid_at: paidAt,
      total_amount: totalAmount,
      currency: "JPY",
    });
  } catch (error) {
    console.error("admin payouts mark paid error:", error);

    return NextResponse.json(
      { error: "支払済み更新に失敗しました" },
      { status: 500 }
    );
  }
}