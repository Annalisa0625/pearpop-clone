// File: app/creator/menus/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";
import {
  CreatorBadge,
  CreatorButton,
  CreatorCard,
  CreatorChevron,
  CreatorEmptyState,
  CreatorHero,
  CreatorLinkButton,
  CreatorMetric,
  CreatorMiniInfo,
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

function formatPrice(
  value: number | null,
  currency: string | null | undefined,
  legacyReferenceText: string | null,
  locale: "ja" | "en"
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

function formatDeliveryDays(
  value: number | null,
  locale: "ja" | "en",
  fallback: string
) {
  if (value == null) return fallback;
  return locale === "ja" ? `${value}日` : `${value} days`;
}

function normalizePlatform(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function menuTypeLabel(
  value: string | null,
  locale: "ja" | "en",
  fallback: string
) {
  const key = value || "";

  const labels: Record<string, { ja: string; en: string }> = {
    post: { ja: "投稿", en: "Post" },
    short_video: { ja: "ショート動画", en: "Short video" },
    story: { ja: "ストーリー", en: "Story" },
    video: { ja: "動画", en: "Video" },
    ugc: { ja: "UGC制作", en: "UGC creation" },
    package: { ja: "セット", en: "Package" },
    other: { ja: "その他", en: "Other" },
  };

  return labels[key]?.[locale] || fallback;
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M6 7h12M6 12h12M6 17h7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
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

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M3.5 12s3-5.5 8.5-5.5S20.5 12 20.5 12s-3 5.5-8.5 5.5S3.5 12 3.5 12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function HiddenIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M4 4l16 16M9.2 5.4A9.4 9.4 0 0 1 12 5c5.5 0 8.5 7 8.5 7a13.3 13.3 0 0 1-2.1 3.1M6.4 7.4C4.5 9 3.5 12 3.5 12s3 7 8.5 7a8.9 8.9 0 0 0 3.7-.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlatformIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="2" />
      <path
        d="M16.8 7.2h.01"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LoadingView() {
  return (
    <CreatorPage>
      <CreatorSkeleton className="h-32" />
      <div className="grid grid-cols-2 gap-3">
        <CreatorSkeleton className="h-24" />
        <CreatorSkeleton className="h-24" />
      </div>
      <CreatorSkeleton className="h-44" />
      <CreatorSkeleton className="h-44" />
    </CreatorPage>
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
  locale: "ja" | "en";
  copy: {
    platformUnset: string;
    price: string;
    deliveryDays: string;
    accountUrl: string;
    viewAccount: string;
    notSet: string;
    public: string;
    private: string;
    visibleToCompanies: string;
    hiddenFromCompanies: string;
    makePrivate: string;
    makePublic: string;
    edit: string;
    delete: string;
    deleting: string;
    updating: string;
    legacyPriceNotice: string;
    menuType: string;
    secondaryUse: string;
    allow: string;
    disallow: string;
  };
  accountUrl: string | null;
  isLoading: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const isPublic = !!menu.is_active;
  const platformLabel = menu.platform || menu.sns || copy.platformUnset;
  const hasLegacyReferenceOnly =
    menu.price == null && !!menu.reference_price_text?.trim();

  return (
    <CreatorCard className="p-4">
      <div className="flex items-start gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] ring-1 ${
            isPublic
              ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
              : "bg-slate-50 text-slate-500 ring-slate-100"
          }`}
        >
          {isPublic ? <EyeIcon /> : <HiddenIcon />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap gap-2">
            <CreatorBadge tone={isPublic ? "green" : "slate"}>
              {isPublic ? copy.public : copy.private}
            </CreatorBadge>

            <CreatorBadge tone="slate">{platformLabel}</CreatorBadge>

            {menu.menu_type ? (
              <CreatorBadge tone="blue">
                {menuTypeLabel(menu.menu_type, locale, copy.notSet)}
              </CreatorBadge>
            ) : null}
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[18px] font-black leading-tight tracking-[-0.045em] text-slate-950">
                {menu.title}
              </h2>

              <p className="mt-1.5 text-xs font-bold text-slate-400">
                {isPublic ? copy.visibleToCompanies : copy.hiddenFromCompanies}
              </p>
            </div>

            <Link
              href={`/creator/menus/${menu.id}/edit`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 ring-1 ring-slate-100 transition active:scale-95"
              aria-label={copy.edit}
            >
              <CreatorChevron />
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-4 rounded-[22px] bg-[#F8F9FA] px-4 py-3.5 ring-1 ring-slate-100">
            <CreatorMiniInfo
              label={copy.price}
              value={formatPrice(
                menu.price,
                menu.currency,
                menu.reference_price_text,
                locale
              )}
              strong
            />

            <CreatorMiniInfo
              label={copy.deliveryDays}
              value={formatDeliveryDays(
                menu.delivery_days,
                locale,
                copy.notSet
              )}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 rounded-[22px] bg-[#F8F9FA] px-4 py-3.5 ring-1 ring-slate-100">
            <CreatorMiniInfo
              label={copy.menuType}
              value={menuTypeLabel(menu.menu_type, locale, copy.notSet)}
            />

            <CreatorMiniInfo
              label={copy.secondaryUse}
              value={menu.allow_secondary_use ? copy.allow : copy.disallow}
            />
          </div>

          {accountUrl ? (
            <a
              href={accountUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-black text-slate-600 shadow-sm ring-1 ring-slate-200 transition active:scale-[0.98]"
            >
              <PlatformIcon />
              {copy.viewAccount}
            </a>
          ) : null}

          {hasLegacyReferenceOnly ? (
            <CreatorNotice
              tone="amber"
              title={copy.legacyPriceNotice}
            />
          ) : null}

          <div className="mt-4 grid grid-cols-3 gap-2.5">
            <CreatorButton
              type="button"
              variant={isPublic ? "soft" : "primary"}
              onClick={onToggle}
              disabled={isLoading}
              className="col-span-2 px-3 py-3 text-xs"
            >
              {isLoading
                ? copy.updating
                : isPublic
                  ? copy.makePrivate
                  : copy.makePublic}
            </CreatorButton>

            <button
              type="button"
              onClick={onDelete}
              disabled={isLoading}
              className="rounded-full bg-rose-50 px-3 py-3 text-xs font-black text-[#FF3B5C] ring-1 ring-rose-100 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? copy.deleting : copy.delete}
            </button>
          </div>
        </div>
      </div>
    </CreatorCard>
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
  const safeLocale: "ja" | "en" = locale === "en" ? "en" : "ja";

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            title: "メニュー",
            subtitle: "企業が注文できる投稿メニューと価格を管理します。",
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
            platformUnset: "SNS未設定",
            accountUrl: "アカウント",
            price: "価格",
            deliveryDays: "目安",
            secondaryUse: "二次利用",
            menuType: "形式",
            notSet: "未設定",
            allow: "可",
            disallow: "不可",
            public: "公開中",
            private: "非公開",
            makePrivate: "非公開にする",
            makePublic: "公開する",
            edit: "編集",
            delete: "削除",
            deleting: "削除中",
            updating: "更新中",
            totalMenus: "メニュー",
            publicMenus: "公開中",
            privateMenus: "非公開",
            visibleToCompanies: "企業に表示されています",
            hiddenFromCompanies: "企業には表示されていません",
            legacyPriceNotice:
              "旧形式の参考価格です。編集画面で固定価格にすると注文されやすくなります。",
            viewAccount: "SNSを開く",
            quickHint:
              "公開中のメニューだけが企業側のクリエイター詳細ページに表示されます。",
            errorTitle: "エラー",
          }
        : {
            title: "Menus",
            subtitle: "Manage post menus and prices that brands can order.",
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
            platformUnset: "SNS not set",
            accountUrl: "Account",
            price: "Price",
            deliveryDays: "Delivery",
            secondaryUse: "Secondary use",
            menuType: "Type",
            notSet: "Not set",
            allow: "Allowed",
            disallow: "Not allowed",
            public: "Public",
            private: "Private",
            makePrivate: "Make private",
            makePublic: "Make public",
            edit: "Edit",
            delete: "Delete",
            deleting: "Deleting",
            updating: "Updating",
            totalMenus: "Menus",
            publicMenus: "Public",
            privateMenus: "Private",
            visibleToCompanies: "Visible to brands",
            hiddenFromCompanies: "Hidden from brands",
            legacyPriceNotice:
              "This menu uses a legacy reference price. Set a fixed price from the edit page.",
            viewAccount: "Open SNS",
            quickHint:
              "Only public menus are shown on the brand-facing creator detail page.",
            errorTitle: "Error",
          },
    [safeLocale]
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

  const publicCount = menus.filter((menu) => !!menu.is_active).length;
  const privateCount = menus.filter((menu) => !menu.is_active).length;

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

    return null;
  };

  if (loading) {
    return <LoadingView />;
  }

  return (
    <CreatorPage>
      <CreatorHero
        title={copy.title}
        description={copy.subtitle}
        right={
          <CreatorLinkButton href="/creator/menus/new" className="px-4 py-2.5">
            + 作成
          </CreatorLinkButton>
        }
      >
        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-[22px] bg-white/70 p-3 shadow-sm ring-1 ring-white/80 backdrop-blur">
            <p className="text-[11px] font-black text-slate-400">
              {copy.totalMenus}
            </p>
            <p className="mt-1 text-[24px] font-black tracking-[-0.06em] text-slate-950">
              {menus.length}
            </p>
          </div>

          <div className="rounded-[22px] bg-white/70 p-3 shadow-sm ring-1 ring-white/80 backdrop-blur">
            <p className="text-[11px] font-black text-slate-400">
              {copy.publicMenus}
            </p>
            <p className="mt-1 text-[24px] font-black tracking-[-0.06em] text-slate-950">
              {publicCount}
            </p>
          </div>

          <div className="rounded-[22px] bg-white/70 p-3 shadow-sm ring-1 ring-white/80 backdrop-blur">
            <p className="text-[11px] font-black text-slate-400">
              {copy.privateMenus}
            </p>
            <p className="mt-1 text-[24px] font-black tracking-[-0.06em] text-slate-950">
              {privateCount}
            </p>
          </div>
        </div>
      </CreatorHero>

      <CreatorNotice tone="blue" title={copy.quickHint} />

      {error ? (
        <CreatorNotice
          tone="red"
          title={copy.errorTitle}
          description={error}
        />
      ) : null}

      {menus.length === 0 ? (
        <CreatorCard className="p-5">
          <CreatorEmptyState
            icon={<EmptyMenuIcon />}
            title={copy.emptyTitle}
            description={copy.empty}
            action={
              <CreatorLinkButton href="/creator/menus/new">
                + {copy.createNew}
              </CreatorLinkButton>
            }
          />
        </CreatorCard>
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