// app/b/creators/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type CompanyPlanCode = "free" | "standard" | "global_pro";
type SubscriptionStatus = "active" | "inactive" | "canceled" | null;

type SocialAccountRow = {
  platform?: string | null;
  url?: string | null;
  follower_range?: string | null;
  audience_country?: string | null;
};

type CreatorRow = {
  id: string;
  display_name?: string | null;
  category?: string | null;
  stripe_onboarding_completed?: boolean | null;
  creator_social_accounts?: SocialAccountRow[] | null;
};

type CreatorCard = {
  id: string;
  displayName: string;
  category: string | null;
  primaryPlatform: string | null;
  primaryAudienceCountry: string | null;
  requiresGlobalPro: boolean;
};

function normalizePlanCode(
  value: string | null | undefined
): CompanyPlanCode | null {
  if (value === "free" || value === "standard" || value === "global_pro") {
    return value;
  }
  return null;
}

function normalizeSubscriptionStatus(
  value: string | null | undefined
): SubscriptionStatus {
  if (value === "active" || value === "inactive" || value === "canceled") {
    return value;
  }
  return null;
}

function getPlanLabel(plan: CompanyPlanCode) {
  if (plan === "standard") return "Pro";
  if (plan === "global_pro") return "Premium";
  return "Basic";
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
    normalized === "uae" ||
    normalized === "ae" ||
    normalized.startsWith("ae ") ||
    compact.includes("uae")
  ) {
    return "uae";
  }

  if (
    normalized === "サウジアラビア" ||
    normalized === "saudi arabia" ||
    normalized === "sa" ||
    normalized.startsWith("sa ") ||
    compact.includes("サウジアラビア")
  ) {
    return "saudi_arabia";
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
    normalized === "イタリア" ||
    normalized === "italy" ||
    normalized === "it" ||
    normalized.startsWith("it ") ||
    compact.includes("イタリア")
  ) {
    return "italy";
  }

  if (
    normalized === "スペイン" ||
    normalized === "spain" ||
    normalized === "es" ||
    normalized.startsWith("es ") ||
    compact.includes("スペイン")
  ) {
    return "spain";
  }

  if (
    normalized === "オーストラリア" ||
    normalized === "australia" ||
    normalized === "au" ||
    normalized.startsWith("au ") ||
    compact.includes("オーストラリア")
  ) {
    return "australia";
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

function isJapanAudience(value: string | null | undefined) {
  return cleanCountryInput(value) === "japan";
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
    uae: "UAE",
    saudi_arabia: "サウジアラビア",
    united_states: "アメリカ",
    canada: "カナダ",
    united_kingdom: "イギリス",
    france: "フランス",
    germany: "ドイツ",
    italy: "イタリア",
    spain: "スペイン",
    australia: "オーストラリア",
    other: "その他",
  };

  return map[cleaned] ?? ((country ?? "").trim() || "不明");
}

