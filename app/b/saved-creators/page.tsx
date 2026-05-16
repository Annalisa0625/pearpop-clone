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

type SavedCreatorCard = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  cardImageUrl: string | null;
  category: string | null;
  platforms: string[];
  primaryPlatform: string | null;
  primaryAudienceCountry: string | null;
  followerRange: string | null;
  menuCount: number;
  startingPrice: number | null;
  startingCurrency: string | null;
  topMenuTitle: string | null;
  savedAt: string | null;
};

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
    normalized.startsWith("jp ") ||
    compact === "jp日本" ||
    compact === "japan日本" ||
    compact.includes("日本")
  ) {
    return "japan";
  }

  if (
    normalized === "韓国" ||
    normalized === "korea" ||
    normalized === "south korea" ||
    normalized === "republic of korea" ||
    normalized === "kr" ||
    normalized.startsWith("kr ") ||
    compact === "kr韓国" ||
    compact.includes("韓国")
  ) {
    return "korea";
  }

  if (
    normalized === "台湾" ||
    normalized === "taiwan" ||
    normalized === "tw" ||
    normalized.startsWith("tw ") ||
    compact === "tw台湾" ||
    compact.includes("台湾")
  ) {
    return "taiwan";
  }

  if (
    normalized === "香港" ||
    normalized === "hong kong" ||
    normalized === "hk" ||
    normalized.startsWith("hk ") ||
    compact === "hk香港" ||
    compact.includes("香港")
  ) {
    return "hong_kong";
  }

  if (
    normalized === "中国" ||
    normalized === "china" ||
    normalized === "cn" ||
    normalized.startsWith("cn ") ||
    compact === "cn中国" ||
    compact.includes("中国")
  ) {
    return "china";
  }

  if (
    normalized === "タイ" ||
    normalized === "thailand" ||
    normalized === "th" ||
    normalized.startsWith("th ") ||
    compact.includes("タイ")
  ) {
    return "thailand";
  }

  if (
    normalized === "ベトナム" ||
    normalized === "vietnam" ||
    normalized === "vn" ||
    normalized.startsWith("vn ") ||
    compact.includes("ベトナム")
  ) {
    return "vietnam";
  }

  if (
    normalized === "インドネシア" ||
    normalized === "indonesia" ||
    normalized === "id" ||
    normalized.startsWith("id ") ||
    compact.includes("インドネシア")
  ) {
    return "indonesia";
  }

  if (
    normalized === "フィリピン" ||
    normalized === "philippines" ||
    normalized === "ph" ||
    normalized.startsWith("ph ") ||
    compact.includes("フィリピン")
  ) {
    return "philippines";
  }

  if (
    normalized === "マレーシア" ||
    normalized === "malaysia" ||
    normalized === "my" ||
    normalized.startsWith("my ") ||
    compact.includes("マレーシア")
  ) {
    return "malaysia";
  }

  if (
    normalized === "シンガポール" ||
    normalized === "singapore" ||
    normalized === "sg" ||
    normalized.startsWith("sg ") ||
    compact.includes("シンガポール")
  ) {
    return "singapore";
  }

  if (
    normalized === "インド" ||
    normalized === "india" ||
    normalized === "in" ||
    normalized.startsWith("in ") ||
    compact.includes("インド")
  ) {
    return "india";
  }

  if (
    normalized === "アメリカ" ||
    normalized === "united states" ||
    normalized === "usa" ||
    normalized === "us" ||
    normalized.startsWith("us ") ||
    compact.includes("アメリカ")
  ) {
    return "united_states";
  }

  if (
    normalized === "カナダ" ||
    normalized === "canada" ||
    normalized === "ca" ||
    normalized.startsWith("ca ") ||
    compact.includes("カナダ")
  ) {
    return "canada";
  }

  if (
    normalized === "イギリス" ||
    normalized === "united kingdom" ||
    normalized === "uk" ||
    normalized === "gb" ||
    normalized.startsWith("uk ") ||
    compact.includes("イギリス")
  ) {
    return "united_kingdom";
  }

  if (
    normalized === "フランス" ||
    normalized === "france" ||
    normalized === "fr" ||
    normalized.startsWith("fr ") ||
    compact.includes("フランス")
  ) {
    return "france";
  }

  if (
    normalized === "ドイツ" ||
    normalized === "germany" ||
    normalized === "de" ||
    normalized.startsWith("de ") ||
    compact.includes("ドイツ")
  ) {
    return "germany";
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
    india: "インド",
    united_states: "アメリカ",
    canada: "カナダ",
    united_kingdom: "イギリス",
    france: "フランス",
    germany: "ドイツ",
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
    india: "India",
    united_states: "United States",
    canada: "Canada",
    united_kingdom: "United Kingdom",
    france: "France",
    germany: "Germany",
    other: "Other",
  };

  return locale === "ja"
    ? jaMap[cleaned] ?? ((country ?? "").trim() || "不明")
    : enMap[cleaned] ?? ((country ?? "").trim() || "Unknown");
}

