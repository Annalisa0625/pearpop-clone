// File: app/api/admin/payouts/batches/mark-paid/route.ts

import { NextRequest, NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/guard";
import { createInAppNotification } from "@/lib/notifications/in-app";
import {
  buildLineMessage,
  sendLineTextToUserId,
} from "@/lib/notifications/line";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Json } from "@/types/database.types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type MarkBatchPaidBody = {
  batch_id?: unknown;
  paid_at?: unknown;
  note?: unknown;
  external_reference?: unknown;
};

type PayoutBatchRow = {
  id: string;
  batch_code: string | null;
  payout_method: string;
  status: string;
  total_orders: number;
  total_creators: number;
  total_payout_amount: number;
  total_transfer_fee: number;
  total_withholding_amount: number;
  total_adjustment_amount: number;
  total_net_amount: number;
  currency: string;
  csv_file_name: string | null;
  exported_at: string | null;
  submitted_at: string | null;
  paid_at: string | null;
  external_reference: string | null;
  admin_note: string | null;
};

type PayoutItemRow = {
  id: string;
  payout_batch_id: string;
  creator_id: string;
  creator_user_id: string;
  payout_method: string;
  status: string;
  gross_amount: number;
  adjustment_amount: number;
  withholding_amount: number;
  transfer_fee: number;
  net_amount: number | null;
  currency: string;
  external_reference: string | null;
  exported_at: string | null;
  submitted_at: string | null;
  paid_at: string | null;
};

type PayoutOrderItemRow = {
  payout_item_id: string;
  order_id: string;
  creator_payout_amount: number;
};

type OrderPayoutRow = {
  id: string;
  status: string;
  payment_status: string;
  payout_method: string | null;
  payout_status: string | null;
  payout_batch_id: string | null;
  payout_paid_at: string | null;
  payout_note: string | null;
  creator_payout_amount: number | null;
  currency: string | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getInteger(value: unknown) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? Math.round(amount) : 0;
}

function normalizePaidAt(value: unknown) {
  const text = getString(value);

  if (!text) {
    return new Date().toISOString();
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const date = new Date(`${text}T12:00:00+09:00`);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function chunkArray<T>(values: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value)))
  );
}

function sumBy<T>(values: T[], getter: (value: T) => unknown) {
  return values.reduce((total, value) => total + getInteger(getter(value)), 0);
}

function formatCurrency(amount: number, currency = "JPY") {
  try {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "JPY" ? 0 : 2,
    }).format(amount);
  } catch {
    return currency === "JPY"
      ? `¥${amount.toLocaleString("ja-JP")}`
      : `${amount.toLocaleString("ja-JP")} ${currency}`;
  }
}

function formatPaidDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

type CreatorPayoutNotificationTarget = {
  creatorUserId: string;
  creatorId: string | null;
  payoutItemIds: string[];
  orderIds: string[];
  grossAmount: number;
  transferFee: number;
  withholdingAmount: number;
  adjustmentAmount: number;
  netAmount: number;
  currency: string;
};

type PayoutNotificationSummary = {
  target_creators: number;
  in_app_sent: number;
  in_app_failed: number;
  line_sent: number;
  line_skipped: number;
  line_failed: number;
};

