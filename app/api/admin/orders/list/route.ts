// File: app/api/admin/orders/list/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminApi } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type OrderRow = {
  id: string;
  created_at: string;
  updated_at: string | null;
  status: string;
  payment_status: string;
  product_name: string | null;
  menu_title_snapshot: string | null;
  b_user_id: string;
  creator_user_id: string;
  menu_price_amount: number | null;
  buyer_total_amount: number | null;
  stripe_amount: number | null;
  creator_payout_amount: number | null;
  currency: string | null;
  delivered_post_url: string | null;
  creator_accept_deadline: string | null;
  auto_complete_at: string | null;
  revision_requested_at: string | null;
  revision_count: number | null;
  max_revision_count: number | null;
};

type CompanyRow = {
  user_id: string;
  company_name: string | null;
};

type CreatorRow = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
};

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value)))
  );
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
        status,
        payment_status,
        product_name,
        menu_title_snapshot,
        b_user_id,
        creator_user_id,
        menu_price_amount,
        buyer_total_amount,
        stripe_amount,
        creator_payout_amount,
        currency,
        delivered_post_url,
        creator_accept_deadline,
        auto_complete_at,
        revision_requested_at,
        revision_count,
        max_revision_count
      `
      )
      .order("created_at", { ascending: false })
      .limit(300);

    if (ordersError) {
      console.error("admin orders list orders error:", ordersError);
      throw ordersError;
    }

    const safeOrders = ((orders ?? []) as OrderRow[]).filter(Boolean);

    const companyUserIds = uniqueStrings(
      safeOrders.map((order) => order.b_user_id)
    );
    const creatorUserIds = uniqueStrings(
      safeOrders.map((order) => order.creator_user_id)
    );

    const [
      { data: companies, error: companiesError },
      { data: creators, error: creatorsError },
    ] = await Promise.all([
      companyUserIds.length > 0
        ? supabaseAdmin
            .from("companies")
            .select("user_id, company_name")
            .in("user_id", companyUserIds)
        : Promise.resolve({ data: [], error: null }),

      creatorUserIds.length > 0
        ? supabaseAdmin
            .from("creators")
            .select("user_id, display_name, avatar_url")
            .in("user_id", creatorUserIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (companiesError) {
      console.error("admin orders list companies error:", companiesError);
      throw companiesError;
    }

    if (creatorsError) {
      console.error("admin orders list creators error:", creatorsError);
      throw creatorsError;
    }

    const companyMap = new Map(
      ((companies ?? []) as CompanyRow[]).map((company) => [
        company.user_id,
        company,
      ])
    );

    const creatorMap = new Map(
      ((creators ?? []) as CreatorRow[]).map((creator) => [
        creator.user_id,
        creator,
      ])
    );

    const enrichedOrders = safeOrders.map((order) => {
      const company = companyMap.get(order.b_user_id) ?? null;
      const creator = creatorMap.get(order.creator_user_id) ?? null;

      return {
        ...order,
        company_name: company?.company_name ?? null,
        creator_name: creator?.display_name ?? null,
        creator_avatar_url: creator?.avatar_url ?? null,
      };
    });

    return NextResponse.json({
      orders: enrichedOrders,
    });
  } catch (error) {
    console.error("admin orders list error:", error);

    return NextResponse.json(
      { error: "failed to load admin orders" },
      { status: 500 }
    );
  }
}