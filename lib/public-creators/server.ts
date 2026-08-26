import "server-only";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { PublicCreatorPagination } from "./pagination";

export type PublicCreator = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  category: string | null;
  prefecture: string | null;
  rating: number | null;
  total_orders: number | null;
  can_receive_products: boolean | null;
  public_slug: string | null;
};

export type PublicSocialAccount = {
  id: string;
  platform: string | null;
  handle: string | null;
  url: string | null;
  follower_range: string | null;
  audience_country: string | null;
};

type PublicSocialAccountRow = PublicSocialAccount & {
  creator_id: string;
};

export type PublicCreatorMenu = {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  platform: string | null;
  sns: string | null;
  menu_type: string | null;
  category: string | null;
  price: number | null;
  currency: string | null;
  deliverables: string | null;
  delivery_days: number | null;
  account_url: string | null;
  reference_price_text: string | null;
  allow_secondary_use: boolean | null;
  notes: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
  sort_order: number | null;
};

export type PublicPortfolioAsset = {
  id: string;
  creator_id: string;
  asset_url: string;
  asset_type: string;
  title: string | null;
  sort_order: number | null;
  is_public: boolean;
  created_at: string | null;
};

export type PublicCreatorDetail = {
  creator: PublicCreator;
  socialAccounts: PublicSocialAccount[];
  menus: PublicCreatorMenu[];
  portfolioAssets: PublicPortfolioAsset[];
};

export type OrderablePublicCreatorDetail = PublicCreatorDetail & {
  canAcceptRequests: true;
};

const CREATOR_COLUMNS = "id, display_name, avatar_url, bio, category, prefecture, rating, total_orders, can_receive_products, public_slug";
const SOCIAL_COLUMNS = "id, creator_id, platform, handle, url, follower_range, audience_country";
const MENU_COLUMNS = "id, creator_id, title, description, platform, sns, menu_type, category, price, currency, deliverables, delivery_days, account_url, reference_price_text, allow_secondary_use, notes, is_active, created_at, updated_at, sort_order";
const PORTFOLIO_COLUMNS = "id, creator_id, asset_url, asset_type, title, sort_order, is_public, created_at";

function publicCreatorQuery() {
  return supabaseAdmin
    .from("creators")
    .select(CREATOR_COLUMNS)
    .eq("is_public", true)
    .eq("approval_status", "approved")
    .eq("is_suspended", false);
}

async function payoutReadyCreatorIds() {
  const { data, error } = await supabaseAdmin.rpc("get_payout_ready_creator_ids");
  if (error) throw new Error("payout_ready_lookup_failed");
  return new Set(
    ((data ?? []) as Array<{ creator_id: string | null }>)
      .map((row) => row.creator_id)
      .filter((id): id is string => Boolean(id)),
  );
}

async function loadPublicRelations(creatorIds: string[]) {
  if (creatorIds.length === 0) {
    return { socialAccounts: [] as PublicSocialAccountRow[], menus: [] as PublicCreatorMenu[], portfolioAssets: [] as PublicPortfolioAsset[] };
  }

  const [socialResult, menuResult, portfolioResult] = await Promise.all([
    supabaseAdmin.from("creator_social_accounts").select(SOCIAL_COLUMNS).in("creator_id", creatorIds),
    supabaseAdmin.from("creator_menus").select(MENU_COLUMNS).in("creator_id", creatorIds).eq("is_active", true).order("sort_order", { ascending: true }),
    supabaseAdmin.from("creator_portfolio_assets").select(PORTFOLIO_COLUMNS).in("creator_id", creatorIds).eq("is_public", true).eq("asset_type", "image").order("sort_order", { ascending: true }),
  ]);

  if (socialResult.error || menuResult.error || portfolioResult.error) {
    throw new Error("public_creator_relations_failed");
  }

  return {
    socialAccounts: (socialResult.data ?? []) as PublicSocialAccountRow[],
    menus: (menuResult.data ?? []) as PublicCreatorMenu[],
    portfolioAssets: (portfolioResult.data ?? []) as PublicPortfolioAsset[],
  };
}

export async function listPublicCreators({ limit, offset }: PublicCreatorPagination) {
  const payoutReadyIds = await payoutReadyCreatorIds();
  if (payoutReadyIds.size === 0) {
    return {
      creators: [] as PublicCreator[],
      menus: [] as PublicCreatorMenu[],
      portfolioAssets: [] as PublicPortfolioAsset[],
    };
  }

  const { data, error } = await publicCreatorQuery()
    .in("id", [...payoutReadyIds])
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error("public_creator_list_failed");

  const creators = (data ?? []) as PublicCreator[];
  const relations = await loadPublicRelations(creators.map((creator) => creator.id));
  return {
    creators: creators.map((creator) => ({
      ...creator,
      creator_social_accounts: relations.socialAccounts
        .filter((account) => account.creator_id === creator.id)
        .map(({ creator_id: _creatorId, ...account }) => account),
    })),
    menus: relations.menus,
    portfolioAssets: relations.portfolioAssets,
  };
}

export async function getPublicCreatorById(id: string): Promise<PublicCreatorDetail | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return null;
  const { data, error } = await publicCreatorQuery().eq("id", id).maybeSingle();
  if (error) throw new Error("public_creator_detail_failed");
  const creator = data as PublicCreator | null;
  if (!creator) return null;
  const relations = await loadPublicRelations([creator.id]);
  return {
    creator,
    socialAccounts: relations.socialAccounts.map(({ creator_id: _creatorId, ...account }) => account),
    menus: relations.menus,
    portfolioAssets: relations.portfolioAssets,
  };
}

export async function getOrderablePublicCreatorById(id: string): Promise<OrderablePublicCreatorDetail | null> {
  const [payoutReadyIds, creator] = await Promise.all([payoutReadyCreatorIds(), getPublicCreatorById(id)]);
  return creator && payoutReadyIds.has(creator.creator.id)
    ? { ...creator, canAcceptRequests: true }
    : null;
}

export async function getOrderablePublicCreatorBySlugOrId(slug: string): Promise<OrderablePublicCreatorDetail | null> {
  const bySlug = await publicCreatorQuery().eq("public_slug", slug).maybeSingle();
  if (bySlug.error) throw new Error("public_creator_slug_failed");
  if (bySlug.data) return getOrderablePublicCreatorById((bySlug.data as PublicCreator).id);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug)) return null;
  return getOrderablePublicCreatorById(slug);
}
