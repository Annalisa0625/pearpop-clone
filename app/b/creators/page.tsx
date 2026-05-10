// app/b/creators/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type CompanyPlanCode = "free" | "standard" | "global_pro";

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

function normalizePlanCode(
  value: string | null | undefined
): CompanyPlanCode | null {
  if (value === "free" || value === "standard" || value === "global_pro") {
    return value;
  }
  return null;
}

function getPlanLabel(plan: CompanyPlanCode) {
  if (plan === "standard") return "Pro";
  if (plan === "global_pro") return "Premium";
  return "Basic";
}

function getPlanDescription(plan: CompanyPlanCode) {
  if (plan === "global_pro") {
    return "注文無制限 / marketplace fee 5%";
  }

  if (plan === "standard") {
    return "注文無制限 / marketplace fee 10%";
  }

  return "月5件まで注文可能 / marketplace fee 10%";
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

function getCountryLabelJa(country: string | null | undefined) {
  const cleaned = cleanCountryInput(country);

  const map: Record<string, string> = {
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

  return map[cleaned] ?? ((country ?? "").trim() || "不明");
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

export default function CompanyCreatorsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [planCodeRaw, setPlanCodeRaw] = useState<CompanyPlanCode | null>(null);
  const [creators, setCreators] = useState<CreatorCard[]>([]);
  const [savedCreatorIds, setSavedCreatorIds] = useState<string[]>([]);
  const [savingCreatorId, setSavingCreatorId] = useState<string | null>(null);

  const [keyword, setKeyword] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const displayPlanCode = useMemo<CompanyPlanCode>(() => {
    return planCodeRaw ?? "free";
  }, [planCodeRaw]);

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

    const syncLatestSubscription = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const accessToken = session?.access_token ?? null;

        if (!accessToken) {
          return;
        }

        await fetch("/api/stripe/sync-current-subscription", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      } catch (e) {
        console.warn("creators subscription sync skipped", e);
      }
    };

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

        await syncLatestSubscription();

        const [userStateResult, creatorsResult, savedResult] =
          await Promise.all([
            supabase
              .from("user_states")
              .select("company_plan_code, company_subscription_status")
              .eq("user_id", user.id)
              .maybeSingle(),

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

        if (userStateResult.error || creatorsResult.error || savedResult.error) {
          console.error({
            userStateError: userStateResult.error,
            creatorsError: creatorsResult.error,
            savedError: savedResult.error,
          });
          if (isMounted) {
            setError("クリエイター一覧の取得に失敗しました。");
          }
          return;
        }

        const userState = (userStateResult.data as {
          company_plan_code?: string | null;
          company_subscription_status?: string | null;
        } | null);

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
              displayName: row.display_name?.trim() || "クリエイター",
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
          setPlanCodeRaw(normalizePlanCode(userState?.company_plan_code ?? null));
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
          setError("クリエイター一覧の取得に失敗しました。");
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
  }, [router]);

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
          <p className="text-base text-slate-600">読み込み中...</p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[36px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="grid gap-3 lg:grid-cols-[220px_1fr_64px]">
          <div className="rounded-[24px] bg-slate-50 p-4">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Platform
            </label>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="mt-2 w-full bg-transparent text-base font-semibold outline-none"
            >
              <option value="all">Any</option>
              {platformOptions.map((platform) => (
                <option key={platform} value={platform}>
                  {getPlatformLabel(platform)}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-[24px] bg-slate-50 p-4">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Category / Keyword
            </label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="キーワード、カテゴリ、SNS、メニュー名で検索"
              className="mt-2 w-full bg-transparent text-base font-semibold outline-none placeholder:text-slate-400"
            />
          </div>

          <button
            type="button"
            className="flex h-full min-h-[64px] items-center justify-center rounded-[24px] bg-black text-white transition hover:-translate-y-0.5 hover:shadow-xl"
            aria-label="Search"
          >
            <SearchIcon />
          </button>
        </div>

        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none"
          >
            <option value="all">Category</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setPlatformFilter("all")}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
          >
            Platform:{" "}
            {platformFilter === "all" ? "Any" : getPlatformLabel(platformFilter)}
          </button>

          <button
            type="button"
            onClick={() => setKeyword("")}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
          >
            Clear keyword
          </button>

          <button
            type="button"
            onClick={() => {
              setKeyword("");
              setPlatformFilter("all");
              setCategoryFilter("all");
            }}
            className="shrink-0 px-4 py-2 text-sm font-semibold text-slate-500 underline underline-offset-4"
          >
            Clear All
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
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-[28px] font-black tracking-tight text-slate-950">
                Creators
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {filteredCreators.length.toLocaleString()} 件のクリエイター
              </p>
            </div>

            <div className="hidden text-right text-sm text-slate-500 md:block">
              {getPlanLabel(displayPlanCode)}では月5件まで注文できます。
            </div>
          </div>

          {filteredCreators.length === 0 ? (
            <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-10 text-center text-slate-600">
              <p className="text-lg font-bold text-slate-900">
                表示できるクリエイターがいません
              </p>
              <p className="mt-3 text-sm leading-7">
                検索条件を変更するか、報酬受け取り設定が完了したクリエイターの追加をお待ちください。
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredCreators.map((creator, index) => {
                const audienceLabel = getCountryLabelJa(
                  creator.primaryAudienceCountry
                );

                const displayPlatforms =
                  creator.platforms.length > 0
                    ? creator.platforms.slice(0, 2)
                    : creator.primaryPlatform
                      ? [creator.primaryPlatform]
                      : [];

                const isSaved = savedCreatorIds.includes(creator.id);
                const isSaving = savingCreatorId === creator.id;

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
                            SNS未設定
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

                      {creator.followerRange ? (
                        <div className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-900 backdrop-blur">
                          {creator.followerRange}
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
                            {creator.category || "Creator"}
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