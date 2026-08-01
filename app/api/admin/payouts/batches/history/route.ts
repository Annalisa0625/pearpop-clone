// File: app/api/admin/payouts/batches/history/route.ts

import { NextRequest, NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/guard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type BatchStatus = "draft" | "ready" | "exported" | "paid" | "failed";

type PayoutBatchRow = {
  id: string;
  batch_code: string | null;
  payout_method: string;
  status: string;
  period_start: string;
  period_end: string;
  scheduled_date: string | null;
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
  locked_at: string | null;
  submitted_at: string | null;
  paid_at: string | null;
  failed_items: number;
  external_reference: string | null;
  created_by_user_id: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};

type PayoutItemRow = {
  id: string;
  payout_batch_id: string;
  creator_id: string;
  creator_user_id: string;
  payout_profile_id: string | null;
  payout_method: string;
  status: string;
  gross_amount: number;
  adjustment_amount: number;
  withholding_amount: number;
  transfer_fee: number;
  net_amount: number | null;
  currency: string;
  bank_name_snapshot: string | null;
  bank_code_snapshot: string | null;
  branch_name_snapshot: string | null;
  branch_code_snapshot: string | null;
  account_type_snapshot: string | null;
  account_number_snapshot: string | null;
  account_holder_name_snapshot: string | null;
  account_holder_kana_snapshot: string | null;
  payout_profile_status_snapshot: string | null;
  external_reference: string | null;
  failure_reason: string | null;
  exported_at: string | null;
  submitted_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

type PayoutOrderItemRow = {
  payout_item_id: string;
  order_id: string;
  creator_payout_amount: number;
};

type CreatorRow = {
  id: string;
  user_id: string;
  display_name: string | null;
  full_name: string | null;
};

const BATCH_STATUSES = new Set<BatchStatus>([
  "draft",
  "ready",
  "exported",
  "paid",
  "failed",
]);

function getInteger(value: unknown) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? Math.round(numberValue) : 0;
}

function getQueryInteger(
  value: string | null,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(Math.floor(parsed), min), max);
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  );
}

function normalizeBatchStatus(value: unknown): BatchStatus {
  if (value === "paid") return "paid";
  if (value === "exported") return "exported";
  if (value === "ready") return "ready";
  if (value === "failed") return "failed";
  return "draft";
}

