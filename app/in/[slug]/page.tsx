// File: app/in/[slug]/page.tsx

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import RequestForm from "./RequestForm";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type Creator = {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  category: string | null;
  public_slug: string | null;
};

type SocialAccount = {
  id: string;
  platform: string | null;
  follower_range: string | null;
  url: string | null;
  audience_country: string | null;
};

type PortfolioAsset = {
  id: string;
  asset_url: string;
  title: string | null;
  sort_order: number | null;
};

type CreatorMenu = {
  id: string;
  title: string;
  menu_type: string | null;
  platform: string | null;
  sns: string | null;
  category: string | null;
  deliverables: string | null;
};

type PayoutReadyCreatorRow = {
  creator_id: string;
};

const requestButtons = [
  {
    key: "pr_post",
    title: "PR投稿を相談する",
    body: "Instagram投稿・リール・TikTokなど",
  },
  {
    key: "product_review",
    title: "商品レビューを相談する",
    body: "商品提供・レビュー投稿・使用感紹介",
  },
  {
    key: "visit_event",
    title: "来店・イベント出演を相談する",
    body: "店舗PR・体験レポート・イベント参加",
  },
  {
    key: "ugc",
    title: "UGC制作を相談する",
    body: "広告素材・LP素材・SNS用動画制作",
  },
  {
    key: "other",
    title: "その他の依頼を相談する",
    body: "まずは内容だけ相談したい場合はこちら",
  },
] as const;

function getInitial(name: string) {
  return (name || "I").trim().slice(0, 1).toUpperCase();
}

function getPlatformLabel(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();

  if (normalized.includes("instagram")) return "Instagram";
  if (normalized.includes("tiktok")) return "TikTok";
  if (normalized.includes("youtube")) return "YouTube";
  if (normalized === "x" || normalized.includes("twitter")) return "X";
  if (normalized.includes("ugc")) return "UGC";

  return value?.trim() || "SNS";
}

function getMenuTypeLabel(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();

  if (!normalized) return "PR相談";
  if (normalized.includes("visit")) return "来店・体験";
  if (normalized.includes("product")) return "商品レビュー";
  if (normalized.includes("ugc")) return "UGC制作";
  if (normalized.includes("post")) return "PR投稿";
  if (normalized.includes("reel")) return "リール";
  if (normalized.includes("story")) return "ストーリーズ";
  if (normalized.includes("youtube")) return "YouTube";

  return value ?? "PR相談";
}

