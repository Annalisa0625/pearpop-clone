// File: app/api/admin/payouts/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminApi } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PayoutMethod = "manual_bank_transfer" | "stripe_connect";

type PayoutStatus = "unpaid" | "pending" | "paid" | "withheld" | "failed";

type OrderPayoutRow = {
  id: string;
  completed_at: string | null;
  product_name: string | null;
  menu_title_snapshot: string | null;
  b_user_id: string;
  creator_id: string | null;
  creator_user_id: string;
  status: string;
  payment_status: string;
  payout_method: PayoutMethod | null;
  payout_status: PayoutStatus | null;
  payout_due_at: string | null;
  payout_paid_at: string | null;
  payout_batch_id: string | null;
  creator_payout_amount: number | null;
  currency: string | null;
};

type CreatorRow = {
  id: string;
  user_id: string;
  display_name: string | null;
  full_name: string | null;
};

type PayoutProfileRow = {
  creator_id: string;
  user_id: string;
  payout_method: PayoutMethod | null;
  status: string | null;
  bank_name: string | null;
  bank_code: string | null;
  branch_name: string | null;
  branch_code: string | null;
  account_type: string | null;
  account_number: string | null;
  account_holder_name: string | null;
  account_holder_kana: string | null;
};

type CsvTransferRow = {
  creator_id: string | null;
  creator_user_id: string;
  creator_name: string;
  bank_code: string;
  bank_name: string;
  branch_code: string;
  branch_name: string;
  account_type: string;
  account_number: string;
  account_holder_name: string;
  account_holder_kana: string;
  payout_amount: number;
  currency: string;
  order_count: number;
  order_ids: string[];
};

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value)))
  );
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

function normalizeAccountType(value: string | null | undefined) {
  if (value === "checking") return "当座";
  return "普通";
}

function escapeCsvCell(value: string | number | null | undefined) {
  const text = String(value ?? "");
  const escaped = text.replace(/"/g, '""');

  if (
    escaped.includes(",") ||
    escaped.includes("\n") ||
    escaped.includes("\r") ||
    escaped.includes('"')
  ) {
    return `"${escaped}"`;
  }

  return escaped;
}

function toCsv(rows: Array<Array<string | number | null | undefined>>) {
  return rows
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
    .join("\r\n");
}

function createFileName() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");

  return `trendre-payouts-${y}${m}${d}-${hh}${mm}.csv`;
}

