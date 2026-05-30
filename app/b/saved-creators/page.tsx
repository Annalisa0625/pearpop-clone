// File: app/b/saved-creators/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";

type SavedCreatorRow = {
  creator_id: string;
  created_at: string | null;
};

type SocialAccountRow = {
  platform?: string | null;
  url?: string | null;
  handle?: string | null;
  follower_range?: string | null;
  audience_country?: string | null;
};

type CreatorRow = {
  id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  category?: string | null;
  approval_status?: string | null;
  is_public?: boolean | null;
  stripe_onboarding_completed?: boolean | null;
  rating?: number | null;
  total_orders?: number | null;
  creator_social_accounts?: SocialAccountRow[] | null;
};

type MenuRow = {
  id: string;
  creator_id: string | null;
  title: string | null;
  price: number | null;
  currency: string | null;
  is_active: boolean | null;
};

type PortfolioAssetRow = {
  id: string;
  creator_id: string;
  asset_url: string;
  asset_type: string;
  sort_order: number | null;
  is_public: boolean | null;
  created_at: string | null;
};

type SavedInfluencerCard = {
  id: string;
  displayName: string;
  primaryAccountName: string | null;
  avatarUrl: string | null;
  cardImageUrl: string | null;
  category: string | null;
  socialLinks: {
    platform: string;
    url: string | null;
  }[];
  primaryAudienceCountry: string | null;
  followerRange: string | null;
  menuCount: number;
  startingPrice: number | null;
  startingCurrency: string | null;
  topMenuTitle: string | null;
  rating: number | null;
  reviewCount: number;
};

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function normalizePlatform(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function cleanCountryInput(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) return "";

  const normalized = raw
    .toLowerCase()
    .replace(/\u3000/g, " ")
    .replace(/[_\-/:|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const compact = normalized.replace(/\s+/g, "");

  if (
    normalized === "日本" ||
    normalized === "japan" ||
    normalized === "jp" ||
    normalized === "jpn" ||
    compact.includes("日本")
  ) {
    return "japan";
  }

  if (
    normalized === "韓国" ||
    normalized === "korea" ||
    normalized === "south korea" ||
    normalized === "kr" ||
    compact.includes("韓国")
  ) {
    return "korea";
  }

  if (
    normalized === "台湾" ||
    normalized === "taiwan" ||
    normalized === "tw" ||
    compact.includes("台湾")
  ) {
    return "taiwan";
  }

  if (
    normalized === "香港" ||
    normalized === "hong kong" ||
    normalized === "hk" ||
    compact.includes("香港")
  ) {
    return "hong_kong";
  }

  if (
    normalized === "中国" ||
    normalized === "china" ||
    normalized === "cn" ||
    compact.includes("中国")
  ) {
    return "china";
  }

  if (
    normalized === "タイ" ||
    normalized === "thailand" ||
    normalized === "th" ||
    compact.includes("タイ")
  ) {
    return "thailand";
  }

  if (
    normalized === "ベトナム" ||
    normalized === "vietnam" ||
    normalized === "vn" ||
    compact.includes("ベトナム")
  ) {
    return "vietnam";
  }

  if (
    normalized === "インドネシア" ||
    normalized === "indonesia" ||
    normalized === "id" ||
    compact.includes("インドネシア")
  ) {
    return "indonesia";
  }

  if (
    normalized === "フィリピン" ||
    normalized === "philippines" ||
    normalized === "ph" ||
    compact.includes("フィリピン")
  ) {
    return "philippines";
  }

  if (
    normalized === "マレーシア" ||
    normalized === "malaysia" ||
    normalized === "my" ||
    compact.includes("マレーシア")
  ) {
    return "malaysia";
  }

  if (
    normalized === "シンガポール" ||
    normalized === "singapore" ||
    normalized === "sg" ||
    compact.includes("シンガポール")
  ) {
    return "singapore";
  }

  if (
    normalized === "アメリカ" ||
    normalized === "united states" ||
    normalized === "usa" ||
    normalized === "us" ||
    compact.includes("アメリカ")
  ) {
    return "united_states";
  }

  if (
    normalized === "その他" ||
    normalized === "other" ||
    compact.includes("その他")
  ) {
    return "other";
  }

  return raw;
}

function getCountryLabel(
  country: string | null | undefined,
  locale: "ja" | "en"
) {
  const cleaned = cleanCountryInput(country);

  const jaMap: Record<string, string> = {
    japan: "日本",
    korea: "韓国",
    taiwan: "台湾",
    hong_kong: "香港",
    china: "中国",
    thailand: "タイ",
    vietnam: "ベトナム",
    indonesia: "インドネシア",
    philippines: "フィリピン",
    malaysia: "マレーシア",
    singapore: "シンガポール",
    united_states: "アメリカ",
    other: "その他",
  };

  const enMap: Record<string, string> = {
    japan: "Japan",
    korea: "Korea",
    taiwan: "Taiwan",
    hong_kong: "Hong Kong",
    china: "China",
    thailand: "Thailand",
    vietnam: "Vietnam",
    indonesia: "Indonesia",
    philippines: "Philippines",
    malaysia: "Malaysia",
    singapore: "Singapore",
    united_states: "United States",
    other: "Other",
  };

  return locale === "ja"
    ? jaMap[cleaned] ?? ((country ?? "").trim() || "不明")
    : enMap[cleaned] ?? ((country ?? "").trim() || "Unknown");
}

function formatPrice(value: number | null, currency: string | null | undefined) {
  if (value == null) return "価格未設定";

  const safeCurrency = currency || "JPY";

  try {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: safeCurrency === "JPY" ? 0 : 2,
    }).format(value);
  } catch {
    if (safeCurrency === "USD") return `$${value.toLocaleString()}`;
    return `¥${value.toLocaleString()}`;
  }
}