function normalizeSlug(value: string) {
  return decodeURIComponent(value).trim();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

async function loadCreator(slug: string) {
  const supabase = await createSupabaseServerClient();
  const normalizedSlug = normalizeSlug(slug);

  let creator: Creator | null = null;

  const { data: slugCreator, error: slugError } = await supabase
    .from("creators")
    .select("id, user_id, display_name, avatar_url, category, public_slug")
    .eq("public_slug", normalizedSlug)
    .eq("is_public", true)
    .eq("approval_status", "approved")
    .maybeSingle();

  if (slugError) {
    console.error("public creator slug load error:", slugError);
  }

  if (slugCreator) {
    creator = slugCreator as Creator;
  }

  if (!creator && isUuid(normalizedSlug)) {
    const { data: idCreator, error: idError } = await supabase
      .from("creators")
      .select("id, user_id, display_name, avatar_url, category, public_slug")
      .eq("id", normalizedSlug)
      .eq("is_public", true)
      .eq("approval_status", "approved")
      .maybeSingle();

    if (idError) {
      console.error("public creator id load error:", idError);
    }

    if (idCreator) {
      creator = idCreator as Creator;
    }
  }

  if (!creator) {
    return null;
  }

  const { data: payoutReadyRows, error: payoutReadyError } = await supabase.rpc(
    "get_payout_ready_creator_ids"
  );

  if (payoutReadyError) {
    console.error("public creator payout ready check error:", payoutReadyError);
    return null;
  }

  const isPayoutReady = ((payoutReadyRows ?? []) as PayoutReadyCreatorRow[]).some(
    (row) => row.creator_id === creator?.id
  );

  if (!isPayoutReady) {
    return null;
  }

  const [
    { data: socialData },
    { data: portfolioData },
    { data: menuData },
  ] = await Promise.all([
    supabase
      .from("creator_social_accounts")
      .select("id, platform, follower_range, url, audience_country")
      .eq("creator_id", creator.id),
    supabase
      .from("creator_portfolio_assets")
      .select("id, asset_url, title, sort_order")
      .eq("creator_id", creator.id)
      .eq("is_public", true)
      .eq("asset_type", "image")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(6),
    supabase
      .from("creator_menus")
      .select("id, title, menu_type, platform, sns, category, deliverables")
      .eq("creator_id", creator.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  return {
    creator,
    socialAccounts: (socialData ?? []) as SocialAccount[],
    portfolioAssets: (portfolioData ?? []) as PortfolioAsset[],
    menus: (menuData ?? []) as CreatorMenu[],
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadCreator(slug);

  if (!data) {
    return {
      title: "仕事依頼ページ | Trend Mart",
      description:
        "Trend MartでインフルエンサーにPR投稿・商品レビュー・UGC制作を相談できます。",
    };
  }

  const { creator } = data;

  return {
    title: `${creator.display_name}への仕事依頼 | Trend Mart`,
    description: `${creator.display_name}さんへPR投稿・商品レビュー・UGC制作などを相談できます。`,
  };
}

export default async function InfluencerWorkRequestPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await loadCreator(slug);

  if (!data) {
    notFound();
  }

  const { creator, socialAccounts, portfolioAssets, menus } = data;

  const categoryLabel = creator.category?.trim() || "インフルエンサー";
  const primaryImage = portfolioAssets[0]?.asset_url ?? creator.avatar_url;

  return (
    <main className="min-h-screen bg-[#f7f7fb] text-slate-950">
      <div className="mx-auto min-h-screen max-w-[520px] bg-white shadow-[0_0_60px_rgba(15,23,42,0.06)]">
        <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/92 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <img
              src="/brand/trend-mart-logo.png"
              alt="Trend Mart"
              className="h-7 w-auto object-contain"
            />

            <div className="rounded-full bg-rose-50 px-3 py-1.5 text-[11px] font-black text-rose-500">
              仕事依頼ページ
            </div>
          </div>
        </header>

        <section className="px-4 pb-5 pt-5">
          <div className="overflow-hidden rounded-[30px] bg-slate-950 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
            <div className="relative h-[300px] bg-slate-800">
              {primaryImage ? (
                <img
                  src={primaryImage}
                  alt={creator.display_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-950 via-slate-800 to-rose-400">
                  <div className="text-[5rem] font-black text-white">
                    {getInitial(creator.display_name)}
                  </div>
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent px-5 pb-5 pt-16">
                <div className="flex items-end gap-3">
                  {creator.avatar_url ? (
                    <img
                      src={creator.avatar_url}
                      alt={creator.display_name}
                      className="h-16 w-16 shrink-0 rounded-full border-4 border-white object-cover shadow-xl"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-white bg-rose-500 text-2xl font-black text-white shadow-xl">
                      {getInitial(creator.display_name)}
                    </div>
                  )}

                  <div className="min-w-0 pb-1">
                    <p className="text-xs font-black text-white/70">
                      {categoryLabel}
                    </p>
                    <h1 className="mt-1 truncate text-2xl font-black tracking-[-0.04em]">
                      {creator.display_name}
                    </h1>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 pb-5 pt-4">
              <p className="text-sm font-semibold leading-7 text-white/80">
                PR投稿・商品レビュー・UGC制作・来店体験などのお仕事相談を受け付けています。
              </p>

              {socialAccounts.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {socialAccounts.map((account) => {
                    const label = getPlatformLabel(account.platform);
                    const follower = account.follower_range?.trim();

                    const content = (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-xs font-black text-white ring-1 ring-white/10">
                        {label}
                        {follower ? (
                          <span className="text-white/55">{follower}</span>
                        ) : null}
                      </span>
                    );

                    if (account.url?.trim()) {
                      return (
                        <a
                          key={account.id}
                          href={account.url.trim()}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {content}
                        </a>
                      );
                    }

                    return <span key={account.id}>{content}</span>;
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {portfolioAssets.length > 1 ? (
          <section className="px-4 py-2">
            <div className="grid grid-cols-3 gap-2">
              {portfolioAssets.slice(0, 6).map((asset) => (
                <div
                  key={asset.id}
                  className="aspect-square overflow-hidden rounded-[22px] bg-slate-100"
                >
                  <img
                    src={asset.asset_url}
                    alt={asset.title || `${creator.display_name} 実績画像`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="px-4 py-5">
          <div className="rounded-[28px] border border-slate-100 bg-[#fbfbfd] p-4">
            <p className="text-xs font-black text-rose-500">
              REQUEST MENU
            </p>
            <h2 className="mt-2 text-xl font-black tracking-[-0.04em]">
              依頼したい内容を選んで相談
            </h2>
            <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
              まだ正式な注文ではありません。内容を送ると、インフルエンサー側で確認されます。
            </p>

            <div className="mt-4 space-y-2.5">
              {requestButtons.map((button) => (
                <a
                  key={button.key}
                  href={`#request-form-${button.key}`}
                  className="group flex items-center justify-between gap-3 rounded-[22px] bg-white p-4 text-left shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span>
                    <span className="block text-sm font-black text-slate-950">
                      {button.title}
                    </span>
                    <span className="mt-1 block text-xs font-semibold leading-5 text-slate-400">
                      {button.body}
                    </span>
                  </span>

                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-lg font-black text-rose-500 transition group-hover:bg-rose-500 group-hover:text-white">
                    →
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {menus.length > 0 ? (
          <section className="px-4 py-3">
            <div className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-black tracking-[-0.04em]">
                対応できる内容
              </h2>

              <div className="mt-4 space-y-3">
                {menus.map((menu) => (
                  <div
                    key={menu.id}
                    className="rounded-[22px] border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-600">
                        {getPlatformLabel(menu.platform || menu.sns)}
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-600">
                        {getMenuTypeLabel(menu.menu_type)}
                      </span>
                    </div>

                    <p className="text-sm font-black leading-6 text-slate-950">
                      {menu.title}
                    </p>

                    {menu.deliverables?.trim() ? (
                      <p className="mt-2 line-clamp-2 text-xs font-semibold leading-6 text-slate-500">
                        {menu.deliverables.trim()}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="px-4 py-5">
          <RequestForm
            creatorId={creator.id}
            creatorName={creator.display_name}
          />
        </section>

        <section className="px-4 pb-10 pt-2">
          <div className="rounded-[28px] bg-slate-950 p-5 text-white">
            <p className="text-sm font-black">
              Trend Mart経由で安全に相談できます
            </p>
            <p className="mt-2 text-xs font-semibold leading-6 text-white/70">
              相談後、正式に依頼する場合はTrend Mart上でチャット・決済・納品確認を進められます。
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}