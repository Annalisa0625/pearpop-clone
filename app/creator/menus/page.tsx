// File: app/creator/menus/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";
import {
  CreatorNotice,
  CreatorPage,
  CreatorSkeleton,
} from "@/app/creator/_components/CreatorDesignSystem";

type CreatorMenu = {
  id: string;
  creator_id: string | null;
  title: string;
  description: string | null;
  platform: string | null;
  price: number | null;
  currency: string;
  deliverables: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  tags: string | null;
  category: string | null;
  delivery_days: number | null;
  sns: string | null;
  notes: string | null;
  account_url: string | null;
  reference_price_text: string | null;
  allow_secondary_use: boolean;
  menu_type: string | null;
  sort_order: number;
};

type SocialAccount = {
  platform: string;
  url: string;
};

type Locale = "ja" | "en";

const MENU_BADGES = [
  "Instagram投稿",
  "Instagramリール",
  "Instagramストーリーズ",
  "TikTok投稿",
  "YouTubeショート",
  "UGC制作",
];

function formatPrice(
  value: number | null,
  currency: string | null | undefined,
  legacyReferenceText: string | null,
  locale: Locale,
) {
  const safeCurrency = currency || "JPY";

  if (value != null) {
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

  if (legacyReferenceText?.trim()) return legacyReferenceText.trim();

  return locale === "ja" ? "未設定" : "Not set";
}

function formatDeliveryDays(value: number | null, locale: Locale) {
  if (value == null) return locale === "ja" ? "未設定" : "Not set";
  return locale === "ja" ? `${value}日` : `${value} days`;
}

function normalizePlatform(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function inferPlatform(menu: CreatorMenu) {
  const raw = `${menu.platform ?? ""} ${menu.sns ?? ""} ${menu.title ?? ""}`.toLowerCase();

  if (raw.includes("instagram")) return "Instagram";
  if (raw.includes("tiktok")) return "TikTok";
  if (raw.includes("youtube")) return "YouTube";
  if (raw.includes("ugc") || raw.includes("素材") || raw.includes("投稿なし")) return "UGC";
  if (raw.includes("event") || raw.includes("イベント") || raw.includes("訪問")) return "Event";

  return menu.platform || menu.sns || "Other";
}

function menuFormatLabel(menu: CreatorMenu, locale: Locale) {
  const title = menu.title ?? "";

  if (title.includes("Instagram投稿")) {
    return locale === "ja" ? "投稿" : "Post";
  }
  if (title.includes("Instagramリール")) {
    return locale === "ja" ? "リール" : "Reel";
  }
  if (title.includes("Instagramストーリーズ")) {
    return locale === "ja" ? "ストーリーズ" : "Stories";
  }
  if (title.includes("TikTok")) {
    return locale === "ja" ? "動画" : "Video";
  }
  if (title.includes("YouTubeショート")) {
    return locale === "ja" ? "ショート" : "Short";
  }
  if (title.includes("YouTube動画")) {
    return locale === "ja" ? "動画" : "Video";
  }
  if (title.includes("動画素材")) {
    return locale === "ja" ? "動画素材" : "Video asset";
  }
  if (title.includes("写真素材")) {
    return locale === "ja" ? "写真素材" : "Photo asset";
  }
  if (title.includes("イベント")) {
    return locale === "ja" ? "訪問" : "Visit";
  }

  const labels: Record<string, { ja: string; en: string }> = {
    post: { ja: "投稿", en: "Post" },
    short_video: { ja: "ショート動画", en: "Short video" },
    story: { ja: "ストーリー", en: "Story" },
    video: { ja: "動画", en: "Video" },
    ugc: { ja: "UGC制作", en: "UGC" },
    ugc_video: { ja: "動画素材", en: "Video asset" },
    ugc_photo: { ja: "写真素材", en: "Photo asset" },
    package: { ja: "セット", en: "Package" },
    other: { ja: "その他", en: "Other" },
  };

  return labels[menu.menu_type ?? ""]?.[locale] || (locale === "ja" ? "メニュー" : "Menu");
}

function platformTone(platform: string) {
  if (platform === "Instagram") {
    return "bg-gradient-to-r from-violet-50 via-fuchsia-50 to-rose-50 text-violet-700 ring-violet-200";
  }

  if (platform === "TikTok") {
    return "bg-slate-950 text-white ring-slate-950";
  }

  if (platform === "YouTube") {
    return "bg-red-600 text-white ring-red-600";
  }

  if (platform === "UGC") {
    return "bg-violet-50 text-violet-700 ring-violet-100";
  }

  if (platform === "Event") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  return "bg-slate-50 text-slate-600 ring-slate-100";
}

function platformIcon(platform: string) {
  if (platform === "Instagram") return "◎";
  if (platform === "TikTok") return "♪";
  if (platform === "YouTube") return "▶";
  if (platform === "UGC") return "UGC";
  if (platform === "Event") return "✓";
  return "•";
}

function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span
      className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold ring-1 ${platformTone(
        platform,
      )}`}
    >
      <span className={platform === "UGC" ? "text-[10px]" : "text-[13px]"}>
        {platformIcon(platform)}
      </span>
      {platform}
    </span>
  );
}

function StatusBadge({
  active,
  locale,
}: {
  active: boolean;
  locale: Locale;
}) {
  return (
    <span
      className={`inline-flex h-8 items-center rounded-full px-3 text-[12px] font-semibold ring-1 ${
        active
          ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
          : "bg-slate-50 text-slate-500 ring-slate-100"
      }`}
    >
      {active
        ? locale === "ja"
          ? "公開中"
          : "Public"
        : locale === "ja"
          ? "非公開"
          : "Private"}
    </span>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="m9 5 7 7-7 7"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EmptyMenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
      <path
        d="M6 7h12M6 12h12M6 17h7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LoadingView() {
  return (
    <CreatorPage>
      <CreatorSkeleton className="h-24" />
      <CreatorSkeleton className="h-20" />
      <CreatorSkeleton className="h-36" />
      <CreatorSkeleton className="h-36" />
    </CreatorPage>
  );
}

function Header({
  title,
  subtitle,
  createLabel,
}: {
  title: string;
  subtitle: string;
  createLabel: string;
}) {
  return (
    <section className="rounded-[28px] bg-white p-4 ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold tracking-[-0.045em] text-slate-950">
            {title}
          </h1>
          <p className="mt-1 text-[12px] font-medium leading-5 text-slate-500">
            {subtitle}
          </p>
        </div>

        <Link
          href="/creator/menus/new"
          className="shrink-0 rounded-full bg-[#ff5f67] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_10px_22px_rgba(255,95,103,0.18)] transition active:scale-[0.98]"
        >
          + {createLabel}
        </Link>
      </div>

      <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {MENU_BADGES.map((badge) => {
          const platform = badge.includes("Instagram")
            ? "Instagram"
            : badge.includes("TikTok")
              ? "TikTok"
              : badge.includes("YouTube")
                ? "YouTube"
                : "UGC";

          return (
            <span
              key={badge}
              className={`inline-flex h-8 shrink-0 items-center rounded-full px-3 text-[11px] font-semibold ring-1 ${platformTone(
                platform,
              )}`}
            >
              {badge}
            </span>
          );
        })}
      </div>
    </section>
  );
}

function SummaryStrip({
  menus,
  locale,
}: {
  menus: CreatorMenu[];
  locale: Locale;
}) {
  const publicCount = menus.filter((menu) => !!menu.is_active).length;
  const privateCount = menus.length - publicCount;

  return (
    <section className="grid grid-cols-3 gap-2">
      <div className="rounded-[20px] bg-white px-4 py-3 ring-1 ring-slate-100">
        <p className="text-[11px] font-medium text-slate-500">
          {locale === "ja" ? "合計" : "Total"}
        </p>
        <p className="mt-1 text-[20px] font-semibold tracking-[-0.045em] text-slate-950">
          {menus.length}
        </p>
      </div>

      <div className="rounded-[20px] bg-white px-4 py-3 ring-1 ring-slate-100">
        <p className="text-[11px] font-medium text-slate-500">
          {locale === "ja" ? "公開中" : "Public"}
        </p>
        <p className="mt-1 text-[20px] font-semibold tracking-[-0.045em] text-emerald-700">
          {publicCount}
        </p>
      </div>

      <div className="rounded-[20px] bg-white px-4 py-3 ring-1 ring-slate-100">
        <p className="text-[11px] font-medium text-slate-500">
          {locale === "ja" ? "非公開" : "Private"}
        </p>
        <p className="mt-1 text-[20px] font-semibold tracking-[-0.045em] text-slate-700">
          {privateCount}
        </p>
      </div>
    </section>
  );
}

function MenuCard({
  menu,
  locale,
  copy,
  accountUrl,
  isLoading,
  onToggle,
  onDelete,
}: {
  menu: CreatorMenu;
  locale: Locale;
  copy: {
    price: string;
    viewAccount: string;
    edit: string;
    delete: string;
    deleting: string;
    updating: string;
    makePrivate: string;
    makePublic: string;
    secondaryUseDenied: string;
    legacyPriceNotice: string;
  };
  accountUrl: string | null;
  isLoading: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const isPublic = !!menu.is_active;
  const platform = inferPlatform(menu);
  const hasLegacyReferenceOnly =
    menu.price == null && !!menu.reference_price_text?.trim();
  const deniedSecondaryUse = menu.allow_secondary_use === false;

  return (
    <article className="rounded-[22px] bg-white p-3.5 ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1.5">
            <PlatformBadge platform={platform} />
            <span
              className={`inline-flex h-8 items-center rounded-full px-3 text-[12px] font-semibold ring-1 ${
                isPublic
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                  : "bg-slate-50 text-slate-500 ring-slate-100"
              }`}
            >
              {isPublic
                ? locale === "ja"
                  ? "公開中"
                  : "Public"
                : locale === "ja"
                  ? "非公開"
                  : "Private"}
            </span>
            <span className="inline-flex h-8 items-center rounded-full bg-slate-50 px-3 text-[12px] font-semibold text-slate-600 ring-1 ring-slate-100">
              {menuFormatLabel(menu, locale)}
            </span>
          </div>

          <h2 className="mt-2 line-clamp-1 text-[16px] font-semibold leading-6 tracking-[-0.035em] text-slate-950">
            {menu.title}
          </h2>

          {menu.description?.trim() ? (
            <p className="mt-0.5 line-clamp-1 text-[12px] font-medium leading-5 text-slate-500">
              {menu.description.trim()}
            </p>
          ) : null}
        </div>

        <Link
          href={`/creator/menus/${menu.id}/edit`}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-300 ring-1 ring-slate-100 transition active:scale-95"
          aria-label={copy.edit}
        >
          <ChevronIcon />
        </Link>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-[18px] bg-[#f8f9fb] px-3 py-2.5 ring-1 ring-slate-100">
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-slate-500">{copy.price}</p>
          <p className="mt-0.5 whitespace-nowrap text-[20px] font-semibold tracking-[-0.055em] text-slate-950">
            {formatPrice(
              menu.price,
              menu.currency,
              menu.reference_price_text,
              locale,
            )}
          </p>
        </div>

        {deniedSecondaryUse ? (
          <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-100">
            {copy.secondaryUseDenied}
          </span>
        ) : null}
      </div>

      {accountUrl || hasLegacyReferenceOnly ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {accountUrl ? (
            <a
              href={accountUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200 transition active:scale-[0.98]"
            >
              {copy.viewAccount}
            </a>
          ) : null}

          {hasLegacyReferenceOnly ? (
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-100">
              {copy.legacyPriceNotice}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_86px] gap-2">
        <button
          type="button"
          onClick={onToggle}
          disabled={isLoading}
          className={`h-10 rounded-full text-[12px] font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
            isPublic
              ? "bg-slate-50 text-slate-700 ring-1 ring-slate-200"
              : "bg-[#ff5f67] text-white shadow-[0_10px_22px_rgba(255,95,103,0.18)]"
          }`}
        >
          {isLoading
            ? copy.updating
            : isPublic
              ? copy.makePrivate
              : copy.makePublic}
        </button>

        <button
          type="button"
          onClick={onDelete}
          disabled={isLoading}
          className="h-10 rounded-full bg-rose-50 text-[12px] font-semibold text-[#ff3860] ring-1 ring-rose-100 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? copy.deleting : copy.delete}
        </button>
      </div>
    </article>
  );
}

function EmptyState({
  title,
  body,
  createLabel,
}: {
  title: string;
  body: string;
  createLabel: string;
}) {
  return (
    <section className="rounded-[28px] bg-white px-5 py-10 text-center ring-1 ring-slate-100">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-slate-50 text-slate-300 ring-1 ring-slate-100">
        <EmptyMenuIcon />
      </div>

      <h2 className="mt-5 text-[17px] font-semibold tracking-[-0.04em] text-slate-950">
        {title}
      </h2>

      <p className="mx-auto mt-2 max-w-sm text-[13px] font-medium leading-6 text-slate-500">
        {body}
      </p>

      <div className="mt-5 flex flex-wrap justify-center gap-1.5">
        {MENU_BADGES.slice(0, 4).map((badge) => (
          <span
            key={badge}
            className="rounded-full bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-[#ff3860] ring-1 ring-rose-100"
          >
            {badge}
          </span>
        ))}
      </div>

      <Link
        href="/creator/menus/new"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#ff5f67] px-5 text-[13px] font-semibold text-white shadow-[0_10px_22px_rgba(255,95,103,0.18)]"
      >
        + {createLabel}
      </Link>
    </section>
  );
}

export default function CreatorMenusPage() {
  const [menus, setMenus] = useState<CreatorMenu[]>([]);
  const [socials, setSocials] = useState<SocialAccount[]>([]);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale } = useAppLocale();
  const safeLocale: Locale = locale === "en" ? "en" : "ja";

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            title: "メニュー・価格",
            subtitle: "企業が購入できるメニューを管理します。",
            loginRequired: "ログインしてください",
            creatorNotFound: "クリエイター情報が見つかりません",
            toggleFailed: "公開状態の切り替えに失敗しました",
            confirmDelete:
              "このメニューを削除しますか？企業側からも表示されなくなります。",
            deleteFailed: "削除に失敗しました",
            loadFailed: "メニューの取得に失敗しました",
            createNew: "メニューを作成",
            emptyTitle: "まだメニューがありません",
            empty:
              "Instagram投稿、TikTok動画、UGC制作など、企業が注文できるメニューを作成しましょう。",
            price: "価格",
            secondaryUseDenied: "二次利用不可",
            public: "公開中",
            private: "非公開",
            makePrivate: "非公開にする",
            makePublic: "公開する",
            edit: "編集",
            delete: "削除",
            deleting: "削除中",
            updating: "更新中",
            legacyPriceNotice:
              "旧形式の参考価格です。編集画面で固定価格にすると注文されやすくなります。",
            viewAccount: "SNSを開く",
            errorTitle: "エラー",
          }
        : {
            title: "Menus & rates",
            subtitle: "Manage menus brands can order.",
            loginRequired: "Please log in",
            creatorNotFound: "Creator information was not found",
            toggleFailed: "Failed to change visibility",
            confirmDelete:
              "Delete this menu? It will no longer be visible to companies.",
            deleteFailed: "Failed to delete the menu",
            loadFailed: "Failed to load menus",
            createNew: "Create menu",
            emptyTitle: "No menus yet",
            empty:
              "Create menus companies can order, such as Instagram posts, TikTok videos, or UGC creation.",
            price: "Price",
            secondaryUseDenied: "No reuse",
            public: "Public",
            private: "Private",
            makePrivate: "Make private",
            makePublic: "Make public",
            edit: "Edit",
            delete: "Delete",
            deleting: "Deleting",
            updating: "Updating",
            legacyPriceNotice:
              "This menu uses a legacy reference price. Set a fixed price from the edit page.",
            viewAccount: "Open SNS",
            errorTitle: "Error",
          },
    [safeLocale],
  );

  const fetchMenus = async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.alert(copy.loginRequired);
      router.push("/login");
      setLoading(false);
      return;
    }

    const { data: creator, error: creatorError } = await supabase
      .from("creators")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (creatorError || !creator) {
      console.error("creator load error:", creatorError);
      setError(copy.creatorNotFound);
      setLoading(false);
      return;
    }

    setCreatorId(creator.id);

    const [
      { data: menuRows, error: menuError },
      { data: socialRows, error: socialError },
    ] = await Promise.all([
      supabase
        .from("creator_menus")
        .select("*")
        .eq("creator_id", creator.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase
        .from("creator_social_accounts")
        .select("platform, url")
        .eq("creator_id", creator.id)
        .order("created_at", { ascending: true }),
    ]);

    if (menuError || socialError) {
      console.error("menu/social load error:", { menuError, socialError });
      setError(copy.loadFailed);
      setMenus([]);
      setSocials([]);
      setLoading(false);
      return;
    }

    setMenus((menuRows || []) as CreatorMenu[]);
    setSocials((socialRows || []) as SocialAccount[]);
    setLoading(false);
  };

  useEffect(() => {
    void fetchMenus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleActive = async (id: string, current: boolean | null) => {
    setActionLoadingId(id);

    let query = supabase
      .from("creator_menus")
      .update({
        is_active: !current,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (creatorId) {
      query = query.eq("creator_id", creatorId);
    }

    const { error: updateError } = await query;

    setActionLoadingId(null);

    if (updateError) {
      console.error("visibility toggle error:", updateError);
      window.alert(copy.toggleFailed);
      return;
    }

    void fetchMenus();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(copy.confirmDelete)) return;

    setActionLoadingId(id);

    let query = supabase.from("creator_menus").delete().eq("id", id);

    if (creatorId) {
      query = query.eq("creator_id", creatorId);
    }

    const { error: deleteError } = await query;

    setActionLoadingId(null);

    if (deleteError) {
      console.error("delete error:", deleteError);
      window.alert(copy.deleteFailed);
      return;
    }

    setMenus((prev) => prev.filter((menu) => menu.id !== id));
  };

  const socialMap = useMemo(() => {
    const map = new Map<string, string[]>();

    for (const social of socials) {
      const key = normalizePlatform(social.platform);
      const current = map.get(key) ?? [];
      current.push(social.url);
      map.set(key, current);
    }

    return map;
  }, [socials]);

  const resolveAccountUrl = (menu: CreatorMenu) => {
    if (menu.account_url?.trim()) return menu.account_url.trim();

    const matchedByPlatform = socialMap.get(normalizePlatform(menu.platform));
    if (matchedByPlatform && matchedByPlatform.length > 0) {
      return matchedByPlatform[0];
    }

    const matchedBySns = socialMap.get(normalizePlatform(menu.sns));
    if (matchedBySns && matchedBySns.length > 0) {
      return matchedBySns[0];
    }

    const inferred = inferPlatform(menu);
    const matchedByInferred = socialMap.get(normalizePlatform(inferred));
    if (matchedByInferred && matchedByInferred.length > 0) {
      return matchedByInferred[0];
    }

    return null;
  };

  if (loading) {
    return <LoadingView />;
  }

  return (
    <CreatorPage>
      <Header
        title={copy.title}
        subtitle={copy.subtitle}
        createLabel={copy.createNew}
      />

      <SummaryStrip menus={menus} locale={safeLocale} />

      {error ? (
        <CreatorNotice
          tone="red"
          title={copy.errorTitle}
          description={error}
        />
      ) : null}

      {menus.length === 0 ? (
        <EmptyState
          title={copy.emptyTitle}
          body={copy.empty}
          createLabel={copy.createNew}
        />
      ) : (
        <section className="space-y-3">
          {menus.map((menu) => (
            <MenuCard
              key={menu.id}
              menu={menu}
              locale={safeLocale}
              copy={copy}
              accountUrl={resolveAccountUrl(menu)}
              isLoading={actionLoadingId === menu.id}
              onToggle={() => toggleActive(menu.id, menu.is_active)}
              onDelete={() => handleDelete(menu.id)}
            />
          ))}
        </section>
      )}
    </CreatorPage>
  );
}
