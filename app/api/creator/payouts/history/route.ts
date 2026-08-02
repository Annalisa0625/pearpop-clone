// File: app/api/creator/payouts/history/route.ts

import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AuthResult = {
  user: User | null;
  error: string | null;
};

type CreatorRow = {
  id: string;
  user_id: string;
};

type PayoutItemRow = {
  id: string;
  payout_batch_id: string;
  creator_id: string;
  creator_user_id: string;
  status: string;
  gross_amount: number;
  adjustment_amount: number;
  withholding_amount: number;
  transfer_fee: number;
  net_amount: number | null;
  currency: string;
  paid_at: string | null;
  created_at: string;
};

type PayoutOrderItemRow = {
  payout_item_id: string;
  order_id: string;
  creator_payout_amount: number;
};

type OrderRow = {
  id: string;
  product_name: string | null;
  completed_at: string | null;
  payout_paid_at: string | null;
  creator_payout_amount: number | null;
  currency: string | null;
};

type PayoutBatchRow = {
  id: string;
  batch_code: string | null;
  status: string;
  scheduled_date: string | null;
  paid_at: string | null;
};

async function getAuthenticatedUser(req: NextRequest): Promise<AuthResult> {
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

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  );
}

function toInteger(value: unknown) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? Math.round(numberValue) : 0;
}

export async function GET(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(req);

    if (authError || !user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const { data: creatorData, error: creatorError } = await supabaseAdmin
      .from("creators")
      .select("id, user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (creatorError) {
      throw creatorError;
    }

    const creator = (creatorData as CreatorRow | null) ?? null;

    if (!creator) {
      return NextResponse.json(
        { error: "クリエイター情報が見つかりませんでした" },
        { status: 404 },
      );
    }

    const db = supabaseAdmin as any;

    const { data: payoutItemData, error: payoutItemsError } = await db
      .from("payout_items")
      .select(
        `
        id,
        payout_batch_id,
        creator_id,
        creator_user_id,
        status,
        gross_amount,
        adjustment_amount,
        withholding_amount,
        transfer_fee,
        net_amount,
        currency,
        paid_at,
        created_at
      `,
      )
      .eq("creator_id", creator.id)
      .eq("creator_user_id", user.id)
      .eq("status", "paid")
      .order("paid_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(100);

    if (payoutItemsError) {
      throw payoutItemsError;
    }

    const payoutItems = ((payoutItemData ?? []) as PayoutItemRow[]).filter(
      Boolean,
    );

    if (payoutItems.length === 0) {
      return NextResponse.json({
        ok: true,
        settlements: [],
      });
    }

    const payoutItemIds = payoutItems.map((item) => item.id);
    const batchIds = uniqueStrings(
      payoutItems.map((item) => item.payout_batch_id),
    );

    const { data: payoutOrderItemData, error: payoutOrderItemsError } = await db
      .from("payout_order_items")
      .select("payout_item_id, order_id, creator_payout_amount")
      .in("payout_item_id", payoutItemIds);

    if (payoutOrderItemsError) {
      throw payoutOrderItemsError;
    }

    const payoutOrderItems = (
      (payoutOrderItemData ?? []) as PayoutOrderItemRow[]
    ).filter(Boolean);

    const orderIds = uniqueStrings(
      payoutOrderItems.map((item) => item.order_id),
    );

    let orders: OrderRow[] = [];

    if (orderIds.length > 0) {
      const { data: orderData, error: ordersError } = await db
        .from("orders")
        .select(
          `
          id,
          product_name,
          completed_at,
          payout_paid_at,
          creator_payout_amount,
          currency
        `,
        )
        .eq("creator_user_id", user.id)
        .in("id", orderIds);

      if (ordersError) {
        throw ordersError;
      }

      orders = ((orderData ?? []) as OrderRow[]).filter(Boolean);
    }

    let batches: PayoutBatchRow[] = [];

    if (batchIds.length > 0) {
      const { data: batchData, error: batchesError } = await db
        .from("payout_batches")
        .select("id, batch_code, status, scheduled_date, paid_at")
        .in("id", batchIds);

      if (batchesError) {
        throw batchesError;
      }

      batches = ((batchData ?? []) as PayoutBatchRow[]).filter(Boolean);
    }

    const orderById = new Map(orders.map((order) => [order.id, order]));
    const batchById = new Map(batches.map((batch) => [batch.id, batch]));

    const ordersByPayoutItemId = new Map<string, PayoutOrderItemRow[]>();

    for (const link of payoutOrderItems) {
      const current = ordersByPayoutItemId.get(link.payout_item_id) ?? [];
      current.push(link);
      ordersByPayoutItemId.set(link.payout_item_id, current);
    }

    const settlements = payoutItems.map((item) => {
      const batch = batchById.get(item.payout_batch_id) ?? null;
      const linkedOrders = ordersByPayoutItemId.get(item.id) ?? [];

      return {
        id: item.id,
        payout_batch_id: item.payout_batch_id,
        batch_code: batch?.batch_code ?? null,
        status: item.status,
        gross_amount: toInteger(item.gross_amount),
        adjustment_amount: toInteger(item.adjustment_amount),
        withholding_amount: toInteger(item.withholding_amount),
        transfer_fee: toInteger(item.transfer_fee),
        net_amount: toInteger(item.net_amount),
        currency: item.currency || "JPY",
        scheduled_date: batch?.scheduled_date ?? null,
        paid_at: item.paid_at ?? batch?.paid_at ?? null,
        orders: linkedOrders.map((link) => {
          const order = orderById.get(link.order_id) ?? null;

          return {
            id: link.order_id,
            product_name: order?.product_name ?? null,
            completed_at: order?.completed_at ?? null,
            payout_paid_at: order?.payout_paid_at ?? null,
            creator_payout_amount: toInteger(link.creator_payout_amount),
            currency: order?.currency || item.currency || "JPY",
          };
        }),
      };
    });

    return NextResponse.json({
      ok: true,
      settlements,
    });
  } catch (error) {
    console.error("creator payout history error", error);

    return NextResponse.json(
      {
        error: "支払済み報酬の取得に失敗しました",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}