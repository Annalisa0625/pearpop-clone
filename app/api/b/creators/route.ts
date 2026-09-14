import { NextResponse } from "next/server";
import {
  isCreatorPaidMarketplaceEnabled,
  shouldIncludeCreatorInCompanyDirectory,
} from "@/lib/creator/marketplaceAvailability";

export const dynamic = "force-dynamic";

type CompanyCreatorListDeps = {
  createSupabaseServerClient: () => Promise<any>;
  supabaseAdmin: any;
};

async function loadCompanyCreatorListDeps(): Promise<CompanyCreatorListDeps> {
  const [{ createSupabaseServerClient }, { supabaseAdmin }] = await Promise.all([
    import("@/lib/supabase/server"),
    import("@/lib/supabaseAdmin"),
  ]);
  return { createSupabaseServerClient, supabaseAdmin };
}

let companyCreatorListDepsLoader = loadCompanyCreatorListDeps;

export function __setCompanyCreatorListDepsLoaderForTests(
  loader?: () => Promise<CompanyCreatorListDeps>,
) {
  companyCreatorListDepsLoader = loader ?? loadCompanyCreatorListDeps;
}

function getBoundedInteger(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, max);
}

function toCreatorListItem(row: any) {
  const socials = Array.isArray(row.creator_social_accounts)
    ? row.creator_social_accounts
    : row.creator_social_accounts
      ? [row.creator_social_accounts]
      : [];
  return {
    id: row.id,
    display_name: row.display_name ?? null,
    avatar_url: row.avatar_url ?? null,
    category: row.category ?? null,
    country: row.country ?? null,
    prefecture: row.prefecture ?? null,
    can_receive_products: row.can_receive_products ?? null,
    rating: row.rating ?? null,
    total_orders: row.total_orders ?? null,
    creator_social_accounts: socials.map((social: any) => ({
      platform: social.platform ?? null,
      url: social.url ?? null,
      handle: social.handle ?? null,
      follower_range: social.follower_range ?? null,
      audience_country: social.audience_country ?? null,
    })),
  };
}

export async function GET(request: Request) {
  const { createSupabaseServerClient, supabaseAdmin } =
    await companyCreatorListDepsLoader();
  const authenticatedClient = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await authenticatedClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data: roleRows, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (roleError) {
    console.error("company creator list role load error", roleError);
    return NextResponse.json({ error: "Failed to verify account" }, { status: 500 });
  }
  if (!(roleRows ?? []).some((row: { role: string | null }) => row.role === "company")) {
    return NextResponse.json({ error: "Company account required" }, { status: 403 });
  }

  const url = new URL(request.url);
  const limit = Math.max(1, getBoundedInteger(url.searchParams.get("limit"), 100, 100));
  const offset = getBoundedInteger(url.searchParams.get("offset"), 0, 10_000);

  const { data: creatorRows, error: creatorError } = await supabaseAdmin
    .from("creators")
    .select(`
      id,
      display_name,
      avatar_url,
      category,
      country,
      prefecture,
      can_receive_products,
      rating,
      total_orders,
      creator_social_accounts (
        platform,
        url,
        handle,
        follower_range,
        audience_country
      )
    `)
    .eq("approval_status", "approved")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (creatorError) {
    console.error("company creator list load error", creatorError);
    return NextResponse.json({ error: "Failed to load creators" }, { status: 500 });
  }

  const creators = (creatorRows ?? []).map(toCreatorListItem);
  const creatorIds = creators.map((row: { id: string }) => row.id);
  if (creatorIds.length === 0) {
    return NextResponse.json({ creators: [], menus: [], portfolioAssets: [] });
  }

  const [{ data: payoutRows, error: payoutError }, menusResult, portfolioResult] =
    await Promise.all([
      supabaseAdmin.rpc("get_payout_ready_creator_ids"),
      supabaseAdmin
        .from("creator_menus")
        .select("id, creator_id, title, price, currency, is_active")
        .in("creator_id", creatorIds)
        .eq("is_active", true),
      supabaseAdmin
        .from("creator_portfolio_assets")
        .select("id, creator_id, asset_url, asset_type, sort_order, is_public, created_at")
        .in("creator_id", creatorIds)
        .eq("is_public", true)
        .eq("asset_type", "image")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

  if (payoutError) console.error("company creator payout readiness load error", payoutError);
  if (menusResult.error) {
    console.error("company creator menus load error", menusResult.error);
    return NextResponse.json({ error: "Failed to load creators" }, { status: 500 });
  }
  if (portfolioResult.error) {
    console.error("company creator portfolio load error", portfolioResult.error);
    return NextResponse.json({ error: "Failed to load creators" }, { status: 500 });
  }

  const payoutReadyIds = new Set(
    (payoutRows ?? [])
      .map((row: { creator_id: string | null }) => row.creator_id)
      .filter((id: string | null): id is string => Boolean(id)),
  );
  const menuCountByCreator = new Map<string, number>();
  for (const menu of menusResult.data ?? []) {
    if (!menu.creator_id) continue;
    menuCountByCreator.set(
      menu.creator_id,
      (menuCountByCreator.get(menu.creator_id) ?? 0) + 1,
    );
  }

  const visibleCreators = creators.filter((creator: { id: string; country: string | null }) =>
    shouldIncludeCreatorInCompanyDirectory(
      creator.country,
      payoutReadyIds.has(creator.id),
      menuCountByCreator.get(creator.id) ?? 0,
    ),
  );
  const visibleIds = new Set(visibleCreators.map((creator: { id: string }) => creator.id));
  const paidCreatorIds = new Set(
    visibleCreators
      .filter((creator: { country: string | null }) =>
        isCreatorPaidMarketplaceEnabled(creator.country),
      )
      .map((creator: { id: string }) => creator.id),
  );

  return NextResponse.json({
    creators: visibleCreators,
    menus: (menusResult.data ?? []).filter(
      (menu: { creator_id: string | null }) =>
        Boolean(menu.creator_id && paidCreatorIds.has(menu.creator_id)),
    ).map((menu: any) => ({
      id: menu.id,
      creator_id: menu.creator_id,
      title: menu.title ?? null,
      price: menu.price ?? null,
      currency: menu.currency ?? null,
      is_active: menu.is_active ?? null,
    })),
    portfolioAssets: (portfolioResult.data ?? [])
      .filter((asset: { creator_id: string }) => visibleIds.has(asset.creator_id))
      .map((asset: any) => ({
        id: asset.id,
        creator_id: asset.creator_id,
        asset_url: asset.asset_url,
        asset_type: asset.asset_type,
        sort_order: asset.sort_order ?? null,
        is_public: asset.is_public ?? null,
        created_at: asset.created_at ?? null,
      })),
  });
}