function chunkArray<T>(values: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

function sumBy<T>(values: T[], getter: (value: T) => unknown) {
  return values.reduce(
    (total, value) => total + getInteger(getter(value)),
    0,
  );
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdminApi();

    if (!admin.ok) {
      return admin.response;
    }

    const db = supabaseAdmin as any;
    const searchParams = req.nextUrl.searchParams;

    const statusParam = searchParams.get("status")?.trim() ?? "";
    const status =
      BATCH_STATUSES.has(statusParam as BatchStatus)
        ? (statusParam as BatchStatus)
        : null;

    const limit = getQueryInteger(searchParams.get("limit"), 30, 1, 100);
    const offset = getQueryInteger(searchParams.get("offset"), 0, 0, 100000);
    const batchId = searchParams.get("batch_id")?.trim() || null;

    let batchQuery = db
      .from("payout_batches")
      .select(
        `
        id,
        batch_code,
        payout_method,
        status,
        period_start,
        period_end,
        scheduled_date,
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
        locked_at,
        submitted_at,
        paid_at,
        failed_items,
        external_reference,
        created_by_user_id,
        admin_note,
        created_at,
        updated_at
      `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (batchId) {
      batchQuery = batchQuery.eq("id", batchId);
    } else {
      if (status) {
        batchQuery = batchQuery.eq("status", status);
      }

      batchQuery = batchQuery.range(offset, offset + limit - 1);
    }

    const {
      data: batchData,
      error: batchesError,
      count: totalCount,
    } = await batchQuery;

    if (batchesError) {
      console.error("admin payout batch history batches error:", batchesError);
      throw batchesError;
    }

    const batches = ((batchData ?? []) as PayoutBatchRow[]).filter(Boolean);

    const { data: summaryData, error: summaryError } = await db
      .from("payout_batches")
      .select(
        `
        id,
        status,
        total_orders,
        total_creators,
        total_payout_amount,
        total_transfer_fee,
        total_net_amount
      `,
      )
      .order("created_at", { ascending: false })
      .limit(1000);

    if (summaryError) {
      console.error("admin payout batch history summary error:", summaryError);
      throw summaryError;
    }

    const summaryRows = (
      (summaryData ?? []) as Array<{
        id: string;
        status: string;
        total_orders: number;
        total_creators: number;
        total_payout_amount: number;
        total_transfer_fee: number;
        total_net_amount: number;
      }>
    ).filter(Boolean);

    const summary = {
      total_count: summaryRows.length,
      draft_count: summaryRows.filter(
        (row) => normalizeBatchStatus(row.status) === "draft",
      ).length,
      ready_count: summaryRows.filter(
        (row) => normalizeBatchStatus(row.status) === "ready",
      ).length,
      exported_count: summaryRows.filter(
        (row) => normalizeBatchStatus(row.status) === "exported",
      ).length,
      paid_count: summaryRows.filter(
        (row) => normalizeBatchStatus(row.status) === "paid",
      ).length,
      failed_count: summaryRows.filter(
        (row) => normalizeBatchStatus(row.status) === "failed",
      ).length,
      total_orders: sumBy(summaryRows, (row) => row.total_orders),
      total_creators: sumBy(summaryRows, (row) => row.total_creators),
      total_payout_amount: sumBy(
        summaryRows,
        (row) => row.total_payout_amount,
      ),
      total_transfer_fee: sumBy(
        summaryRows,
        (row) => row.total_transfer_fee,
      ),
      total_net_amount: sumBy(summaryRows, (row) => row.total_net_amount),
      paid_net_amount: sumBy(
        summaryRows.filter(
          (row) => normalizeBatchStatus(row.status) === "paid",
        ),
        (row) => row.total_net_amount,
      ),
    };

    if (batches.length === 0) {
      return NextResponse.json({
        ok: true,
        summary,
        batches: [],
        pagination: {
          limit,
          offset,
          total: totalCount ?? 0,
          has_more: false,
        },
      });
    }

    const batchIds = batches.map((batch) => batch.id);
    const payoutItems: PayoutItemRow[] = [];

    for (const batchIdChunk of chunkArray(batchIds, 200)) {
      const { data, error } = await db
        .from("payout_items")
        .select(
          `
          id,
          payout_batch_id,
          creator_id,
          creator_user_id,
          payout_profile_id,
          payout_method,
          status,
          gross_amount,
          adjustment_amount,
          withholding_amount,
          transfer_fee,
          net_amount,
          currency,
          bank_name_snapshot,
          bank_code_snapshot,
          branch_name_snapshot,
          branch_code_snapshot,
          account_type_snapshot,
          account_number_snapshot,
          account_holder_name_snapshot,
          account_holder_kana_snapshot,
          payout_profile_status_snapshot,
          external_reference,
          failure_reason,
          exported_at,
          submitted_at,
          paid_at,
          created_at,
          updated_at
        `,
        )
        .in("payout_batch_id", batchIdChunk)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("admin payout batch history items error:", error);
        throw error;
      }

      payoutItems.push(...(((data ?? []) as PayoutItemRow[]).filter(Boolean)));
    }

    const payoutItemIds = payoutItems.map((item) => item.id);
    const payoutOrderItems: PayoutOrderItemRow[] = [];

    for (const payoutItemIdChunk of chunkArray(payoutItemIds, 300)) {
      const { data, error } = await db
        .from("payout_order_items")
        .select("payout_item_id, order_id, creator_payout_amount")
        .in("payout_item_id", payoutItemIdChunk);

      if (error) {
        console.error(
          "admin payout batch history order items error:",
          error,
        );
        throw error;
      }

      payoutOrderItems.push(
        ...(((data ?? []) as PayoutOrderItemRow[]).filter(Boolean)),
      );
    }

    const creatorIds = uniqueStrings(
      payoutItems.map((item) => item.creator_id),
    );
    const creators: CreatorRow[] = [];

    for (const creatorIdChunk of chunkArray(creatorIds, 300)) {
      const { data, error } = await db
        .from("creators")
        .select("id, user_id, display_name, full_name")
        .in("id", creatorIdChunk);

      if (error) {
        console.error("admin payout batch history creators error:", error);
        throw error;
      }

      creators.push(...(((data ?? []) as CreatorRow[]).filter(Boolean)));
    }

    const creatorById = new Map(
      creators.map((creator) => [creator.id, creator]),
    );

    const orderLinksByItemId = new Map<string, PayoutOrderItemRow[]>();

    for (const link of payoutOrderItems) {
      const current = orderLinksByItemId.get(link.payout_item_id) ?? [];
      current.push(link);
      orderLinksByItemId.set(link.payout_item_id, current);
    }

    const itemsByBatchId = new Map<string, PayoutItemRow[]>();

    for (const item of payoutItems) {
      const current = itemsByBatchId.get(item.payout_batch_id) ?? [];
      current.push(item);
      itemsByBatchId.set(item.payout_batch_id, current);
    }

    const responseBatches = batches.map((batch) => {
      const batchItems = itemsByBatchId.get(batch.id) ?? [];

      const items = batchItems.map((item) => {
        const creator = creatorById.get(item.creator_id) ?? null;
        const orderLinks = orderLinksByItemId.get(item.id) ?? [];

        return {
          id: item.id,
          creator_id: item.creator_id,
          creator_user_id: item.creator_user_id,
          creator_name:
            creator?.display_name ||
            creator?.full_name ||
            item.creator_user_id,
          payout_profile_id: item.payout_profile_id,
          payout_method: item.payout_method,
          status: item.status,
          gross_amount: getInteger(item.gross_amount),
          adjustment_amount: getInteger(item.adjustment_amount),
          withholding_amount: getInteger(item.withholding_amount),
          transfer_fee: getInteger(item.transfer_fee),
          net_amount: getInteger(item.net_amount),
          currency: item.currency || batch.currency || "JPY",
          order_count: uniqueStrings(
            orderLinks.map((link) => link.order_id),
          ).length,
          order_ids: uniqueStrings(orderLinks.map((link) => link.order_id)),
          linked_order_amount: sumBy(
            orderLinks,
            (link) => link.creator_payout_amount,
          ),
          bank: {
            bank_name: item.bank_name_snapshot,
            bank_code: item.bank_code_snapshot,
            branch_name: item.branch_name_snapshot,
            branch_code: item.branch_code_snapshot,
            account_type: item.account_type_snapshot,
            account_number: item.account_number_snapshot,
            account_holder_name: item.account_holder_name_snapshot,
            account_holder_kana: item.account_holder_kana_snapshot,
            payout_profile_status: item.payout_profile_status_snapshot,
          },
          external_reference: item.external_reference,
          failure_reason: item.failure_reason,
          exported_at: item.exported_at,
          submitted_at: item.submitted_at,
          paid_at: item.paid_at,
          created_at: item.created_at,
          updated_at: item.updated_at,
        };
      });

      const calculated = {
        total_items: items.length,
        total_orders: sumBy(items, (item) => item.order_count),
        total_payout_amount: sumBy(items, (item) => item.gross_amount),
        total_transfer_fee: sumBy(items, (item) => item.transfer_fee),
        total_withholding_amount: sumBy(
          items,
          (item) => item.withholding_amount,
        ),
        total_adjustment_amount: sumBy(
          items,
          (item) => item.adjustment_amount,
        ),
        total_net_amount: sumBy(items, (item) => item.net_amount),
      };

      return {
        id: batch.id,
        batch_code: batch.batch_code,
        payout_method: batch.payout_method,
        status: normalizeBatchStatus(batch.status),
        raw_status: batch.status,
        period_start: batch.period_start,
        period_end: batch.period_end,
        scheduled_date: batch.scheduled_date,
        total_orders: getInteger(batch.total_orders),
        total_creators: getInteger(batch.total_creators),
        total_payout_amount: getInteger(batch.total_payout_amount),
        total_transfer_fee: getInteger(batch.total_transfer_fee),
        total_withholding_amount: getInteger(
          batch.total_withholding_amount,
        ),
        total_adjustment_amount: getInteger(batch.total_adjustment_amount),
        total_net_amount: getInteger(batch.total_net_amount),
        currency: batch.currency || "JPY",
        csv_file_name: batch.csv_file_name,
        exported_at: batch.exported_at,
        locked_at: batch.locked_at,
        submitted_at: batch.submitted_at,
        paid_at: batch.paid_at,
        failed_items: getInteger(batch.failed_items),
        external_reference: batch.external_reference,
        created_by_user_id: batch.created_by_user_id,
        admin_note: batch.admin_note,
        created_at: batch.created_at,
        updated_at: batch.updated_at,
        calculated,
        consistency: {
          creators_match: calculated.total_items === getInteger(batch.total_creators),
          orders_match: calculated.total_orders === getInteger(batch.total_orders),
          payout_amount_match:
            calculated.total_payout_amount ===
            getInteger(batch.total_payout_amount),
          transfer_fee_match:
            calculated.total_transfer_fee ===
            getInteger(batch.total_transfer_fee),
          withholding_amount_match:
            calculated.total_withholding_amount ===
            getInteger(batch.total_withholding_amount),
          adjustment_amount_match:
            calculated.total_adjustment_amount ===
            getInteger(batch.total_adjustment_amount),
          net_amount_match:
            calculated.total_net_amount === getInteger(batch.total_net_amount),
        },
        items,
      };
    });

    return NextResponse.json({
      ok: true,
      summary,
      batches: responseBatches,
      pagination: {
        limit,
        offset,
        total: totalCount ?? responseBatches.length,
        has_more:
          !batchId &&
          offset + responseBatches.length < (totalCount ?? responseBatches.length),
      },
    });
  } catch (error) {
    console.error("admin payout batch history error:", error);

    return NextResponse.json(
      {
        error: "振込バッチ履歴の取得に失敗しました",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}