function normalizePlatform(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function getPlatformLabel(value: string | null | undefined) {
  const normalized = normalizePlatform(value);

  if (!normalized) return "SNS";
  if (normalized.includes("instagram")) return "Instagram";
  if (normalized.includes("tiktok")) return "TikTok";
  if (normalized.includes("youtube")) return "YouTube";
  if (normalized === "x" || normalized.includes("twitter")) return "X";
  if (normalized.includes("ugc")) return "UGC";

  return value?.trim() || "SNS";
}

function getPlatformIcon(value: string | null | undefined) {
  const normalized = normalizePlatform(value);

  if (normalized.includes("instagram")) return "◎";
  if (normalized.includes("tiktok")) return "♪";
  if (normalized.includes("youtube")) return "▶";
  if (normalized === "x" || normalized.includes("twitter")) return "𝕏";
  if (normalized.includes("ugc")) return "▣";

  return "●";
}

function getCreatorInitial(name: string) {
  return (name || "C").trim().slice(0, 1).toUpperCase();
}

function formatPrice(
  value: number | null,
  currency: string | null | undefined,
  locale: "ja" | "en"
) {
  if (value == null) return "-";

  const safeCurrency = currency || "JPY";

  try {
    return new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", {
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
  currency: string | null | undefined,
  locale: "ja" | "en"
) {
  if (value == null) return "-";
  return `${formatPrice(value, currency, locale)}〜`;
}

function formatDate(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US");
}

function formatFollowerLabel(
  platform: string | null | undefined,
  followerRange: string | null | undefined
) {
  const range = followerRange?.trim();
  if (!range) return null;

  return `${getPlatformLabel(platform)}・${range}`;
}

function CreatorImage({
  creator,
  index,
}: {
  creator: SavedCreatorCard;
  index: number;
}) {
  const gradients = [
    "from-orange-400 via-orange-500 to-orange-700",
    "from-orange-300 via-amber-400 to-orange-700",
    "from-slate-800 via-slate-600 to-slate-300",
    "from-blue-200 via-indigo-100 to-purple-200",
  ];

  const src = creator.cardImageUrl || creator.avatarUrl;

  if (src) {
    return (
      <img
        src={src}
        alt={creator.displayName}
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
      <span className="text-6xl font-black text-white drop-shadow-sm">
        {getCreatorInitial(creator.displayName)}
      </span>
    </div>
  );
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

function SavedCreatorCardItem({
  creator,
  index,
  safeLocale,
  copy,
  removingId,
  onRemove,
}: {
  creator: SavedCreatorCard;
  index: number;
  safeLocale: "ja" | "en";
  copy: {
    trusted: string;
    menu: string;
    menus: string;
    noLocation: string;
    savedAt: string;
    remove: string;
    removing: string;
  };
  removingId: string | null;
  onRemove: (creatorId: string) => void;
}) {
  const followerLabel = formatFollowerLabel(
    creator.primaryPlatform,
    creator.followerRange
  );

  const isRemoving = removingId === creator.id;

  return (
    <article className="group">
      <div className="relative overflow-hidden rounded-[18px] bg-slate-100 shadow-sm transition duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-[rgba(0,0,0,0.16)_0_18px_40px_-22px]">
        <Link href={`/b/creators/${creator.id}`} className="block">
          <div className="relative aspect-[1.08/1] overflow-hidden">
            <CreatorImage creator={creator} index={index} />

            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />

            <div className="absolute left-3 top-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-md bg-black/70 px-2 py-1 text-xs font-black text-white backdrop-blur">
                {copy.trusted}
              </span>
            </div>

            <div className="absolute left-3 bottom-3 flex flex-wrap items-center gap-2">
              {creator.primaryPlatform ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-black text-slate-900 shadow-sm">
                  <span>{getPlatformIcon(creator.primaryPlatform)}</span>
                  <span>{getPlatformLabel(creator.primaryPlatform)}</span>
                </span>
              ) : null}

              {followerLabel ? (
                <span className="inline-flex items-center rounded-md bg-white/95 px-2 py-1 text-xs font-black text-slate-900 shadow-sm">
                  {followerLabel}
                </span>
              ) : null}
            </div>
          </div>
        </Link>

        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemove(creator.id);
          }}
          disabled={isRemoving}
          className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-pink-500 text-white transition duration-150 hover:scale-105 disabled:opacity-60"
          aria-label={copy.remove}
        >
          <HeartIcon filled />
        </button>
      </div>

      <Link href={`/b/creators/${creator.id}`} className="mt-3 block">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium leading-tight text-slate-900">
              {creator.category || creator.topMenuTitle || creator.displayName}
            </p>

            <div className="mt-1 flex min-w-0 items-center gap-1.5">
              <span className="truncate text-sm font-black text-slate-950">
                {creator.displayName}
              </span>
              <span className="text-sm text-yellow-500">★</span>
              <span className="text-sm font-semibold text-slate-800">5.0</span>
            </div>

            <p className="mt-1 truncate text-sm text-slate-400">
              {creator.primaryAudienceCountry
                ? getCountryLabel(creator.primaryAudienceCountry, safeLocale)
                : copy.noLocation}
            </p>

            <p className="mt-1 text-xs font-semibold text-slate-400">
              {copy.savedAt}: {formatDate(creator.savedAt, safeLocale)}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-base font-black text-slate-950">
              {formatStartingPrice(
                creator.startingPrice,
                creator.startingCurrency,
                safeLocale
              )}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-400">
              {creator.menuCount}{" "}
              {creator.menuCount === 1 ? copy.menu : copy.menus}
            </p>
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={() => onRemove(creator.id)}
        disabled={isRemoving}
        className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isRemoving ? copy.removing : copy.remove}
      </button>
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
            title: "保存済みクリエイター",
            subtitle:
              "あとで見返したいクリエイター、比較したいクリエイターをここで確認できます。",
            eyebrow: "Saved Creators",
            searchCreators: "クリエイターを探す",
            emptyTitle: "保存済みクリエイターはまだありません",
            emptyBody:
              "気になるクリエイターのハートを押すと、ここに保存されます。",
            creatorFallback: "Creator",
            fetchError: "保存済みクリエイターの取得に失敗しました。",
            removeFailed: "保存解除に失敗しました。",
            trusted: "Saved",
            menu: "menu",
            menus: "menus",
            noLocation: "Location not set",
            savedAt: "保存日",
            remove: "保存を解除",
            removing: "解除中...",
            total: "保存数",
          }
        : {
            loading: "Loading...",
            title: "Saved Creators",
            subtitle:
              "Review creators you saved for later comparison or ordering.",
            eyebrow: "Saved Creators",
            searchCreators: "Find creators",
            emptyTitle: "No saved creators yet",
            emptyBody:
              "Tap the heart on a creator card to save creators here.",
            creatorFallback: "Creator",
            fetchError: "Failed to load saved creators.",
            removeFailed: "Failed to remove saved creator.",
            trusted: "Saved",
            menu: "menu",
            menus: "menus",
            noLocation: "Location not set",
            savedAt: "Saved",
            remove: "Remove from saved",
            removing: "Removing...",
            total: "Saved",
          },
    [safeLocale]
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creators, setCreators] = useState<SavedCreatorCard[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadSavedCreators = async () => {
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
      console.error("saved creators load error", savedError);
      setError(copy.fetchError);
      setCreators([]);
      setLoading(false);
      return;
    }

    const savedRows = (savedRowsData ?? []) as SavedCreatorRow[];
    const creatorIds = savedRows.map((row) => row.creator_id);

    if (creatorIds.length === 0) {
      setCreators([]);
      setLoading(false);
      return;
    }

    const { data: creatorRowsData, error: creatorError } = await supabase
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
        creator_social_accounts (
          platform,
          url,
          follower_range,
          audience_country
        )
        `
      )
      .in("id", creatorIds)
      .eq("approval_status", "approved")
      .eq("is_public", true)
      .eq("stripe_onboarding_completed", true);

    if (creatorError) {
      console.error("saved creator rows load error", creatorError);
      setError(copy.fetchError);
      setCreators([]);
      setLoading(false);
      return;
    }

    const rows = (creatorRowsData ?? []) as CreatorRow[];
    const visibleCreatorIds = rows.map((row) => row.id);

    let menuRows: MenuRow[] = [];
    let portfolioRows: PortfolioAssetRow[] = [];

    if (visibleCreatorIds.length > 0) {
      const [menusResult, portfolioResult] = await Promise.all([
        supabase
          .from("creator_menus")
          .select("id, creator_id, title, price, currency, is_active")
          .in("creator_id", visibleCreatorIds)
          .eq("is_active", true),

        supabase
          .from("creator_portfolio_assets")
          .select(
            "id, creator_id, asset_url, asset_type, sort_order, is_public, created_at"
          )
          .in("creator_id", visibleCreatorIds)
          .eq("is_public", true)
          .eq("asset_type", "image")
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
      ]);

      if (menusResult.error) {
        console.error("saved creator menus load error", menusResult.error);
      } else {
        menuRows = (menusResult.data ?? []) as MenuRow[];
      }

      if (portfolioResult.error) {
        console.error("saved creator portfolio load error", portfolioResult.error);
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

    const savedAtMap = new Map(
      savedRows.map((row) => [row.creator_id, row.created_at])
    );

    const orderIndexMap = new Map(
      savedRows.map((row, index) => [row.creator_id, index])
    );

    const nextCreators: SavedCreatorCard[] = rows
      .map((row) => {
        const socials = Array.isArray(row.creator_social_accounts)
          ? row.creator_social_accounts
          : [];

        const primary = socials[0] ?? null;

        const platforms = Array.from(
          new Set(
            socials
              .map((social) => social.platform?.trim())
              .filter((value): value is string => !!value)
          )
        );

        const creatorMenus = menuMap.get(row.id) ?? [];

        const pricedMenus = creatorMenus
          .filter((menu) => typeof menu.price === "number")
          .sort((a, b) => Number(a.price) - Number(b.price));

        const startingMenu = pricedMenus[0] ?? creatorMenus[0] ?? null;

        const portfolio = portfolioMap.get(row.id) ?? [];
        const firstPortfolioImage = portfolio[0]?.asset_url?.trim() || null;

        return {
          id: row.id,
          displayName: row.display_name?.trim() || copy.creatorFallback,
          avatarUrl: row.avatar_url?.trim() || null,
          cardImageUrl: firstPortfolioImage,
          category: row.category?.trim() || null,
          platforms,
          primaryPlatform: platforms[0] || primary?.platform?.trim() || null,
          primaryAudienceCountry: primary?.audience_country?.trim() || null,
          followerRange: primary?.follower_range?.trim() || null,
          menuCount: creatorMenus.length,
          startingPrice:
            typeof startingMenu?.price === "number"
              ? Number(startingMenu.price)
              : null,
          startingCurrency: startingMenu?.currency ?? "JPY",
          topMenuTitle: startingMenu?.title ?? null,
          savedAt: savedAtMap.get(row.id) ?? null,
        };
      })
      .sort((a, b) => {
        const aIndex = orderIndexMap.get(a.id) ?? 999999;
        const bIndex = orderIndexMap.get(b.id) ?? 999999;
        return aIndex - bIndex;
      });

    setCreators(nextCreators);
    setLoading(false);
  };

  useEffect(() => {
    void loadSavedCreators();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeSavedCreator = async (creatorId: string) => {
    if (removingId) return;

    setRemovingId(creatorId);

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
      .eq("creator_id", creatorId);

    if (deleteError) {
      console.error("saved creator remove error", deleteError);
      window.alert(copy.removeFailed);
      setRemovingId(null);
      return;
    }

    setCreators((prev) => prev.filter((creator) => creator.id !== creatorId));
    setRemovingId(null);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
        <div className="h-40 animate-pulse rounded-[32px] bg-slate-100" />
        <div className="grid gap-x-7 gap-y-10 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="space-y-3">
              <div className="aspect-[1.08/1] animate-pulse rounded-[18px] bg-slate-100" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 pb-10 md:p-6">
      <section className="rounded-[32px] bg-slate-950 p-6 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-white/50">
          {copy.eyebrow}
        </p>

        <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              {copy.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">
              {copy.subtitle}
            </p>
          </div>

          <Link
            href="/b/creators"
            className="w-fit rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white transition active:scale-[0.98]"
          >
            {copy.searchCreators}
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[26px] border border-slate-950 bg-slate-950 p-5 text-white shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/60">
            {copy.total}
          </p>
          <p className="mt-3 text-3xl font-black">{creators.length}</p>
        </div>
      </section>

      {error ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      {creators.length === 0 && !error ? (
        <div className="rounded-[32px] border border-slate-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-2xl">
            ♥
          </div>
          <h2 className="mt-5 text-xl font-black text-slate-950">
            {copy.emptyTitle}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-500">
            {copy.emptyBody}
          </p>
          <Link
            href="/b/creators"
            className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition active:scale-[0.98]"
          >
            {copy.searchCreators}
          </Link>
        </div>
      ) : (
        <section className="grid gap-x-7 gap-y-10 sm:grid-cols-2 xl:grid-cols-4">
          {creators.map((creator, index) => (
            <SavedCreatorCardItem
              key={creator.id}
              creator={creator}
              index={index}
              safeLocale={safeLocale}
              removingId={removingId}
              onRemove={removeSavedCreator}
              copy={{
                trusted: copy.trusted,
                menu: copy.menu,
                menus: copy.menus,
                noLocation: copy.noLocation,
                savedAt: copy.savedAt,
                remove: copy.remove,
                removing: copy.removing,
              }}
            />
          ))}
        </section>
      )}
    </div>
  );
}