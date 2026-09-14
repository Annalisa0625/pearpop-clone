import { NextResponse } from "next/server";
import { isCreatorCountry } from "@/lib/creator/country";
import { isCreatorPaidMarketplaceEnabled } from "@/lib/creator/marketplaceAvailability";

export const dynamic = "force-dynamic";

type CompanyCreatorDetailDeps = {
  createSupabaseServerClient: () => Promise<any>;
  supabaseAdmin: any;
};

async function loadCompanyCreatorDetailDeps(): Promise<CompanyCreatorDetailDeps> {
  const [{ createSupabaseServerClient }, { supabaseAdmin }] = await Promise.all([
    import("@/lib/supabase/server"),
    import("@/lib/supabaseAdmin"),
  ]);
  return { createSupabaseServerClient, supabaseAdmin };
}

let companyCreatorDetailDepsLoader = loadCompanyCreatorDetailDeps;

export function __setCompanyCreatorDetailDepsLoaderForTests(
  loader?: () => Promise<CompanyCreatorDetailDeps>,
) {
  companyCreatorDetailDepsLoader = loader ?? loadCompanyCreatorDetailDeps;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { createSupabaseServerClient, supabaseAdmin } =
    await companyCreatorDetailDepsLoader();
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
    console.error("company creator detail role load error", roleError);
    return NextResponse.json({ error: "Failed to verify account" }, { status: 500 });
  }
  if (!(roleRows ?? []).some((row: { role: string | null }) => row.role === "company")) {
    return NextResponse.json({ error: "Company account required" }, { status: 403 });
  }

  const { id } = await context.params;
  const { data: creator, error: creatorError } = await supabaseAdmin
    .from("creators")
    .select("id, display_name, avatar_url, category, country")
    .eq("id", id)
    .eq("is_public", true)
    .eq("approval_status", "approved")
    .maybeSingle();

  if (creatorError) {
    console.error("company creator detail load error", creatorError);
    return NextResponse.json({ error: "Failed to load creator" }, { status: 500 });
  }
  if (!creator || !isCreatorCountry(creator.country)) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  const paidMarketplaceEnabled = isCreatorPaidMarketplaceEnabled(creator.country);
  if (paidMarketplaceEnabled) {
    const { data: payoutRows, error: payoutError } = await supabaseAdmin.rpc(
      "get_payout_ready_creator_ids",
    );
    if (payoutError) {
      console.error("company creator payout readiness load error", payoutError);
      return NextResponse.json({ error: "Failed to load creator" }, { status: 500 });
    }
    if (!(payoutRows ?? []).some((row: { creator_id: string | null }) => row.creator_id === id)) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    }
  }

  const menuPromise = paidMarketplaceEnabled
    ? supabaseAdmin
        .from("creator_menus")
        .select(`
          id, creator_id, title, description, platform, sns, menu_type, category,
          price, currency, deliverables, delivery_days, account_url,
          reference_price_text, allow_secondary_use, notes, is_active, sort_order
        `)
        .eq("creator_id", id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
    : Promise.resolve({ data: [], error: null });

  const [menusResult, socialsResult, portfolioResult] = await Promise.all([
    menuPromise,
    supabaseAdmin
      .from("creator_social_accounts")
      .select("id, creator_id, platform, audience_country, follower_range, url")
      .eq("creator_id", id),
    supabaseAdmin
      .from("creator_portfolio_assets")
      .select("id, creator_id, asset_url, asset_type, title, sort_order, is_public, created_at")
      .eq("creator_id", id)
      .eq("is_public", true)
      .eq("asset_type", "image")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (menusResult.error || socialsResult.error || portfolioResult.error) {
    console.error("company creator public data load error", {
      menus: menusResult.error,
      socials: socialsResult.error,
      portfolio: portfolioResult.error,
    });
    return NextResponse.json({ error: "Failed to load creator" }, { status: 500 });
  }

  return NextResponse.json({
    creator: {
      id: creator.id,
      display_name: creator.display_name,
      avatar_url: creator.avatar_url ?? null,
      category: creator.category ?? null,
      country: creator.country,
    },
    menus: paidMarketplaceEnabled
      ? (menusResult.data ?? []).map((menu: any) => ({
          id: menu.id,
          creator_id: menu.creator_id,
          title: menu.title,
          description: menu.description ?? null,
          platform: menu.platform ?? null,
          sns: menu.sns ?? null,
          menu_type: menu.menu_type ?? null,
          category: menu.category ?? null,
          price: menu.price ?? null,
          currency: menu.currency,
          deliverables: menu.deliverables ?? null,
          delivery_days: menu.delivery_days ?? null,
          account_url: menu.account_url ?? null,
          reference_price_text: menu.reference_price_text ?? null,
          allow_secondary_use: menu.allow_secondary_use ?? null,
          notes: menu.notes ?? null,
          is_active: menu.is_active ?? null,
          sort_order: menu.sort_order,
        }))
      : [],
    socialAccounts: (socialsResult.data ?? []).map((social: any) => ({
      id: social.id,
      creator_id: social.creator_id,
      platform: social.platform ?? null,
      audience_country: social.audience_country ?? null,
      follower_range: social.follower_range ?? null,
      url: social.url ?? null,
    })),
    portfolioAssets: (portfolioResult.data ?? []).map((asset: any) => ({
      id: asset.id,
      creator_id: asset.creator_id,
      asset_url: asset.asset_url,
      asset_type: asset.asset_type,
      title: asset.title ?? null,
      sort_order: asset.sort_order ?? null,
      is_public: asset.is_public ?? null,
      created_at: asset.created_at ?? null,
    })),
  });
}
