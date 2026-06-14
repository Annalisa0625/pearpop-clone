// File: app/api/admin/payouts/list/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminApi } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PayoutMethod = "manual_bank_transfer" | "stripe_connect";

type PayoutStatus = "unpaid" | "pending" | "paid" | "withheld" | "failed";

type OrderPayoutRow = {
  id: string;
  created_at: string;
  updated_at: string | null;
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
  payout_note: string | null;
  creator_payout_amount: number | null;
  currency: string | null;
};

type CompanyRow = {
  user_id: string;
  company_name: string | null;
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
  submitted_at: string | null;
  verified_at: string | null;
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

function payoutStatusSortWeight(status: PayoutStatus) {
  if (status === "pending") return 1;
  if (status === "failed") return 2;
  if (status === "withheld") return 3;
  if (status === "unpaid") return 4;
  return 5;
}

function getAmount(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

export async function GET() {
  try {
    const admin = await requireAdminApi();

    if (!admin.ok) {
      return admin.response;
    }

    const { data: orders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select(
        `
        id,
        created_at,
        updated_at,
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
        payout_note,
        creator_payout_amount,
        currency
      `
      )
      .eq("status", "completed")
      .eq("payment_status", "captured")
      .order("payout_due_at", { ascending: true, nullsFirst: false })
      .order("completed_at", { ascending: false, nullsFirst: false })
      .limit(500);

    if (ordersError) {
      console.error("admin payouts list orders error:", ordersError);
      throw ordersError;
    }

    const safeOrders = ((orders ?? []) as OrderPayoutRow[]).filter(Boolean);

    const creatorIds = uniqueStrings(safeOrders.map((order) => order.creator_id));
    const creatorUserIds = uniqueStrings(
      safeOrders.map((order) => order.creator_user_id)
    );
    const companyUserIds = uniqueStrings(safeOrders.map((order) => order.b_user_id));

    const [
      { data: creators, error: creatorsError },
      { data: companies, error: companiesError },
      { data: payoutProfiles, error: payoutProfilesError },
    ] = await Promise.all([
      creatorIds.length > 0
        ? supabaseAdmin
            .from("creators")
            .select("id, user_id, display_name, full_name")
            .in("id", creatorIds)
        : Promise.resolve({ data: [], error: null }),

      companyUserIds.length > 0
        ? supabaseAdmin
            .from("companies")
            .select("user_id, company_name")
            .in("user_id", companyUserIds)
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
              account_holder_kana,
              submitted_at,
              verified_at
            `
            )
            .in("creator_id", creatorIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (creatorsError) {
      console.error("admin payouts list creators error:", creatorsError);
      throw creatorsError;
    }

    if (companiesError) {
      console.error("admin payouts list companies error:", companiesError);
      throw companiesError;
    }

    if (payoutProfilesError) {
      console.error("admin payouts list payout profiles error:", payoutProfilesError);
      throw payoutProfilesError;
    }

    const creatorMap = new Map(
      ((creators ?? []) as CreatorRow[]).map((creator) => [creator.id, creator])
    );

    const companyMap = new Map(
      ((companies ?? []) as CompanyRow[]).map((company) => [
        company.user_id,
        company,
      ])
    );

    const payoutProfileMap = new Map(
      ((payoutProfiles ?? []) as PayoutProfileRow[]).map((profile) => [
        profile.creator_id,
        profile,
      ])
    );

    const items = safeOrders
      .map((order) => {
        const creator = order.creator_id
          ? creatorMap.get(order.creator_id) ?? null
          : null;
        const company = companyMap.get(order.b_user_id) ?? null;
        const payoutProfile = order.creator_id
          ? payoutProfileMap.get(order.creator_id) ?? null
          : null;

        const payoutMethod = normalizePayoutMethod(
          order.payout_method ?? payoutProfile?.payout_method
        );
        const payoutStatus = normalizePayoutStatus(order.payout_status);
        const payoutAmount = getAmount(order.creator_payout_amount);
        const creatorName =
          creator?.display_name || creator?.full_name || order.creator_user_id;
        const companyName = company?.company_name || order.b_user_id;

        return {
          id: order.id,
          order_id: order.id,
          created_at: order.created_at,
          updated_at: order.updated_at,
          completed_at: order.completed_at,
          product_name: order.product_name,
          menu_title_snapshot: order.menu_title_snapshot,
          company_user_id: order.b_user_id,
          company_name: companyName,
          creator_id: order.creator_id,
          creator_user_id: order.creator_user_id,
          creator_name: creatorName,
          status: order.status,
          payment_status: order.payment_status,
          payout_method: payoutMethod,
          payout_status: payoutStatus,
          payout_due_at: order.payout_due_at,
          payout_paid_at: order.payout_paid_at,
          payout_batch_id: order.payout_batch_id,
          payout_note: order.payout_note,
          creator_payout_amount: payoutAmount,
          currency: order.currency || "JPY",
          payout_profile_status: payoutProfile?.status ?? null,
          bank_name: payoutProfile?.bank_name ?? null,
          bank_code: payoutProfile?.bank_code ?? null,
          branch_name: payoutProfile?.branch_name ?? null,
          branch_code: payoutProfile?.branch_code ?? null,
          account_type: payoutProfile?.account_type ?? null,
          account_number: payoutProfile?.account_number ?? null,
          account_holder_name: payoutProfile?.account_holder_name ?? null,
          account_holder_kana: payoutProfile?.account_holder_kana ?? null,
          bank_submitted_at: payoutProfile?.submitted_at ?? null,
          bank_verified_at: payoutProfile?.verified_at ?? null,
          has_bank_account:
            !!payoutProfile?.bank_name &&
            !!payoutProfile?.branch_name &&
            !!payoutProfile?.account_number &&
            !!payoutProfile?.account_holder_name,
        };
      })
      .sort((a, b) => {
        const statusDiff =
          payoutStatusSortWeight(a.payout_status) -
          payoutStatusSortWeight(b.payout_status);

        if (statusDiff !== 0) return statusDiff;

        const aDue = a.payout_due_at ? new Date(a.payout_due_at).getTime() : 0;
        const bDue = b.payout_due_at ? new Date(b.payout_due_at).getTime() : 0;

        if (aDue !== bDue) return aDue - bDue;

        const aCompleted = a.completed_at
          ? new Date(a.completed_at).getTime()
          : 0;
        const bCompleted = b.completed_at
          ? new Date(b.completed_at).getTime()
          : 0;

        return bCompleted - aCompleted;
      });

    const pendingItems = items.filter((item) => item.payout_status === "pending");
    const paidItems = items.filter((item) => item.payout_status === "paid");
    const withheldItems = items.filter(
      (item) => item.payout_status === "withheld"
    );
    const failedItems = items.filter((item) => item.payout_status === "failed");

    const summary = {
      total_count: items.length,
      pending_count: pendingItems.length,
      paid_count: paidItems.length,
      withheld_count: withheldItems.length,
      failed_count: failedItems.length,
      pending_amount: pendingItems.reduce(
        (sum, item) => sum + item.creator_payout_amount,
        0
      ),
      paid_amount: paidItems.reduce(
        (sum, item) => sum + item.creator_payout_amount,
        0
      ),
      withheld_amount: withheldItems.reduce(
        (sum, item) => sum + item.creator_payout_amount,
        0
      ),
      failed_amount: failedItems.reduce(
        (sum, item) => sum + item.creator_payout_amount,
        0
      ),
    };

    const creatorSummaryMap = new Map<
      string,
      {
        creator_id: string | null;
        creator_user_id: string;
        creator_name: string;
        payout_method: PayoutMethod;
        payout_status: PayoutStatus;
        total_amount: number;
        order_count: number;
        bank_name: string | null;
        branch_name: string | null;
        account_type: string | null;
        account_number: string | null;
        account_holder_name: string | null;
        account_holder_kana: string | null;
        has_bank_account: boolean;
      }
    >();

    for (const item of pendingItems) {
      const key = item.creator_id || item.creator_user_id;
      const existing = creatorSummaryMap.get(key);

      if (existing) {
        existing.total_amount += item.creator_payout_amount;
        existing.order_count += 1;
        continue;
      }

      creatorSummaryMap.set(key, {
        creator_id: item.creator_id,
        creator_user_id: item.creator_user_id,
        creator_name: item.creator_name,
        payout_method: item.payout_method,
        payout_status: item.payout_status,
        total_amount: item.creator_payout_amount,
        order_count: 1,
        bank_name: item.bank_name,
        branch_name: item.branch_name,
        account_type: item.account_type,
        account_number: item.account_number,
        account_holder_name: item.account_holder_name,
        account_holder_kana: item.account_holder_kana,
        has_bank_account: item.has_bank_account,
      });
    }

    const creator_summary = Array.from(creatorSummaryMap.values()).sort(
      (a, b) => b.total_amount - a.total_amount
    );

    return NextResponse.json({
      ok: true,
      summary,
      creator_summary,
      items,
      creator_user_ids: creatorUserIds,
    });
  } catch (error) {
    console.error("admin payouts list error:", error);

    return NextResponse.json(
      { error: "支払管理一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}