function formatStartingPrice(
  value: number | null,
  currency: string | null | undefined
) {
  if (value == null) return "-";
  return `${formatPrice(value, currency)}〜`;
}

function getPlatformLabel(value: string | null | undefined) {
  const normalized = normalizePlatform(value);

  if (!normalized || normalized === "all") return "Any";
  if (normalized.includes("instagram")) return "Instagram";
  if (normalized.includes("tiktok")) return "TikTok";
  if (normalized.includes("youtube")) return "YouTube";
  if (normalized === "x" || normalized.includes("twitter")) return "X";
  if (normalized.includes("ugc")) return "UGC";

  return value?.trim() || "SNS";
}

function getPlatformIcon(value: string | null | undefined) {
  const normalized = normalizePlatform(value);

  if (normalized.includes("instagram")) {
    return (
      <img
        src="/brand/social/instagram.png"
        alt=""
        className="h-4 w-4 object-contain"
        aria-hidden="true"
      />
    );
  }

  if (normalized.includes("tiktok")) {
    return (
      <img
        src="/brand/social/tiktok.png"
        alt=""
        className="h-4 w-4 object-contain"
        aria-hidden="true"
      />
    );
  }

  if (normalized.includes("youtube")) {
    return (
      <img
        src="/brand/social/youtube.png"
        alt=""
        className="h-4 w-4 object-contain"
        aria-hidden="true"
      />
    );
  }

  if (normalized === "x" || normalized.includes("twitter")) {
    return (
      <img
        src="/brand/social/x.png"
        alt=""
        className="h-4 w-4 object-contain"
        aria-hidden="true"
      />
    );
  }

  return "●";
}

function formatFollowerLabel(followerRange: string | null | undefined) {
  const range = followerRange?.trim();
  if (!range) return null;
  return range;
}

function getInfluencerInitial(name: string) {
  return (name || "I").trim().slice(0, 1).toUpperCase();
}

