// File: app/api/admin/payouts/batches/create/route.ts

import { NextRequest, NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/guard";
import {
  buildManualBankInvalidMessage,
  validateManualBankPayoutProfile,
  type ManualBankPayoutProfile,
} from "@/lib/payouts/manualBankTransfer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Json } from "@/types/database.types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CreateBatchBody = {
  period_start?: unknown;
  period_end?: unknown;
  scheduled_date?: unknown;
  transfer_fee?: unknown;
  minimum_payout?: unknown;
  admin_note?: unknown;
};

type CandidateOrder = {
  id: string;
  creator_id: string;
  creator_user_id: string;
  creator_payout_amount: number | null;
  currency: string | null;
  completed_at: string | null;
  payout_batch_id: string | null;
};

type PayoutProfileRow = ManualBankPayoutProfile & {
  id: string;
  creator_id: string;
  user_id: string;
  payout_method: string | null;
  status: string | null;
  updated_at: string | null;
};

type CreatorRow = {
  id: string;
  user_id: string;
  display_name: string | null;
  full_name: string | null;
};

type CreatorGroup = {
  creator_id: string;
  creator_user_id: string;
  creator_name: string;
  currency: string;
  gross_amount: number;
  orders: CandidateOrder[];
  profile: PayoutProfileRow;
  validation: ReturnType<typeof validateManualBankPayoutProfile>;
};

const DEFAULT_TRANSFER_FEE_JPY = 165;
const DEFAULT_MINIMUM_PAYOUT_JPY = 3000;
const MAX_CANDIDATE_ORDERS = 5000;

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getNonNegativeInteger(value: unknown, fallback: number) {
  const amount =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : fallback;

  if (!Number.isFinite(amount)) return null;

  const rounded = Math.round(amount);

  if (rounded < 0) return null;

  return rounded;
}

function isDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function addUtcDays(dateOnly: string, days: number) {
  const date = new Date(`${dateOnly}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function toJstStartIso(dateOnly: string) {
  return new Date(`${dateOnly}T00:00:00+09:00`).toISOString();
}

function getDefaultBatchDates(now = new Date()) {
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = jstNow.getUTCFullYear();
  const month = jstNow.getUTCMonth();

  const periodStart = new Date(Date.UTC(year, month - 1, 1))
    .toISOString()
    .slice(0, 10);

  const periodEnd = new Date(Date.UTC(year, month, 0))
    .toISOString()
    .slice(0, 10);

  const scheduledDate = new Date(Date.UTC(year, month, 25))
    .toISOString()
    .slice(0, 10);

  return {
    periodStart,
    periodEnd,
    scheduledDate,
  };
}

function makeBatchCode(periodEnd: string, scheduledDate: string) {
  return `MBT-${periodEnd.slice(0, 7).replace("-", "")}-${scheduledDate.replaceAll("-", "")}`;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value)))
  );
}

function getAmount(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? Math.round(amount) : 0;
}

function isReadyProfileStatus(value: string | null | undefined) {
  return value === "submitted" || value === "verified";
}

function getCreatorName(
  creator: CreatorRow | null | undefined,
  creatorUserId: string
) {
  return (
    creator?.display_name?.trim() ||
    creator?.full_name?.trim() ||
    creatorUserId
  );
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
    console.warn("payout batch order event insert skipped", error);
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdminApi();

  if (!admin.ok) {
    return admin.response;
  }

  const db = supabaseAdmin as any;
  let createdBatchId: string | null = null;

  try {
    const body = (await req.json().catch(() => ({}))) as CreateBatchBody;
    const defaults = getDefaultBatchDates();

    const periodStart =
      getString(body.period_start) || defaults.periodStart;
    const periodEnd =
      getString(body.period_end) || defaults.periodEnd;
    const scheduledDate =
      getString(body.scheduled_date) || defaults.scheduledDate;

    const configuredTransferFee =
      process.env.MANUAL_PAYOUT_TRANSFER_FEE_JPY ??
      String(DEFAULT_TRANSFER_FEE_JPY);

    const configuredMinimumPayout =
      process.env.MANUAL_PAYOUT_MINIMUM_JPY ??
      String(DEFAULT_MINIMUM_PAYOUT_JPY);

    const transferFee = getNonNegativeInteger(
      body.transfer_fee ?? configuredTransferFee,
      DEFAULT_TRANSFER_FEE_JPY
    );

    const minimumPayout = getNonNegativeInteger(
      body.minimum_payout ?? configuredMinimumPayout,
      DEFAULT_MINIMUM_PAYOUT_JPY
    );

    const adminNote = getString(body.admin_note) || null;

    if (
      !isDateOnly(periodStart) ||
      !isDateOnly(periodEnd) ||
      !isDateOnly(scheduledDate)
    ) {
      return NextResponse.json(
        {
          error:
            "period_start、period_end、scheduled_date は YYYY-MM-DD 形式で指定してください",
        },
        { status: 400 }
      );
    }

    if (periodStart > periodEnd) {
      return NextResponse.json(
        { error: "period_start は period_end 以前の日付にしてください" },
        { status: 400 }
      );
    }

    if (scheduledDate <= periodEnd) {
      return NextResponse.json(
        { error: "scheduled_date は締め期間終了日より後にしてください" },
        { status: 400 }
      );
    }

    if (transferFee == null || minimumPayout == null) {
      return NextResponse.json(
        { error: "振込手数料または最低振込額が正しくありません" },
        { status: 400 }
      );
    }

    const batchCode = makeBatchCode(periodEnd, scheduledDate);

    const { data: existingBatch, error: existingBatchError } = await db
      .from("payout_batches")
      .select(
        "id, batch_code, status, period_start, period_end, scheduled_date"
      )
      .eq("batch_code", batchCode)
      .maybeSingle();

    if (existingBatchError) {
      throw existingBatchError;
    }

    if (existingBatch) {
      return NextResponse.json(
        {
          error: "この締め期間の振込バッチはすでに作成されています",
          existing_batch: existingBatch,
        },
        { status: 409 }
      );
    }

    /*
     * 締め期間より前に完了していて、まだどのバッチにも入っていない
     * pending注文をすべて対象にします。
     *
     * period_startより前の注文も含めることで、最低振込額未満などで
     * 前月から繰り越された報酬を次回バッチへ合算できます。
     */
    const periodEndExclusiveIso = toJstStartIso(addUtcDays(periodEnd, 1));

    const { data: orderRows, error: ordersError } = await db
      .from("orders")
      .select(
        `
        id,
        creator_id,
        creator_user_id,
        creator_payout_amount,
        currency,
        completed_at,
        payout_batch_id
      `
      )
      .eq("status", "completed")
      .eq("payment_status", "captured")
      .eq("payout_method", "manual_bank_transfer")
      .eq("payout_status", "pending")
      .is("payout_batch_id", null)
      .not("completed_at", "is", null)
      .lt("completed_at", periodEndExclusiveIso)
      .order("completed_at", { ascending: true })
      .limit(MAX_CANDIDATE_ORDERS);

    if (ordersError) {
      throw ordersError;
    }

    const candidateOrders = ((orderRows ?? []) as CandidateOrder[]).filter(
      (order) =>
        Boolean(order.id) &&
        Boolean(order.creator_id) &&
        Boolean(order.creator_user_id) &&
        getAmount(order.creator_payout_amount) > 0
    );

    if (candidateOrders.length === 0) {
      return NextResponse.json(
        {
          error: "今回の締め期間に振込対象となる注文はありません",
          period_start: periodStart,
          period_end: periodEnd,
          scheduled_date: scheduledDate,
        },
        { status: 409 }
      );
    }

    const creatorIds = uniqueStrings(
      candidateOrders.map((order) => order.creator_id)
    );

    const [
      { data: creators, error: creatorsError },
      { data: payoutProfiles, error: payoutProfilesError },
    ] = await Promise.all([
      db
        .from("creators")
        .select("id, user_id, display_name, full_name")
        .in("id", creatorIds),

      db
        .from("creator_payout_profiles")
        .select(
          `
          id,
          creator_id,
          user_id,
          payout_method,
          status,
          bank_name,
          bank_code,
          branch_name,
          branch_code,
          account_type,
          account_number,
          account_holder_name,
          account_holder_kana,
          updated_at
        `
        )
        .in("creator_id", creatorIds),
    ]);

    if (creatorsError) {
      throw creatorsError;
    }

    if (payoutProfilesError) {
      throw payoutProfilesError;
    }

    const creatorMap = new Map<string, CreatorRow>(
      ((creators ?? []) as CreatorRow[]).map((creator) => [
        creator.id,
        creator,
      ])
    );

    const payoutProfileMap = new Map<string, PayoutProfileRow>();

    for (const profile of (payoutProfiles ?? []) as PayoutProfileRow[]) {
      const current = payoutProfileMap.get(profile.creator_id);

      if (
        !current ||
        String(profile.updated_at ?? "") > String(current.updated_at ?? "")
      ) {
        payoutProfileMap.set(profile.creator_id, profile);
      }
    }

    const groupedOrders = new Map<
      string,
      {
        creator_id: string;
        creator_user_id: string;
        currency: string;
        gross_amount: number;
        orders: CandidateOrder[];
      }
    >();

    for (const order of candidateOrders) {
      const currency = (order.currency || "JPY").toUpperCase();
      const existing = groupedOrders.get(order.creator_id);
      const amount = getAmount(order.creator_payout_amount);

      if (existing) {
        existing.gross_amount += amount;
        existing.orders.push(order);

        if (existing.currency !== currency) {
          existing.currency = "MIXED";
        }

        continue;
      }

      groupedOrders.set(order.creator_id, {
        creator_id: order.creator_id,
        creator_user_id: order.creator_user_id,
        currency,
        gross_amount: amount,
        orders: [order],
      });
    }

    const readyGroups: CreatorGroup[] = [];
    const invalidCreators: Array<{
      creator_id: string;
      creator_user_id: string;
      creator_name: string;
      order_ids: string[];
      warnings: string[];
    }> = [];
    const carriedCreators: Array<{
      creator_id: string;
      creator_user_id: string;
      creator_name: string;
      gross_amount: number;
      minimum_payout: number;
      order_ids: string[];
    }> = [];

    for (const group of groupedOrders.values()) {
      const creator = creatorMap.get(group.creator_id) ?? null;
      const creatorName = getCreatorName(
        creator,
        group.creator_user_id
      );
      const profile = payoutProfileMap.get(group.creator_id) ?? null;

      const warnings: string[] = [];

      if (!profile) {
        warnings.push("振込先口座が未登録です");
      }

      if (profile && profile.payout_method === "stripe_connect") {
        warnings.push("振込方法が銀行振込ではありません");
      }

      if (profile && !isReadyProfileStatus(profile.status)) {
        warnings.push("振込先口座が提出済みまたは確認済みではありません");
      }

      if (group.currency !== "JPY") {
        warnings.push("銀行一括振込はJPYの報酬のみ対応しています");
      }

      const validation = validateManualBankPayoutProfile(profile);

      if (!validation.ready) {
        warnings.push(...validation.warnings);
      }

      const uniqueWarnings = Array.from(new Set(warnings));

      if (!profile || uniqueWarnings.length > 0) {
        invalidCreators.push({
          creator_id: group.creator_id,
          creator_user_id: group.creator_user_id,
          creator_name: creatorName,
          order_ids: group.orders.map((order) => order.id),
          warnings: uniqueWarnings,
        });
        continue;
      }

      if (group.gross_amount < minimumPayout) {
        carriedCreators.push({
          creator_id: group.creator_id,
          creator_user_id: group.creator_user_id,
          creator_name: creatorName,
          gross_amount: group.gross_amount,
          minimum_payout: minimumPayout,
          order_ids: group.orders.map((order) => order.id),
        });
        continue;
      }

      readyGroups.push({
        creator_id: group.creator_id,
        creator_user_id: group.creator_user_id,
        creator_name: creatorName,
        currency: group.currency,
        gross_amount: group.gross_amount,
        orders: group.orders,
        profile,
        validation,
      });
    }

    if (readyGroups.length === 0) {
      return NextResponse.json(
        {
          error:
            "口座不備または最低振込額未満のため、作成できる振込明細がありません",
          invalid_creators: invalidCreators,
          carried_creators: carriedCreators,
          invalid_messages: invalidCreators.map((creator) =>
            buildManualBankInvalidMessage({
              creator_name: creator.creator_name,
              creator_user_id: creator.creator_user_id,
              order_ids: creator.order_ids,
              warnings: creator.warnings,
            })
          ),
        },
        { status: 409 }
      );
    }

    const { data: batch, error: batchError } = await db
      .from("payout_batches")
      .insert({
        payout_method: "manual_bank_transfer",
        status: "draft",
        period_start: periodStart,
        period_end: periodEnd,
        scheduled_date: scheduledDate,
        batch_code: batchCode,
        total_orders: 0,
        total_creators: 0,
        total_payout_amount: 0,
        total_transfer_fee: 0,
        total_withholding_amount: 0,
        total_adjustment_amount: 0,
        total_net_amount: 0,
        failed_items: 0,
        currency: "JPY",
        created_by_user_id: admin.userId,
        admin_note: adminNote,
      })
      .select("id, batch_code, status")
      .single();

    if (batchError || !batch?.id) {
      throw batchError || new Error("振込バッチを作成できませんでした");
    }

    createdBatchId = batch.id as string;

    const itemPayloads = readyGroups.map((group) => ({
      payout_batch_id: createdBatchId,
      creator_id: group.creator_id,
      creator_user_id: group.creator_user_id,
      payout_profile_id: group.profile.id,
      payout_method: "manual_bank_transfer",
      status: "ready",
      gross_amount: group.gross_amount,
      adjustment_amount: 0,
      withholding_amount: 0,
      transfer_fee: transferFee,
      currency: "JPY",
      bank_name_snapshot: group.validation.normalized.bank_name,
      bank_code_snapshot: group.validation.normalized.bank_code,
      branch_name_snapshot: group.validation.normalized.branch_name,
      branch_code_snapshot: group.validation.normalized.branch_code,
      account_type_snapshot: group.validation.normalized.account_type,
      account_number_snapshot: group.validation.normalized.account_number,
      account_holder_name_snapshot:
        group.validation.normalized.account_holder_name,
      account_holder_kana_snapshot:
        group.validation.normalized.account_holder_kana,
      payout_profile_status_snapshot: group.profile.status,
      payout_profile_updated_at_snapshot: group.profile.updated_at,
    }));

    const { data: payoutItems, error: payoutItemsError } = await db
      .from("payout_items")
      .insert(itemPayloads)
      .select("id, creator_id");

    if (payoutItemsError) {
      throw payoutItemsError;
    }

    const payoutItemMap = new Map<string, string>(
      ((payoutItems ?? []) as Array<{
        id: string;
        creator_id: string;
      }>).map((item) => [item.creator_id, item.id])
    );

    const orderItemPayloads = readyGroups.flatMap((group) => {
      const payoutItemId = payoutItemMap.get(group.creator_id);

      if (!payoutItemId) {
        throw new Error(
          `クリエイター ${group.creator_id} の振込明細IDを取得できませんでした`
        );
      }

      return group.orders.map((order) => ({
        payout_item_id: payoutItemId,
        order_id: order.id,
        creator_payout_amount: getAmount(order.creator_payout_amount),
      }));
    });

    const { error: payoutOrderItemsError } = await db
      .from("payout_order_items")
      .insert(orderItemPayloads);

    if (payoutOrderItemsError) {
      throw payoutOrderItemsError;
    }

    const includedOrderIds = readyGroups.flatMap((group) =>
      group.orders.map((order) => order.id)
    );

    const { error: orderUpdateError } = await db
      .from("orders")
      .update({
        payout_batch_id: createdBatchId,
      })
      .in("id", includedOrderIds)
      .is("payout_batch_id", null)
      .eq("payout_status", "pending");

    if (orderUpdateError) {
      throw orderUpdateError;
    }

    for (const group of readyGroups) {
      for (const order of group.orders) {
        await safeInsertOrderEvent({
          orderId: order.id,
          actorUserId: admin.userId,
          eventType: "creator_payout_added_to_batch",
          eventData: {
            payout_batch_id: createdBatchId,
            batch_code: batchCode,
            period_start: periodStart,
            period_end: periodEnd,
            scheduled_date: scheduledDate,
            creator_payout_amount: getAmount(
              order.creator_payout_amount
            ),
            currency: "JPY",
          },
        });
      }
    }

    const { data: completedBatch, error: completedBatchError } = await db
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
        created_at
      `
      )
      .eq("id", createdBatchId)
      .single();

    if (completedBatchError) {
      throw completedBatchError;
    }

    return NextResponse.json({
      ok: true,
      batch: completedBatch,
      settings: {
        transfer_fee: transferFee,
        minimum_payout: minimumPayout,
      },
      included_creator_count: readyGroups.length,
      included_order_count: includedOrderIds.length,
      invalid_creators: invalidCreators,
      carried_creators: carriedCreators,
      invalid_messages: invalidCreators.map((creator) =>
        buildManualBankInvalidMessage({
          creator_name: creator.creator_name,
          creator_user_id: creator.creator_user_id,
          order_ids: creator.order_ids,
          warnings: creator.warnings,
        })
      ),
    });
  } catch (error) {
    console.error("admin payout batch create error:", error);

    if (createdBatchId) {
      try {
        await (supabaseAdmin as any)
          .from("payout_batches")
          .delete()
          .eq("id", createdBatchId);
      } catch (cleanupError) {
        console.error(
          "admin payout batch cleanup failed:",
          cleanupError
        );
      }
    }

    const message =
      error instanceof Error
        ? error.message
        : "振込バッチの作成に失敗しました";

    const isDuplicate =
      message.includes("duplicate key") ||
      message.includes("payout_order_items_order_unique") ||
      message.includes("payout_batches_batch_code_unique");

    return NextResponse.json(
      {
        error: isDuplicate
          ? "すでに別の振込バッチへ登録されている注文が含まれています。画面を更新してやり直してください。"
          : "振込バッチの作成に失敗しました",
        detail: message,
      },
      { status: isDuplicate ? 409 : 500 }
    );
  }
}