function buildCreatorPayoutNotificationTargets(args: {
  payoutItems: PayoutItemRow[];
  payoutOrderItems: PayoutOrderItemRow[];
}) {
  const orderIdsByPayoutItemId = new Map<string, string[]>();

  for (const orderItem of args.payoutOrderItems) {
    const current = orderIdsByPayoutItemId.get(orderItem.payout_item_id) ?? [];
    current.push(orderItem.order_id);
    orderIdsByPayoutItemId.set(orderItem.payout_item_id, current);
  }

  const targets = new Map<string, CreatorPayoutNotificationTarget>();

  for (const item of args.payoutItems) {
    const creatorUserId = item.creator_user_id?.trim();

    if (!creatorUserId) {
      continue;
    }

    const current = targets.get(creatorUserId) ?? {
      creatorUserId,
      creatorId: item.creator_id || null,
      payoutItemIds: [],
      orderIds: [],
      grossAmount: 0,
      transferFee: 0,
      withholdingAmount: 0,
      adjustmentAmount: 0,
      netAmount: 0,
      currency: item.currency || "JPY",
    };

    current.payoutItemIds.push(item.id);
    current.orderIds.push(...(orderIdsByPayoutItemId.get(item.id) ?? []));
    current.grossAmount += getInteger(item.gross_amount);
    current.transferFee += getInteger(item.transfer_fee);
    current.withholdingAmount += getInteger(item.withholding_amount);
    current.adjustmentAmount += getInteger(item.adjustment_amount);
    current.netAmount += getInteger(item.net_amount);

    targets.set(creatorUserId, current);
  }

  return Array.from(targets.values()).map((target) => ({
    ...target,
    payoutItemIds: uniqueStrings(target.payoutItemIds),
    orderIds: uniqueStrings(target.orderIds),
  }));
}

async function safeSendCreatorPayoutPaidNotifications(args: {
  payoutItems: PayoutItemRow[];
  payoutOrderItems: PayoutOrderItemRow[];
  batch: PayoutBatchRow;
  paidAt: string;
  actorUserId: string | null;
}) {
  const targets = buildCreatorPayoutNotificationTargets({
    payoutItems: args.payoutItems,
    payoutOrderItems: args.payoutOrderItems,
  });

  const summary: PayoutNotificationSummary = {
    target_creators: targets.length,
    in_app_sent: 0,
    in_app_failed: 0,
    line_sent: 0,
    line_skipped: 0,
    line_failed: 0,
  };

  for (const target of targets) {
    const bodyLines = [
      `報酬総額：${formatCurrency(target.grossAmount, target.currency)}`,
      `振込手数料：-${formatCurrency(target.transferFee, target.currency)}`,
    ];

    if (target.withholdingAmount > 0) {
      bodyLines.push(
        `源泉徴収：-${formatCurrency(
          target.withholdingAmount,
          target.currency
        )}`
      );
    }

    if (target.adjustmentAmount !== 0) {
      const adjustmentPrefix = target.adjustmentAmount > 0 ? "+" : "-";
      bodyLines.push(
        `調整額：${adjustmentPrefix}${formatCurrency(
          Math.abs(target.adjustmentAmount),
          target.currency
        )}`
      );
    }

    bodyLines.push(
      `実際の受取額：${formatCurrency(target.netAmount, target.currency)}`,
      `振込日：${formatPaidDate(args.paidAt)}`,
      "",
      "報酬画面で明細を確認できます。"
    );

    try {
      const inAppResult = await createInAppNotification({
        recipientUserId: target.creatorUserId,
        actorUserId: args.actorUserId,
        notificationType: "creator_payout_paid",
        title: "報酬を振り込みました",
        body: bodyLines.join("\n"),
        linkPath: "/creator/payouts",
        entityType: "payout_batch",
        entityId: args.batch.id,
        importance: "high",
        dedupeKey: `creator_payout_paid:${args.batch.id}:${target.creatorUserId}`,
        metadata: {
          payout_batch_id: args.batch.id,
          batch_code: args.batch.batch_code,
          payout_item_ids: target.payoutItemIds,
          order_ids: target.orderIds,
          gross_amount: target.grossAmount,
          transfer_fee: target.transferFee,
          withholding_amount: target.withholdingAmount,
          adjustment_amount: target.adjustmentAmount,
          net_amount: target.netAmount,
          currency: target.currency,
          paid_at: args.paidAt,
        },
      });

      if (inAppResult.ok) {
        summary.in_app_sent += 1;
      } else {
        summary.in_app_failed += 1;
        console.warn("creator payout in-app notification not sent:", {
          payoutBatchId: args.batch.id,
          creatorUserId: target.creatorUserId,
          skipped: inAppResult.skipped,
          error: inAppResult.error,
        });
      }
    } catch (error) {
      summary.in_app_failed += 1;
      console.warn("creator payout in-app notification skipped:", {
        payoutBatchId: args.batch.id,
        creatorUserId: target.creatorUserId,
        error,
      });
    }

    try {
      const lineMessage = buildLineMessage({
        title: "報酬の振込が完了しました",
        body:
          "今回の受取額や対象案件は、\nTrendMartの報酬画面からご確認ください。",
        linkPath: "/creator/payouts",
      });

      const lineResult = await sendLineTextToUserId(
        target.creatorUserId,
        lineMessage,
        {
          notificationType: "creator_payout_paid",
          creatorId: target.creatorId,
          entityType: "payout_batch",
          entityId: args.batch.id,
        }
      );

      if (lineResult.ok) {
        summary.line_sent += 1;
      } else if (lineResult.skipped) {
        summary.line_skipped += 1;
        console.warn("creator payout LINE notification skipped:", {
          payoutBatchId: args.batch.id,
          creatorUserId: target.creatorUserId,
          error: lineResult.error,
        });
      } else {
        summary.line_failed += 1;
        console.warn("creator payout LINE notification failed:", {
          payoutBatchId: args.batch.id,
          creatorUserId: target.creatorUserId,
          error: lineResult.error,
        });
      }
    } catch (error) {
      summary.line_failed += 1;
      console.warn("creator payout LINE notification exception:", {
        payoutBatchId: args.batch.id,
        creatorUserId: target.creatorUserId,
        error,
      });
    }
  }

  return summary;
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
    console.warn("payout batch paid order event insert skipped", error);
  }
}