function getSocialAccountName(social: SocialAccountRow | null | undefined) {
  if (!social) return null;

  const handle = social.handle?.trim();
  if (handle) return handle.replace(/^@/, "");

  const url = social.url?.trim();
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const last = parts[0] ?? parts.at(-1) ?? "";
    return last.replace(/^@/, "") || null;
  } catch {
    return url.replace(/^@/, "") || null;
  }
}

function getRatingValue(value: number | null | undefined) {
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill={filled ? "currentColor" : "none"}
      aria-hidden="true"
    >
      <path
        d="M20.8 5.7c-1.9-2.2-5.1-2-6.9.1L12 8l-1.9-2.2c-1.8-2.1-5-2.3-6.9-.1-2.1 2.4-1.7 6 .7 8.1l6.8 6a2 2 0 0 0 2.6 0l6.8-6c2.4-2.1 2.8-5.7.7-8.1Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InfluencerImage({
  influencer,
  index,
}: {
  influencer: SavedInfluencerCard;
  index: number;
}) {
  const gradients = [
    "from-rose-200 via-rose-100 to-white",
    "from-emerald-200 via-emerald-100 to-white",
    "from-slate-200 via-slate-100 to-white",
    "from-orange-200 via-rose-100 to-white",
  ];

  const src = influencer.cardImageUrl || influencer.avatarUrl;

  if (src) {
    return (
      <img
        src={src}
        alt={influencer.displayName}
        className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-105"
        loading={index < 4 ? "eager" : "lazy"}
        decoding="async"
      />
    );
  }

  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${
        gradients[index % gradients.length]
      }`}
    >
      <div className="text-center">
        <span className="block text-6xl font-black text-slate-950/70">
          {getInfluencerInitial(influencer.displayName)}
        </span>
      </div>
    </div>
  );
}

function SavedInfluencerCardItem({
  influencer,
  index,
  isRemoving,
  safeLocale,
  copy,
  onRemove,
}: {
  influencer: SavedInfluencerCard;
  index: number;
  isRemoving: boolean;
  safeLocale: "ja" | "en";
  copy: {
    menu: string;
    menus: string;
    noLocation: string;
    remove: string;
  };
  onRemove: (influencerId: string) => void;
}) {
  const followerLabel = formatFollowerLabel(influencer.followerRange);
  const accountName = influencer.primaryAccountName;
  const rating = getRatingValue(influencer.rating);
  const shouldShowRating = rating !== null && influencer.reviewCount > 0;

  return (
    <article className="group">
      <div className="relative overflow-hidden rounded-[22px] bg-slate-100 shadow-sm transition duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-[rgba(0,0,0,0.16)_0_18px_40px_-22px]">
        <Link href={`/b/creators/${influencer.id}`} className="block">
          <div className="relative aspect-[1.08/1] overflow-hidden">
            <InfluencerImage influencer={influencer} index={index} />

            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
          </div>
        </Link>

        <div className="absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-2">
          {influencer.socialLinks.slice(0, 5).map((social, socialIndex) => {
            const key = `${social.platform}-${social.url ?? "no-url"}-${socialIndex}`;

            if (social.url) {
              return (
                <a
                  key={key}
                  href={social.url}
                  target="_blank"
                  rel="noreferrer"
                  title={getPlatformLabel(social.platform)}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-xs font-black text-slate-900 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
                >
                  {getPlatformIcon(social.platform)}
                </a>
              );
            }

            return (
              <span
                key={key}
                title={getPlatformLabel(social.platform)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-xs font-black text-slate-900 shadow-sm backdrop-blur"
              >
                {getPlatformIcon(social.platform)}
              </span>
            );
          })}

          {followerLabel ? (
            <span className="inline-flex items-center rounded-full bg-white/95 px-3 py-1.5 text-xs font-black text-slate-900 shadow-sm">
              {followerLabel}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove(influencer.id);
          }}
          disabled={isRemoving}
          className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-pink-500 text-white transition duration-150 hover:scale-105 disabled:opacity-60"
          aria-label={copy.remove}
        >
          <HeartIcon filled />
        </button>
      </div>

      <Link href={`/b/creators/${influencer.id}`} className="mt-3 block">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-black leading-tight text-slate-950">
              {influencer.displayName}
            </p>

            {accountName ? (
              <p className="mt-1 truncate text-sm font-bold text-slate-500">
                @{accountName}
              </p>
            ) : null}

            <div className="mt-1 flex min-w-0 items-center gap-2">
              <p className="truncate text-sm text-slate-400">
                {influencer.primaryAudienceCountry
                  ? getCountryLabel(influencer.primaryAudienceCountry, safeLocale)
                  : copy.noLocation}
              </p>

              {shouldShowRating ? (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-slate-800">
                    <span className="text-yellow-500">★</span>
                    {rating.toFixed(1)}
                  </span>
                </>
              ) : null}
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-base font-black text-slate-950">
              {formatStartingPrice(
                influencer.startingPrice,
                influencer.startingCurrency
              )}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-400">
              {influencer.menuCount}{" "}
              {influencer.menuCount === 1 ? copy.menu : copy.menus}
            </p>
          </div>
        </div>
      </Link>
    </article>
  );
}

export default function SavedCreatorsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale } = useAppLocale();
  const safeLocale = locale === "en" ? "en" : "ja";

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            loading: "読み込み中...",
            title: "保存済みインフルエンサー",
            subtitle:
              "気になるインフルエンサーを保存して、あとから比較・注文できます。",
            searchInfluencers: "インフルエンサーを探す",
            emptyTitle: "保存済みインフルエンサーはまだありません",
            emptyBody:
              "気になるインフルエンサーのハートを押すと、ここに保存されます。",
            influencerFallback: "Influencer",
            fetchError: "保存済みインフルエンサーの取得に失敗しました。",
            removeFailed: "保存解除に失敗しました。",
            menu: "menu",
            menus: "menus",
            noLocation: "Location not set",
            remove: "保存を解除",
            total: "保存数",
          }
        : {
            loading: "Loading...",
            title: "Saved Influencers",
            subtitle:
              "Save influencers you want to compare or order from later.",
            searchInfluencers: "Find influencers",
            emptyTitle: "No saved influencers yet",
            emptyBody:
              "Tap the heart on an influencer card to save it here.",
            influencerFallback: "Influencer",
            fetchError: "Failed to load saved influencers.",
            removeFailed: "Failed to remove saved influencer.",
            menu: "menu",
            menus: "menus",
            noLocation: "Location not set",
            remove: "Remove from saved",
            total: "Saved",
          },
    [safeLocale]
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [influencers, setInfluencers] = useState<SavedInfluencerCard[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadSavedInfluencers = async () => {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/login");
      return;
    }

    const { data: roleRow, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "company")
      .maybeSingle();

    if (roleError || !roleRow) {
      router.replace("/login");
      return;
    }

    const { data: savedRowsData, error: savedError } = await supabase
      .from("saved_creators")
      .select("creator_id, created_at")
      .eq("b_user_id", user.id)
      .order("created_at", { ascending: false });

    if (savedError) {
      console.error("saved influencers load error", savedError);
      setError(copy.fetchError);
      setInfluencers([]);
      setLoading(false);
      return;
    }

    const savedRows = (savedRowsData ?? []) as SavedCreatorRow[];
    const influencerIds = savedRows.map((row) => row.creator_id);

    if (influencerIds.length === 0) {
      setInfluencers([]);
      setLoading(false);
      return;
    }

    const { data: influencerRowsData, error: influencerError } = await supabase
      .from("creators")
      .select(
        `
        id,
        display_name,
        avatar_url,
        category,
        approval_status,
        is_public,
        stripe_onboarding_completed,
        rating,
        total_orders,
        creator_social_accounts (
          platform,
          url,
          handle,
          follower_range,
          audience_country
        )
        `
      )
      .in("id", influencerIds)
      .eq("approval_status", "approved")
      .eq("is_public", true)
      .eq("stripe_onboarding_completed", true);

    if (influencerError) {
      console.error("saved influencer rows load error", influencerError);
      setError(copy.fetchError);
      setInfluencers([]);
      setLoading(false);
      return;
    }

    const rows = (influencerRowsData ?? []) as CreatorRow[];
    const visibleInfluencerIds = rows.map((row) => row.id);

    let menuRows: MenuRow[] = [];
    let portfolioRows: PortfolioAssetRow[] = [];

    if (visibleInfluencerIds.length > 0) {
      const [menusResult, portfolioResult] = await Promise.all([
        supabase
          .from("creator_menus")
          .select("id, creator_id, title, price, currency, is_active")
          .in("creator_id", visibleInfluencerIds)
          .eq("is_active", true),

        supabase
          .from("creator_portfolio_assets")
          .select(
            "id, creator_id, asset_url, asset_type, sort_order, is_public, created_at"
          )
          .in("creator_id", visibleInfluencerIds)
          .eq("is_public", true)
          .eq("asset_type", "image")
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
      ]);

      if (menusResult.error) {
        console.error("saved influencer menus load error", menusResult.error);
      } else {
        menuRows = (menusResult.data ?? []) as MenuRow[];
      }

      if (portfolioResult.error) {
        console.error("saved influencer portfolio load error", portfolioResult.error);
      } else {
        portfolioRows = (portfolioResult.data ?? []) as PortfolioAssetRow[];
      }
    }

    const menuMap = new Map<string, MenuRow[]>();

    for (const menu of menuRows) {
      if (!menu.creator_id) continue;

      const list = menuMap.get(menu.creator_id) ?? [];
      list.push(menu);
      menuMap.set(menu.creator_id, list);
    }

    const portfolioMap = new Map<string, PortfolioAssetRow[]>();

    for (const asset of portfolioRows) {
      if (!asset.creator_id) continue;

      const list = portfolioMap.get(asset.creator_id) ?? [];
      list.push(asset);
      portfolioMap.set(asset.creator_id, list);
    }

    const orderIndexMap = new Map(
      savedRows.map((row, index) => [row.creator_id, index])
    );

    const nextInfluencers: SavedInfluencerCard[] = rows
      .map((row) => {
        const socials = Array.isArray(row.creator_social_accounts)
          ? row.creator_social_accounts
          : [];

        const primary = socials[0] ?? null;

        const socialLinks = socials
          .map((social) => ({
            platform: social.platform?.trim() || "",
            url: social.url?.trim() || null,
          }))
          .filter((social) => social.platform);

        const influencerMenus = menuMap.get(row.id) ?? [];

        const pricedMenus = influencerMenus
          .filter((menu) => typeof menu.price === "number")
          .sort((a, b) => Number(a.price) - Number(b.price));

        const startingMenu = pricedMenus[0] ?? influencerMenus[0] ?? null;

        const portfolio = portfolioMap.get(row.id) ?? [];
        const firstPortfolioImage = portfolio[0]?.asset_url?.trim() || null;

        return {
          id: row.id,
          displayName: row.display_name?.trim() || copy.influencerFallback,
          primaryAccountName: getSocialAccountName(primary),
          avatarUrl: row.avatar_url?.trim() || null,
          cardImageUrl: firstPortfolioImage,
          category: row.category?.trim() || null,
          socialLinks,
          primaryAudienceCountry: primary?.audience_country?.trim() || null,
          followerRange: primary?.follower_range?.trim() || null,
          menuCount: influencerMenus.length,
          startingPrice:
            typeof startingMenu?.price === "number"
              ? Number(startingMenu.price)
              : null,
          startingCurrency: startingMenu?.currency ?? "JPY",
          topMenuTitle: startingMenu?.title ?? null,
          rating: typeof row.rating === "number" ? row.rating : null,
          reviewCount:
            typeof row.total_orders === "number" ? Number(row.total_orders) : 0,
        };
      })
      .sort((a, b) => {
        const aIndex = orderIndexMap.get(a.id) ?? 999999;
        const bIndex = orderIndexMap.get(b.id) ?? 999999;
        return aIndex - bIndex;
      });

    setInfluencers(nextInfluencers);
    setLoading(false);
  };

  useEffect(() => {
    void loadSavedInfluencers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeSavedInfluencer = async (influencerId: string) => {
    if (removingId) return;

    setRemovingId(influencerId);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { error: deleteError } = await supabase
      .from("saved_creators")
      .delete()
      .eq("b_user_id", user.id)
      .eq("creator_id", influencerId);

    if (deleteError) {
      console.error("saved influencer remove error", deleteError);
      window.alert(copy.removeFailed);
      setRemovingId(null);
      return;
    }

    setInfluencers((prev) =>
      prev.filter((influencer) => influencer.id !== influencerId)
    );
    setRemovingId(null);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-[#f8f9fb] px-4 py-6 md:px-6">
        <div className="mx-auto max-w-6xl space-y-5">
          <div className="h-36 animate-pulse rounded-[28px] bg-white shadow-sm" />
          <div className="grid gap-x-7 gap-y-10 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-3">
                <div className="aspect-[1.08/1] animate-pulse rounded-[22px] bg-white shadow-sm" />
                <div className="h-4 w-4/5 animate-pulse rounded bg-white" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-white" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-[#f8f9fb]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[260px] bg-gradient-to-b from-white via-rose-50/35 to-transparent" />
      <div className="pointer-events-none absolute right-[-260px] top-[100px] h-[520px] w-[520px] rounded-full bg-emerald-100/20 blur-[150px]" />

      <div className="relative mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
        <section className="rounded-[28px] bg-white px-6 py-6 shadow-[0_22px_70px_rgba(15,23,42,0.055)] md:px-7 md:py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black text-slate-400">
                {copy.total} {influencers.length}
              </p>
              <h1 className="mt-3 text-[28px] font-black tracking-[-0.055em] text-slate-950 md:text-[38px]">
                {copy.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-7 text-slate-500">
                {copy.subtitle}
              </p>
            </div>

            <Link
              href="/b/creators"
              className="inline-flex w-fit items-center justify-center rounded-full bg-[#ff5f67] px-6 py-3.5 text-sm font-black text-white shadow-[0_16px_32px_rgba(255,95,103,0.22)] transition hover:-translate-y-0.5 hover:bg-[#ff4b55]"
            >
              {copy.searchInfluencers}
            </Link>
          </div>
        </section>

        {error ? (
          <div className="mt-4 rounded-[24px] bg-rose-50 p-4 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
            {error}
          </div>
        ) : null}

        {influencers.length === 0 && !error ? (
          <div className="mt-5 rounded-[28px] bg-white p-8 text-center shadow-[0_22px_70px_rgba(15,23,42,0.055)] md:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-50 text-[#ff5f67]">
              <HeartIcon filled />
            </div>

            <h2 className="mt-5 text-xl font-black tracking-[-0.03em] text-slate-950">
              {copy.emptyTitle}
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-7 text-slate-500">
              {copy.emptyBody}
            </p>

            <Link
              href="/b/creators"
              className="mt-6 inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5"
            >
              {copy.searchInfluencers}
            </Link>
          </div>
        ) : (
          <section className="mt-6 grid gap-x-7 gap-y-10 sm:grid-cols-2 xl:grid-cols-4">
            {influencers.map((influencer, index) => (
              <SavedInfluencerCardItem
                key={influencer.id}
                influencer={influencer}
                index={index}
                safeLocale={safeLocale}
                isRemoving={removingId === influencer.id}
                onRemove={removeSavedInfluencer}
                copy={{
                  menu: copy.menu,
                  menus: copy.menus,
                  noLocation: copy.noLocation,
                  remove: copy.remove,
                }}
              />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}