function buildCsvTransferRows(args: {
  orders: OrderPayoutRow[];
  creatorMap: Map<string, CreatorRow>;
  payoutProfileMap: Map<string, PayoutProfileRow>;
}) {
  const transferMap = new Map<string, CsvTransferRow>();

  for (const order of args.orders) {
    const payoutMethod = normalizePayoutMethod(order.payout_method);
    const payoutStatus = normalizePayoutStatus(order.payout_status);

    if (order.status !== "completed") continue;
    if (order.payment_status !== "captured") continue;
    if (payoutMethod !== "manual_bank_transfer") continue;
    if (payoutStatus !== "pending") continue;

    const payoutAmount = getAmount(order.creator_payout_amount);

    if (payoutAmount <= 0) continue;

    const creatorKey = order.creator_id || order.creator_user_id;
    const creator = order.creator_id
      ? args.creatorMap.get(order.creator_id) ?? null
      : null;
    const payoutProfile = order.creator_id
      ? args.payoutProfileMap.get(order.creator_id) ?? null
      : null;

    const creatorName =
      creator?.display_name || creator?.full_name || order.creator_user_id;

    const existing = transferMap.get(creatorKey);

    if (existing) {
      existing.payout_amount += payoutAmount;
      existing.order_count += 1;
      existing.order_ids.push(order.id);
      continue;
    }

    transferMap.set(creatorKey, {
      creator_id: order.creator_id,
      creator_user_id: order.creator_user_id,
      creator_name: creatorName,
      bank_code: payoutProfile?.bank_code ?? "",
      bank_name: payoutProfile?.bank_name ?? "",
      branch_code: payoutProfile?.branch_code ?? "",
      branch_name: payoutProfile?.branch_name ?? "",
      account_type: normalizeAccountType(payoutProfile?.account_type),
      account_number: payoutProfile?.account_number ?? "",
      account_holder_name: payoutProfile?.account_holder_name ?? "",
      account_holder_kana: payoutProfile?.account_holder_kana ?? "",
      payout_amount: payoutAmount,
      currency: order.currency || "JPY",
      order_count: 1,
      order_ids: [order.id],
    });
  }

  return Array.from(transferMap.values()).sort(
    (a, b) => b.payout_amount - a.payout_amount
  );
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdminApi();

    if (!admin.ok) {
      return admin.response;
    }

    const url = new URL(req.url);
    const includeHeader = url.searchParams.get("header") !== "false";

    const { data: orders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select(
        `
        id,
        completed_at,
        product_name,
        menu_title_snapshot,
        b_user_id,
        creator_id,
        creator_user_id,
        status,
        payment_status,
        payout_method,
        payout_status,
        payout_due_at,
        payout_paid_at,
        payout_batch_id,
        creator_payout_amount,
        currency
      `
      )
      .eq("status", "completed")
      .eq("payment_status", "captured")
      .eq("payout_method", "manual_bank_transfer")
      .eq("payout_status", "pending")
      .order("payout_due_at", { ascending: true, nullsFirst: false })
      .order("completed_at", { ascending: false, nullsFirst: false })
      .limit(1000);

    if (ordersError) {
      console.error("admin payouts export orders error:", ordersError);
      throw ordersError;
    }

    const safeOrders = ((orders ?? []) as OrderPayoutRow[]).filter(Boolean);

    const creatorIds = uniqueStrings(safeOrders.map((order) => order.creator_id));

    const [
      { data: creators, error: creatorsError },
      { data: payoutProfiles, error: payoutProfilesError },
    ] = await Promise.all([
      creatorIds.length > 0
        ? supabaseAdmin
            .from("creators")
            .select("id, user_id, display_name, full_name")
            .in("id", creatorIds)
        : Promise.resolve({ data: [], error: null }),

      creatorIds.length > 0
        ? supabaseAdmin
            .from("creator_payout_profiles")
            .select(
              `
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
              account_holder_kana
            `
            )
            .in("creator_id", creatorIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (creatorsError) {
      console.error("admin payouts export creators error:", creatorsError);
      throw creatorsError;
    }

    if (payoutProfilesError) {
      console.error("admin payouts export payout profiles error:", payoutProfilesError);
      throw payoutProfilesError;
    }

    const creatorMap = new Map(
      ((creators ?? []) as CreatorRow[]).map((creator) => [creator.id, creator])
    );

    const payoutProfileMap = new Map(
      ((payoutProfiles ?? []) as PayoutProfileRow[]).map((profile) => [
        profile.creator_id,
        profile,
      ])
    );

    const transferRows = buildCsvTransferRows({
      orders: safeOrders,
      creatorMap,
      payoutProfileMap,
    });

    const csvRows: Array<Array<string | number | null | undefined>> = [];

    if (includeHeader) {
      csvRows.push([
        "creator_id",
        "creator_user_id",
        "creator_name",
        "bank_code",
        "bank_name",
        "branch_code",
        "branch_name",
        "account_type",
        "account_number",
        "account_holder_name",
        "account_holder_kana",
        "payout_amount",
        "currency",
        "order_count",
        "order_ids",
        "note",
      ]);
    }

    for (const row of transferRows) {
      csvRows.push([
        row.creator_id,
        row.creator_user_id,
        row.creator_name,
        row.bank_code,
        row.bank_name,
        row.branch_code,
        row.branch_name,
        row.account_type,
        row.account_number,
        row.account_holder_name,
        row.account_holder_kana,
        row.payout_amount,
        row.currency,
        row.order_count,
        row.order_ids.join(" "),
        "Trendre manual payout",
      ]);
    }

    const csv = `\uFEFF${toCsv(csvRows)}\r\n`;
    const fileName = createFileName();

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("admin payouts export error:", error);

    return NextResponse.json(
      { error: "支払CSVの出力に失敗しました" },
      { status: 500 }
    );
  }
}