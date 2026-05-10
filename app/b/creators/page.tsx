// app/b/creators/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAppLocale } from "@/lib/i18n/locale";

type FilterMenu = "platform" | "category" | null;

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

type SavedCreatorRow = {
  creator_id: string;
};

type CreatorCard = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  category: string | null;
  platforms: string[];
  primaryPlatform: string | null;
  primaryAudienceCountry: string | null;
  followerRange: string | null;
  menuCount: number;
  startingPrice: number | null;
  startingCurrency: string | null;
  topMenuTitle: string | null;
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
    compact === "thタイ" ||
    compact.includes("タイ")
  ) {
    return "thailand";
  }

  if (
    normalized === "ベトナム" ||
    normalized === "vietnam" ||
    normalized === "vn" ||
    normalized.startsWith("vn ") ||
    compact === "vnベトナム" ||
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

function formatPrice(
  value: number | null,
  currency: string | null | undefined
) {
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

function normalizePlatform(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function getPlatformLabel(value: string | null | undefined) {
  const normalized = normalizePlatform(value);

  if (!normalized) return "SNS未設定";
  if (normalized.includes("instagram")) return "Instagram";
  if (normalized.includes("tiktok")) return "TikTok";
  if (normalized.includes("youtube")) return "YouTube";
  if (normalized === "x" || normalized.includes("twitter")) return "X";
  if (normalized.includes("ugc")) return "UGC";

  return value?.trim() || "SNS未設定";
}

function getPlatformShortLabel(value: string | null | undefined) {
  const normalized = normalizePlatform(value);

  if (normalized.includes("instagram")) return "Instagram";
  if (normalized.includes("tiktok")) return "TikTok";
  if (normalized.includes("youtube")) return "YouTube";
  if (normalized === "x" || normalized.includes("twitter")) return "X";
  if (normalized.includes("ugc")) return "UGC";

  return value?.trim() || "SNS";
}

function formatFollowerLabel(
  platform: string | null | undefined,
  followerRange: string | null | undefined
) {
  const range = followerRange?.trim();
  if (!range) return null;

  return `${getPlatformShortLabel(platform)}・${range}`;
}

function getCreatorInitial(name: string) {
  return (name || "C").trim().slice(0, 1).toUpperCase();
}

function CreatorImage({
  creator,
  index,
}: {
  creator: CreatorCard;
  index: number;
}) {
  const gradients = [
    "from-pink-200 via-orange-100 to-yellow-200",
    "from-blue-200 via-indigo-100 to-purple-200",
    "from-emerald-200 via-teal-100 to-cyan-200",
    "from-slate-200 via-gray-100 to-zinc-200",
  ];

  if (creator.avatarUrl) {
    return (
      <img
        src={creator.avatarUrl}
        alt={creator.displayName}
        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
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

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10.8 18.1a7.3 7.3 0 1 1 0-14.6 7.3 7.3 0 0 1 0 14.6Z"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <path
        d="m16.4 16.4 4.1 4.1"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M5 7.5 10 12l5-4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FilterButton({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition ${
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      <span>
        {label}: {value}
      </span>
      <ChevronDownIcon />
    </button>
  );
}

export default function CompanyCreatorsPage() {
  const router = useRouter();
  const { locale } = useAppLocale();
  const safeLocale = locale === "en" ? "en" : "ja";

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            loading: "読み込み中...",
            fetchError: "クリエイター一覧の取得に失敗しました。",
            platform: "Platform",
            categoryKeyword: "Category / Keyword",
            keywordPlaceholder: "キーワード、カテゴリ、SNS、メニュー名で検索",
            any: "Any",
            category: "Category",
            clearKeyword: "Clear keyword",
            clearAll: "Clear All",
            creators: "Creators",
            countSuffix: "件のクリエイター",
            noCreatorsTitle: "表示できるクリエイターがいません",
            noCreatorsBody:
              "検索条件を変更するか、報酬受け取り設定が完了したクリエイターの追加をお待ちください。",
            creatorFallback: "Creator",
            noSns: "SNS未設定",
          }
        : {
            loading: "Loading...",
            fetchError: "Failed to load creators.",
            platform: "Platform",
            categoryKeyword: "Category / Keyword",
            keywordPlaceholder: "Search keywords, categories, SNS, or menu names",
            any: "Any",
            category: "Category",
            clearKeyword: "Clear keyword",
            clearAll: "Clear All",
            creators: "Creators",
            countSuffix: "creators",
            noCreatorsTitle: "No creators found",
            noCreatorsBody:
              "Try changing your search filters or wait for more creators to complete payout setup.",
            creatorFallback: "Creator",
            noSns: "SNS not set",
          },
    [safeLocale]
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creators, setCreators] = useState<CreatorCard[]>([]);
  const [savedCreatorIds, setSavedCreatorIds] = useState<string[]>([]);
  const [savingCreatorId, setSavingCreatorId] = useState<string | null>(null);

  const [keyword, setKeyword] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [openFilter, setOpenFilter] = useState<FilterMenu>(null);

  const platformOptions = useMemo(() => {
    const values = creators.flatMap((creator) => creator.platforms);
    return Array.from(new Set(values.filter(Boolean)));
  }, [creators]);

  const categoryOptions = useMemo(() => {
    const values = creators
      .map((creator) => creator.category)
      .filter((value): value is string => !!value);

    return Array.from(new Set(values));
  }, [creators]);

  const filteredCreators = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    return creators.filter((creator) => {
      const matchesKeyword =
        !q ||
        creator.displayName.toLowerCase().includes(q) ||
        (creator.category ?? "").toLowerCase().includes(q) ||
        creator.platforms.some((platform) =>
          platform.toLowerCase().includes(q)
        ) ||
        (creator.topMenuTitle ?? "").toLowerCase().includes(q);

      const matchesPlatform =
        platformFilter === "all" ||
        creator.platforms.some(
          (platform) =>
            normalizePlatform(platform) === normalizePlatform(platformFilter)
        );

      const matchesCategory =
        categoryFilter === "all" || creator.category === categoryFilter;

      return matchesKeyword && matchesPlatform && matchesCategory;
    });
  }, [creators, keyword, platformFilter, categoryFilter]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
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

        const [creatorsResult, savedResult] = await Promise.all([
          supabase
            .from("creators")
            .select(
              `
              id,
              display_name,
              avatar_url,
              category,
              stripe_onboarding_completed,
              creator_social_accounts (
                platform,
                url,
                follower_range,
                audience_country
              )
              `
            )
            .eq("approval_status", "approved")
            .eq("stripe_onboarding_completed", true)
            .order("created_at", { ascending: false }),

          supabase
            .from("saved_creators")
            .select("creator_id")
            .eq("b_user_id", user.id),
        ]);

        if (creatorsResult.error || savedResult.error) {
          console.error({
            creatorsError: creatorsResult.error,
            savedError: savedResult.error,
          });
          if (isMounted) {
            setError(copy.fetchError);
          }
          return;
        }

        const rows = (creatorsResult.data ?? []) as CreatorRow[];
        const creatorIds = rows.map((row) => row.id);

        let menuRows: MenuRow[] = [];

        if (creatorIds.length > 0) {
          const { data: menusData, error: menusError } = await supabase
            .from("creator_menus")
            .select("id, creator_id, title, price, currency, is_active")
            .in("creator_id", creatorIds)
            .eq("is_active", true);

          if (menusError) {
            console.error("creator menus load error", menusError);
          } else {
            menuRows = (menusData ?? []) as MenuRow[];
          }
        }

        const menuMap = new Map<string, MenuRow[]>();

        for (const menu of menuRows) {
          if (!menu.creator_id) continue;

          const list = menuMap.get(menu.creator_id) ?? [];
          list.push(menu);
          menuMap.set(menu.creator_id, list);
        }

        const nextCreators: CreatorCard[] = rows
          .filter((row) => row.stripe_onboarding_completed === true)
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

            return {
              id: row.id,
              displayName: row.display_name?.trim() || copy.creatorFallback,
              avatarUrl: row.avatar_url?.trim() || null,
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
            };
          });

        if (isMounted) {
          setCreators(nextCreators);
          setSavedCreatorIds(
            ((savedResult.data ?? []) as SavedCreatorRow[]).map(
              (row) => row.creator_id
            )
          );
        }
      } catch (e) {
        console.error(e);
        if (isMounted) {
          setError(copy.fetchError);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [router, copy.fetchError, copy.creatorFallback]);

  const toggleSaveCreator = async (creatorId: string) => {
    if (savingCreatorId) return;

    setSavingCreatorId(creatorId);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const isSaved = savedCreatorIds.includes(creatorId);

      if (isSaved) {
        const { error: deleteError } = await supabase
          .from("saved_creators")
          .delete()
          .eq("b_user_id", user.id)
          .eq("creator_id", creatorId);

        if (deleteError) throw deleteError;

        setSavedCreatorIds((prev) => prev.filter((id) => id !== creatorId));
      } else {
        const { error: insertError } = await supabase
          .from("saved_creators")
          .insert({
            b_user_id: user.id,
            creator_id: creatorId,
          });

        if (insertError) throw insertError;

        setSavedCreatorIds((prev) =>
          prev.includes(creatorId) ? prev : [...prev, creatorId]
        );
      }
    } catch (e) {
      console.error("saved creator toggle error:", e);
    } finally {
      setSavingCreatorId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="rounded-[32px] border border-slate-200 bg-white p-7">
          <p className="text-base text-slate-600">{copy.loading}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[36px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="grid gap-3 lg:grid-cols-[220px_1fr_64px]">
          <div className="relative rounded-[24px] bg-slate-50 p-4">
            <button
              type="button"
              onClick={() =>
                setOpenFilter((prev) => (prev === "platform" ? null : "platform"))
              }
              className="flex w-full items-center justify-between text-left"
            >
              <span>
                <span className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                  {copy.platform}
                </span>
                <span className="mt-2 block text-base font-semibold text-slate-950">
                  {platformFilter === "all"
                    ? copy.any
                    : getPlatformLabel(platformFilter)}
                </span>
              </span>
              <ChevronDownIcon />
            </button>

            {openFilter === "platform" ? (
              <div className="absolute left-0 top-[calc(100%+10px)] z-30 w-full overflow-hidden rounded-3xl border bg-white p-2 shadow-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setPlatformFilter("all");
                    setOpenFilter(null);
                  }}
                  className={`block w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold ${
                    platformFilter === "all"
                      ? "bg-slate-100 text-slate-950"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {copy.any}
                </button>

                {platformOptions.map((platform) => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => {
                      setPlatformFilter(platform);
                      setOpenFilter(null);
                    }}
                    className={`block w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold ${
                      normalizePlatform(platformFilter) ===
                      normalizePlatform(platform)
                        ? "bg-slate-100 text-slate-950"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {getPlatformLabel(platform)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-[24px] bg-slate-50 p-4">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {copy.categoryKeyword}
            </label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={copy.keywordPlaceholder}
              className="mt-2 w-full bg-transparent text-base font-semibold outline-none placeholder:text-slate-400"
            />
          </div>

          <button
            type="button"
            onClick={() => setOpenFilter(null)}
            className="flex h-full min-h-[64px] items-center justify-center rounded-[24px] bg-black text-white transition hover:-translate-y-0.5 hover:shadow-xl"
            aria-label="Search"
          >
            <SearchIcon />
          </button>
        </div>

        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          <div className="relative shrink-0">
            <FilterButton
              label={copy.category}
              value={categoryFilter === "all" ? copy.any : categoryFilter}
              active={categoryFilter !== "all"}
              onClick={() =>
                setOpenFilter((prev) => (prev === "category" ? null : "category"))
              }
            />

            {openFilter === "category" ? (
              <div className="absolute left-0 top-[calc(100%+10px)] z-30 w-64 overflow-hidden rounded-3xl border bg-white p-2 shadow-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter("all");
                    setOpenFilter(null);
                  }}
                  className={`block w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold ${
                    categoryFilter === "all"
                      ? "bg-slate-100 text-slate-950"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {copy.any}
                </button>

                {categoryOptions.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => {
                      setCategoryFilter(category);
                      setOpenFilter(null);
                    }}
                    className={`block w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold ${
                      categoryFilter === category
                        ? "bg-slate-100 text-slate-950"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setPlatformFilter("all")}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
          >
            Platform:{" "}
            {platformFilter === "all" ? copy.any : getPlatformLabel(platformFilter)}
          </button>

          <button
            type="button"
            onClick={() => setKeyword("")}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
          >
            {copy.clearKeyword}
          </button>

          <button
            type="button"
            onClick={() => {
              setKeyword("");
              setPlatformFilter("all");
              setCategoryFilter("all");
              setOpenFilter(null);
            }}
            className="shrink-0 px-4 py-2 text-sm font-semibold text-slate-500 underline underline-offset-4"
          >
            {copy.clearAll}
          </button>
        </div>
      </section>

      {error ? (
        <section className="rounded-[32px] border border-red-200 bg-red-50 p-7">
          <h2 className="text-[22px] font-bold text-slate-900">
            エラーが発生しました
          </h2>
          <p className="mt-3 text-base leading-8 text-slate-600">{error}</p>
        </section>
      ) : null}

      {!error ? (
        <section className="space-y-5">
          <div>
            <h2 className="text-[28px] font-black tracking-tight text-slate-950">
              {copy.creators}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {safeLocale === "ja"
                ? `${filteredCreators.length.toLocaleString()} ${copy.countSuffix}`
                : `${filteredCreators.length.toLocaleString()} ${copy.countSuffix}`}
            </p>
          </div>

          {filteredCreators.length === 0 ? (
            <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-10 text-center text-slate-600">
              <p className="text-lg font-bold text-slate-900">
                {copy.noCreatorsTitle}
              </p>
              <p className="mt-3 text-sm leading-7">{copy.noCreatorsBody}</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredCreators.map((creator, index) => {
                const audienceLabel = getCountryLabel(
                  creator.primaryAudienceCountry,
                  safeLocale
                );

                const displayPlatforms =
                  creator.platforms.length > 0
                    ? creator.platforms.slice(0, 2)
                    : creator.primaryPlatform
                      ? [creator.primaryPlatform]
                      : [];

                const isSaved = savedCreatorIds.includes(creator.id);
                const isSaving = savingCreatorId === creator.id;
                const followerLabel = formatFollowerLabel(
                  creator.primaryPlatform,
                  creator.followerRange
                );

                return (
                  <Link
                    key={creator.id}
                    href={`/b/creators/${creator.id}`}
                    className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                      <CreatorImage creator={creator} index={index} />

                      <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                        {displayPlatforms.length > 0 ? (
                          displayPlatforms.map((platform, platformIndex) => (
                            <span
                              key={`${platform}-${platformIndex}`}
                              className="rounded-full bg-black/75 px-3 py-1 text-xs font-bold text-white backdrop-blur"
                            >
                              {getPlatformLabel(platform)}
                            </span>
                          ))
                        ) : (
                          <span className="rounded-full bg-black/75 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                            {copy.noSns}
                          </span>
                        )}

                        {creator.platforms.length > 2 ? (
                          <span className="rounded-full bg-black/75 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                            +{creator.platforms.length - 2}
                          </span>
                        ) : null}

                        {creator.menuCount > 0 ? (
                          <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-900 backdrop-blur">
                            {creator.menuCount} menus
                          </span>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        className={`absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full shadow-sm backdrop-blur transition group-hover:scale-105 ${
                          isSaved
                            ? "bg-rose-500 text-white"
                            : "bg-white/90 text-slate-900"
                        } ${isSaving ? "opacity-60" : ""}`}
                        aria-label={isSaved ? "Unsave creator" : "Save creator"}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void toggleSaveCreator(creator.id);
                        }}
                      >
                        {isSaved ? "♥" : "♡"}
                      </button>

                      {followerLabel ? (
                        <div className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-900 backdrop-blur">
                          {followerLabel}
                        </div>
                      ) : null}
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-black text-slate-950">
                            {creator.displayName}
                          </h3>
                          <p className="mt-1 truncate text-sm text-slate-600">
                            {creator.category || copy.creatorFallback}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-base font-black text-slate-950">
                            {formatStartingPrice(
                              creator.startingPrice,
                              creator.startingCurrency
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                          {audienceLabel}
                        </span>

                        {creator.topMenuTitle ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                            {creator.topMenuTitle}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}