async function restoreOrders(db: any, orders: OrderPayoutRow[]) {
  for (const order of orders) {
    try {
      await db
        .from("orders")
        .update({
          payout_status: order.payout_status,
          payout_paid_at: order.payout_paid_at,
          payout_note: order.payout_note,
        })
        .eq("id", order.id);
    } catch (error) {
      console.error("payout batch paid order rollback failed:", order.id, error);
    }
  }
}

async function restorePayoutItems(db: any, items: PayoutItemRow[]) {
  for (const item of items) {
    try {
      await db
        .from("payout_items")
        .update({
          status: item.status,
          external_reference: item.external_reference,
          submitted_at: item.submitted_at,
          paid_at: item.paid_at,
        })
        .eq("id", item.id);
    } catch (error) {
      console.error(
        "payout batch paid item rollback failed:",
        item.id,
        error
      );
    }
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdminApi();

  if (!admin.ok) {
    return admin.response;
  }

  const db = supabaseAdmin as any;

  let originalItems: PayoutItemRow[] = [];
  let originalOrders: OrderPayoutRow[] = [];
  let itemsUpdated = false;
  let ordersUpdated = false;
  let batchCompleted = false;

  try {
    const body = (await req.json().catch(() => null)) as
      | MarkBatchPaidBody
      | null;

    if (!body) {
      return NextResponse.json(
        { error: "リクエスト内容を取得できませんでした" },
        { status: 400 }
      );
    }

    const batchId = getString(body.batch_id);
    const paidAt = normalizePaidAt(body.paid_at);
    const note =
      getString(body.note).slice(0, 500) ||
      "GMOあおぞら銀行の振込完了を管理者が確認";
    const externalReference =
      getString(body.external_reference).slice(0, 200) || null;

    if (!UUID_PATTERN.test(batchId)) {
      return NextResponse.json(
        { error: "振込バッチIDの形式が正しくありません" },
        { status: 400 }
      );
    }

    if (!paidAt) {
      return NextResponse.json(
        { error: "振込完了日の形式が正しくありません" },
        { status: 400 }
      );
    }

    const { data: batchData, error: batchError } = await db
      .from("payout_batches")
      .select(
        `
        id,
        batch_code,
        payout_method,
        status,
        total_orders,
        total_creators,
        total_payout_amount,
        total_transfer_fee,
        total_withholding_amount,
        total_adjustment_amount,
        total_net_amount,
        currency,
        csv_file_name,
        exported_at,
        submitted_at,
        paid_at,
        external_reference,
        admin_note
      `
      )
      .eq("id", batchId)
      .maybeSingle();

    if (batchError) {
      throw batchError;
    }

    const batch = (batchData as PayoutBatchRow | null) ?? null;

    if (!batch) {
      return NextResponse.json(
        { error: "対象の振込バッチが見つかりませんでした" },
        { status: 404 }
      );
    }

    if (batch.status === "paid") {
      return NextResponse.json({
        ok: true,
        already_paid: true,
        batch_id: batch.id,
        batch_code: batch.batch_code,
        status: batch.status,
        paid_at: batch.paid_at,
        total_orders: getInteger(batch.total_orders),
        total_creators: getInteger(batch.total_creators),
        total_payout_amount: getInteger(batch.total_payout_amount),
        total_transfer_fee: getInteger(batch.total_transfer_fee),
        total_net_amount: getInteger(batch.total_net_amount),
        currency: batch.currency || "JPY",
      });
    }

    if (batch.payout_method !== "manual_bank_transfer") {
      return NextResponse.json(
        { error: "銀行振込以外のバッチはこの処理の対象外です" },
        { status: 409 }
      );
    }

    if (batch.status !== "exported") {
      return NextResponse.json(
        {
          error:
            "CSV出力済みの振込バッチのみ支払済みにできます。先にCSV出力を完了してください。",
          current_status: batch.status,
        },
        { status: 409 }
      );
    }

    if (!batch.csv_file_name || !batch.exported_at) {
      return NextResponse.json(
        {
          error:
            "CSV出力情報が保存されていないため、振込完了処理を実行できません",
        },
        { status: 409 }
      );
    }

    if ((batch.currency || "JPY").toUpperCase() !== "JPY") {
      return NextResponse.json(
        { error: "銀行振込完了処理はJPYのバッチのみ対応しています" },
        { status: 409 }
      );
    }

    const { data: payoutItemData, error: payoutItemsError } = await db
      .from("payout_items")
      .select(
        `
        id,
        payout_batch_id,
        creator_id,
        creator_user_id,
        payout_method,
        status,
        gross_amount,
        adjustment_amount,
        withholding_amount,
        transfer_fee,
        net_amount,
        currency,
        external_reference,
        exported_at,
        submitted_at,
        paid_at
      `
      )
      .eq("payout_batch_id", batch.id)
      .order("created_at", { ascending: true });

    if (payoutItemsError) {
      throw payoutItemsError;
    }

    originalItems = ((payoutItemData ?? []) as PayoutItemRow[]).filter(Boolean);

    if (originalItems.length === 0) {
      return NextResponse.json(
        { error: "振込バッチに振込明細がありません" },
        { status: 409 }
      );
    }

    const invalidItems = originalItems.filter(
      (item) =>
        item.payout_method !== "manual_bank_transfer" ||
        item.status !== "exported" ||
        (item.currency || "JPY").toUpperCase() !== "JPY" ||
        getInteger(item.net_amount) <= 0
    );

    if (invalidItems.length > 0) {
      return NextResponse.json(
        {
          error:
            "支払済みにできない振込明細が含まれています。CSV出力済みの銀行振込明細のみ対象です。",
          invalid_item_ids: invalidItems.map((item) => item.id),
        },
        { status: 409 }
      );
    }

    const grossAmount = sumBy(originalItems, (item) => item.gross_amount);
    const transferFee = sumBy(originalItems, (item) => item.transfer_fee);
    const withholdingAmount = sumBy(
      originalItems,
      (item) => item.withholding_amount
    );
    const adjustmentAmount = sumBy(
      originalItems,
      (item) => item.adjustment_amount
    );
    const netAmount = sumBy(originalItems, (item) => item.net_amount);

    const batchTotalsMatch =
      originalItems.length === getInteger(batch.total_creators) &&
      grossAmount === getInteger(batch.total_payout_amount) &&
      transferFee === getInteger(batch.total_transfer_fee) &&
      withholdingAmount === getInteger(batch.total_withholding_amount) &&
      adjustmentAmount === getInteger(batch.total_adjustment_amount) &&
      netAmount === getInteger(batch.total_net_amount);

    if (!batchTotalsMatch) {
      return NextResponse.json(
        {
          error:
            "振込バッチの集計値と振込明細が一致しないため、支払済み更新を停止しました。",
          batch: {
            total_creators: getInteger(batch.total_creators),
            total_payout_amount: getInteger(batch.total_payout_amount),
            total_transfer_fee: getInteger(batch.total_transfer_fee),
            total_withholding_amount: getInteger(
              batch.total_withholding_amount
            ),
            total_adjustment_amount: getInteger(batch.total_adjustment_amount),
            total_net_amount: getInteger(batch.total_net_amount),
          },
          items: {
            total_creators: originalItems.length,
            total_payout_amount: grossAmount,
            total_transfer_fee: transferFee,
            total_withholding_amount: withholdingAmount,
            total_adjustment_amount: adjustmentAmount,
            total_net_amount: netAmount,
          },
        },
        { status: 409 }
      );
    }

    const payoutItemIds = originalItems.map((item) => item.id);
    const payoutOrderItems: PayoutOrderItemRow[] = [];

    for (const itemIdChunk of chunkArray(payoutItemIds, 300)) {
      const { data, error } = await db
        .from("payout_order_items")
        .select("payout_item_id, order_id, creator_payout_amount")
        .in("payout_item_id", itemIdChunk);

      if (error) {
        throw error;
      }

      payoutOrderItems.push(
        ...(((data ?? []) as PayoutOrderItemRow[]).filter(Boolean))
      );
    }

    const orderIds = uniqueStrings(
      payoutOrderItems.map((item) => item.order_id)
    );

    if (
      orderIds.length === 0 ||
      orderIds.length !== getInteger(batch.total_orders)
    ) {
      return NextResponse.json(
        {
          error:
            "振込バッチの対象注文数と注文明細が一致しないため、支払済み更新を停止しました。",
          batch_total_orders: getInteger(batch.total_orders),
          linked_order_count: orderIds.length,
        },
        { status: 409 }
      );
    }

    const linkedGrossAmount = sumBy(
      payoutOrderItems,
      (item) => item.creator_payout_amount
    );

    if (linkedGrossAmount !== getInteger(batch.total_payout_amount)) {
      return NextResponse.json(
        {
          error:
            "振込バッチの報酬総額と注文明細の合計が一致しないため、支払済み更新を停止しました。",
          batch_total_payout_amount: getInteger(batch.total_payout_amount),
          linked_total_payout_amount: linkedGrossAmount,
        },
        { status: 409 }
      );
    }

    for (const orderIdChunk of chunkArray(orderIds, 300)) {
      const { data, error } = await db
        .from("orders")
        .select(
          `
          id,
          status,
          payment_status,
          payout_method,
          payout_status,
          payout_batch_id,
          payout_paid_at,
          payout_note,
          creator_payout_amount,
          currency
        `
        )
        .in("id", orderIdChunk);

      if (error) {
        throw error;
      }

      originalOrders.push(
        ...(((data ?? []) as OrderPayoutRow[]).filter(Boolean))
      );
    }

    if (originalOrders.length !== orderIds.length) {
      const foundOrderIds = new Set(originalOrders.map((order) => order.id));

      return NextResponse.json(
        {
          error: "振込バッチに紐づく注文の一部が見つかりませんでした",
          missing_order_ids: orderIds.filter((id) => !foundOrderIds.has(id)),
        },
        { status: 409 }
      );
    }

    const invalidOrders = originalOrders.filter(
      (order) =>
        order.status !== "completed" ||
        order.payment_status !== "captured" ||
        order.payout_method !== "manual_bank_transfer" ||
        order.payout_status !== "pending" ||
        order.payout_batch_id !== batch.id ||
        (order.currency || "JPY").toUpperCase() !== "JPY" ||
        getInteger(order.creator_payout_amount) <= 0
    );

    if (invalidOrders.length > 0) {
      return NextResponse.json(
        {
          error:
            "支払済みにできない注文が含まれています。completed / captured / manual_bank_transfer / pending で、対象バッチに紐づく注文のみ処理できます。",
          invalid_order_ids: invalidOrders.map((order) => order.id),
        },
        { status: 409 }
      );
    }

    const nowIso = new Date().toISOString();

    const { data: updatedItemRows, error: updateItemsError } = await db
      .from("payout_items")
      .update({
        status: "paid",
        external_reference: externalReference,
        submitted_at: paidAt,
        paid_at: paidAt,
        updated_at: nowIso,
      })
      .in("id", payoutItemIds)
      .eq("payout_batch_id", batch.id)
      .eq("status", "exported")
      .select("id");

    if (updateItemsError) {
      throw updateItemsError;
    }

    if ((updatedItemRows ?? []).length !== payoutItemIds.length) {
      throw new Error(
        "支払済みへ更新できなかった振込明細があります。画面を再読み込みしてやり直してください。"
      );
    }

    itemsUpdated = true;

    const updatedOrderIds: string[] = [];

    for (const orderIdChunk of chunkArray(orderIds, 300)) {
      const { data, error } = await db
        .from("orders")
        .update({
          payout_status: "paid",
          payout_paid_at: paidAt,
          payout_note: note,
          updated_at: nowIso,
        })
        .in("id", orderIdChunk)
        .eq("payout_batch_id", batch.id)
        .eq("payout_status", "pending")
        .select("id");

      if (error) {
        throw error;
      }

      updatedOrderIds.push(
        ...((data ?? []) as Array<{ id: string }>).map((row) => row.id)
      );
    }

    if (updatedOrderIds.length !== orderIds.length) {
      throw new Error(
        "支払済みへ更新できなかった注文があります。画面を再読み込みしてやり直してください。"
      );
    }

    ordersUpdated = true;

    const mergedAdminNote = [batch.admin_note, note]
      .filter((value): value is string => Boolean(value?.trim()))
      .join("\n");

    const { data: paidBatchData, error: paidBatchError } = await db
      .from("payout_batches")
      .update({
        status: "paid",
        submitted_at: batch.submitted_at || paidAt,
        paid_at: paidAt,
        external_reference:
          externalReference || batch.external_reference || null,
        admin_note: mergedAdminNote || null,
        updated_at: nowIso,
      })
      .eq("id", batch.id)
      .eq("status", "exported")
      .select(
        `
        id,
        batch_code,
        status,
        paid_at,
        total_orders,
        total_creators,
        total_payout_amount,
        total_transfer_fee,
        total_net_amount,
        currency
      `
      )
      .maybeSingle();

    if (paidBatchError) {
      throw paidBatchError;
    }

    if (!paidBatchData) {
      throw new Error(
        "振込バッチの状態が別の操作で変更されました。画面を再読み込みしてください。"
      );
    }

    batchCompleted = true;

    for (const order of originalOrders) {
      await safeInsertOrderEvent({
        orderId: order.id,
        actorUserId: admin.userId,
        eventType: "creator_payout_batch_marked_paid",
        eventData: {
          payout_batch_id: batch.id,
          batch_code: batch.batch_code,
          payout_method: "manual_bank_transfer",
          previous_payout_status: order.payout_status || "pending",
          payout_status: "paid",
          payout_paid_at: paidAt,
          payout_note: note,
          creator_payout_amount: getInteger(order.creator_payout_amount),
          currency: order.currency || "JPY",
          external_reference: externalReference,
        },
      });
    }

    const notificationSummary =
      await safeSendCreatorPayoutPaidNotifications({
        payoutItems: originalItems,
        payoutOrderItems,
        batch,
        paidAt,
        actorUserId: admin.userId,
      });

    return NextResponse.json({
      ok: true,
      already_paid: false,
      batch: paidBatchData,
      order_ids: orderIds,
      payout_item_ids: payoutItemIds,
      paid_at: paidAt,
      note,
      external_reference: externalReference,
      notifications: notificationSummary,
    });
  } catch (error) {
    console.error("admin payout batch mark paid error:", error);

    if (!batchCompleted) {
      if (ordersUpdated && originalOrders.length > 0) {
        await restoreOrders(db, originalOrders);
      }

      if (itemsUpdated && originalItems.length > 0) {
        await restorePayoutItems(db, originalItems);
      }
    }

    return NextResponse.json(
      {
        error: "振込バッチの支払済み更新に失敗しました",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}