export default function CompanyCreatorsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [planCodeRaw, setPlanCodeRaw] = useState<CompanyPlanCode | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus>(null);
  const [creators, setCreators] = useState<CreatorCard[]>([]);

  const displayPlanCode = useMemo<CompanyPlanCode>(() => {
    return planCodeRaw ?? "free";
  }, [planCodeRaw]);

  const planDescription = useMemo(() => {
    if (displayPlanCode === "global_pro") {
      return "全クリエイター閲覧 / 無制限";
    }
    if (displayPlanCode === "standard") {
      return "国内クリエイター閲覧 / 無制限";
    }
    return "国内クリエイター閲覧 / 月5件まで";
  }, [displayPlanCode]);

  const canAccessOverseas = useMemo(() => {
    return planCodeRaw === "global_pro" && subscriptionStatus === "active";
  }, [planCodeRaw, subscriptionStatus]);

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

        const [userStateResult, creatorsResult] = await Promise.all([
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
        ]);

        if (userStateResult.error || creatorsResult.error) {
          console.error({
            userStateError: userStateResult.error,
            creatorsError: creatorsResult.error,
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

        const nextCreators: CreatorCard[] = rows
          .filter((row) => row.stripe_onboarding_completed === true)
          .map((row) => {
            const socials = Array.isArray(row.creator_social_accounts)
              ? row.creator_social_accounts
              : [];

            const primary = socials[0] ?? null;
            const requiresGlobalPro = socials.some(
              (social) => !isJapanAudience(social.audience_country)
            );

            return {
              id: row.id,
              displayName: row.display_name?.trim() || "クリエイター",
              category: row.category?.trim() || null,
              primaryPlatform: primary?.platform?.trim() || null,
              primaryAudienceCountry: primary?.audience_country?.trim() || null,
              requiresGlobalPro,
            };
          });

        if (isMounted) {
          setPlanCodeRaw(normalizePlanCode(userState?.company_plan_code ?? null));
          setSubscriptionStatus(
            normalizeSubscriptionStatus(
              userState?.company_subscription_status ?? null
            )
          );
          setCreators(nextCreators);
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
    <div className="space-y-6">
      <section className="rounded-[32px] border border-slate-200 bg-white p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-base font-semibold text-blue-600">
              Creator Search
            </p>
            <h1 className="mt-2 text-[28px] font-bold text-slate-900">
              クリエイター一覧
            </h1>
            <p className="mt-3 text-base leading-8 text-slate-600">
              報酬受け取り設定が完了しており、企業から注文を受けられるクリエイターだけを表示しています。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-purple-100 px-4 py-2 text-sm font-semibold text-purple-700">
              {getPlanLabel(displayPlanCode)}
            </span>
            <span className="rounded-full bg-yellow-100 px-4 py-2 text-sm font-semibold text-yellow-700">
              {planDescription}
            </span>
          </div>
        </div>
      </section>

      {error && (
        <section className="rounded-[32px] border border-red-200 bg-red-50 p-7">
          <h2 className="text-[22px] font-bold text-slate-900">
            エラーが発生しました
          </h2>
          <p className="mt-3 text-base leading-8 text-slate-600">{error}</p>
        </section>
      )}

      {!error && (
        <>
          <section className="rounded-[32px] border border-yellow-200 bg-yellow-50 p-6">
            <h2 className="text-[22px] font-bold text-slate-900">
              現在の依頼可能範囲
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-700">
              {displayPlanCode === "global_pro"
                ? "Premiumでは、国内外を含むより広い視聴者層を持つクリエイターにも依頼できます。"
                : displayPlanCode === "standard"
                  ? "Proでは、国内市場向けの施策に合うクリエイターへ継続的に依頼できます。より広い視聴者層を持つクリエイターへの依頼には Premium が必要です。"
                  : "Basicでは、国内市場向けの候補探索と少数の依頼から始められます。月5件まで送信でき、より広い視聴者層を持つクリエイターへの依頼には Premium が必要です。"}
            </p>
          </section>

          <section className="space-y-5">
            {creators.length === 0 ? (
              <div className="rounded-[32px] border border-slate-200 bg-white p-7 text-slate-600">
                現在、表示できるクリエイターはいません。報酬受け取り設定が完了したクリエイターのみ表示されます。
              </div>
            ) : (
              creators.map((creator, index) => {
                const showGlobalBadge =
                  creator.requiresGlobalPro && !canAccessOverseas;
                const audienceLabel = getCountryLabelJa(
                  creator.primaryAudienceCountry
                );

                return (
                  <article
                    key={creator.id}
                    className="rounded-[32px] border border-slate-200 bg-white p-6"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 gap-5">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[28px] font-bold text-slate-700">
                          {index + 1}
                        </div>

                        <div className="min-w-0">
                          <h2 className="truncate text-[22px] font-bold text-slate-900">
                            {creator.displayName}
                          </h2>

                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            {creator.category && (
                              <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                                {creator.category}
                              </span>
                            )}

                            {creator.requiresGlobalPro && (
                              <span className="rounded-full bg-purple-100 px-4 py-2 text-sm font-semibold text-purple-700">
                                より広い視聴者層
                              </span>
                            )}

                            {creator.primaryAudienceCountry && (
                              <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
                                {audienceLabel}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {showGlobalBadge && (
                        <div className="shrink-0">
                          <span className="rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-red-600">
                            Premiumが必要
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
                      <div className="rounded-[24px] bg-slate-50 p-5">
                        <p className="text-sm text-slate-400">対応媒体</p>
                        <p className="mt-3 text-[20px] font-semibold text-slate-900">
                          {creator.primaryPlatform || "未設定"}
                        </p>
                      </div>

                      <div className="rounded-[24px] bg-slate-50 p-5">
                        <p className="text-sm text-slate-400">主な視聴者</p>
                        <p className="mt-3 text-[20px] font-semibold text-slate-900">
                          {creator.primaryAudienceCountry
                            ? audienceLabel
                            : "未設定"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6">
                      <Link
                        href={`/b/creators/${creator.id}`}
                        className="text-lg font-semibold text-blue-600 hover:text-blue-700"
                      >
                        詳細を見る
                      </Link>
                    </div>
                  </article>
                );
              })
            )}
          </section>
        </>
      )}
    </div>
  );
}