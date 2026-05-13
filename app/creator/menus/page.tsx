// File: app/creator/menus/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";

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

function formatDateTime(value: string | null, locale: "ja" | "en") {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(locale === "ja" ? "ja-JP" : "en-US", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

function getPlatformIcon(value: string | null | undefined) {
  const normalized = normalizePlatform(value);

  if (normalized.includes("instagram")) return "◎";
  if (normalized.includes("tiktok")) return "♪";
  if (normalized.includes("youtube")) return "▶";
  if (normalized === "x" || normalized.includes("twitter")) return "𝕏";
  if (normalized.includes("ugc")) return "▣";

  return "●";
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
    package: { ja: "セットメニュー", en: "Package" },
    other: { ja: "その他", en: "Other" },
  };

  return labels[key]?.[locale] || fallback;
}

function StatCard({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: number;
  helper?: string;
  tone?: "default" | "dark" | "green" | "gray";
}) {
  const styles = {
    default: "border-slate-100 bg-white text-slate-950",
    dark: "border-slate-950 bg-slate-950 text-white",
    green: "border-emerald-100 bg-emerald-50 text-slate-950",
    gray: "border-slate-100 bg-slate-50 text-slate-950",
  };

  return (
    <div className={`rounded-[26px] border p-5 shadow-sm ${styles[tone]}`}>
      <p
        className={`text-xs font-black uppercase tracking-[0.2em] ${
          tone === "dark" ? "text-white/60" : "text-slate-400"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-3 text-3xl font-black ${
          tone === "dark" ? "text-white" : "text-slate-950"
        }`}
      >
        {value}
      </p>
      {helper ? (
        <p
          className={`mt-2 text-xs leading-5 ${
            tone === "dark" ? "text-white/70" : "text-slate-500"
          }`}
        >
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function Chip({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ${className}`}
    >
      {children}
    </span>
  );
}

function DetailRow({
  label,
  value,
  strong,
  danger,
}: {
  label: string;
  value: ReactNode;
  strong?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span
        className={`text-right ${
          strong
            ? "text-lg font-black text-slate-950"
            : danger
            ? "text-sm font-black text-rose-600"
            : "text-sm font-bold text-slate-800"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function SectionPreview({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-slate-100 bg-white p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-6 text-slate-700">
        {value}
      </p>
    </div>
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
  const safeLocale = locale === "en" ? "en" : "ja";

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            badge: "Creator Menus",
            title: "メニュー・投稿価格",
            subtitle:
              "企業が購入できるメニュー、価格、納期、公開状態を管理します。",
            loginRequired: "ログインしてください",
            creatorNotFound: "クリエイター情報が見つかりません",
            toggleFailed: "公開状態の切り替えに失敗しました",
            confirmDelete:
              "このメニューを削除しますか？企業側からも表示されなくなります。",
            deleteFailed: "削除に失敗しました",
            loadFailed: "メニューの取得に失敗しました",
            loading: "読み込み中...",
            createNew: "新しいメニューを作成",
            emptyTitle: "まだメニューがありません",
            empty:
              "企業が購入できるメニューを作成しましょう。Instagram投稿、TikTok動画、UGC制作などを登録できます。",
            platformUnset: "SNS未設定",
            accountUrl: "アカウント",
            price: "価格",
            deliveryDays: "納期",
            secondaryUse: "二次利用",
            deliverables: "納品物",
            notes: "注意事項",
            description: "説明",
            menuType: "種別",
            notSet: "未設定",
            none: "なし",
            allow: "許可",
            disallow: "不可",
            public: "公開中",
            private: "非公開",
            lastUpdated: "更新",
            makePrivate: "非公開にする",
            makePublic: "公開する",
            edit: "編集",
            delete: "削除",
            deleting: "削除中...",
            updating: "更新中...",
            totalMenus: "全メニュー",
            publicMenus: "公開中",
            privateMenus: "非公開",
            visibleToCompanies: "企業側に表示されます",
            hiddenFromCompanies: "企業側には表示されません",
            legacyPriceNotice:
              "旧形式の参考価格が残っています。編集画面で固定価格を設定すると、B側が注文しやすくなります。",
            viewAccount: "アカウントを開く",
            noDescription: "説明は未設定です。",
            noDeliverables: "納品物は未設定です。",
            noNotes: "注意事項はありません。",
            openPublic: "企業に表示中",
            hiddenPublic: "企業には非表示",
            quickHint:
              "公開中のメニューはB側のクリエイター詳細ページに表示され、注文できます。",
          }
        : {
            badge: "Creator Menus",
            title: "Menus & Rates",
            subtitle:
              "Manage the menus companies can purchase, including pricing, delivery timing, and visibility.",
            loginRequired: "Please log in",
            creatorNotFound: "Creator information was not found",
            toggleFailed: "Failed to change the visibility status",
            confirmDelete:
              "Delete this menu? It will no longer be visible to companies.",
            deleteFailed: "Failed to delete the menu",
            loadFailed: "Failed to load menus",
            loading: "Loading...",
            createNew: "Create New Menu",
            emptyTitle: "No menus yet",
            empty:
              "Create menus companies can purchase, such as Instagram posts, TikTok videos, or UGC creation.",
            platformUnset: "SNS not set",
            accountUrl: "Account",
            price: "Price",
            deliveryDays: "Delivery",
            secondaryUse: "Secondary Use",
            deliverables: "Deliverables",
            notes: "Notes",
            description: "Description",
            menuType: "Type",
            notSet: "Not set",
            none: "None",
            allow: "Allowed",
            disallow: "Not allowed",
            public: "Public",
            private: "Private",
            lastUpdated: "Updated",
            makePrivate: "Make Private",
            makePublic: "Make Public",
            edit: "Edit",
            delete: "Delete",
            deleting: "Deleting...",
            updating: "Updating...",
            totalMenus: "Total Menus",
            publicMenus: "Public",
            privateMenus: "Private",
            visibleToCompanies: "Visible to companies",
            hiddenFromCompanies: "Hidden from companies",
            legacyPriceNotice:
              "This menu still has a legacy reference price. Set a fixed price from the edit page so companies can order more easily.",
            viewAccount: "Open account",
            noDescription: "Description is not set.",
            noDeliverables: "Deliverables are not set.",
            noNotes: "No notes.",
            openPublic: "Visible to companies",
            hiddenPublic: "Hidden from companies",
            quickHint:
              "Public menus are shown on the brand-facing creator detail page and can be ordered.",
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
      .single();

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
    return (
      <div className="space-y-5">
        <div className="h-36 animate-pulse rounded-[32px] bg-slate-100" />
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-52 animate-pulse rounded-[28px] bg-slate-100"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      <section className="rounded-[32px] bg-slate-950 p-6 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-white/50">
          {copy.badge}
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
            href="/creator/menus/new"
            className="w-fit rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 transition active:scale-[0.98] md:hover:-translate-y-0.5"
          >
            + {copy.createNew}
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <StatCard label={copy.totalMenus} value={menus.length} tone="dark" />
        <StatCard
          label={copy.publicMenus}
          value={publicCount}
          helper={copy.visibleToCompanies}
          tone={publicCount > 0 ? "green" : "default"}
        />
        <StatCard
          label={copy.privateMenus}
          value={privateCount}
          helper={copy.hiddenFromCompanies}
          tone={privateCount > 0 ? "gray" : "default"}
        />
      </section>

      <div className="rounded-[24px] border border-blue-100 bg-blue-50 p-4 text-sm font-semibold leading-6 text-blue-800">
        {copy.quickHint}
      </div>

      {error ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      {menus.length === 0 ? (
        <div className="rounded-[32px] border border-slate-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-2xl">
            +
          </div>
          <h2 className="mt-5 text-xl font-black text-slate-950">
            {copy.emptyTitle}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-500">
            {copy.empty}
          </p>
          <Link
            href="/creator/menus/new"
            className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition active:scale-[0.98]"
          >
            + {copy.createNew}
          </Link>
        </div>
      ) : (
        <section className="space-y-4">
          {menus.map((menu) => {
            const accountUrl = resolveAccountUrl(menu);
            const isPublic = !!menu.is_active;
            const isLoading = actionLoadingId === menu.id;
            const badgeLabel = isPublic ? copy.public : copy.private;
            const badgeClass = isPublic
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-700";

            const platformLabel = menu.platform || menu.sns || copy.platformUnset;
            const hasLegacyReferenceOnly =
              menu.price == null && !!menu.reference_price_text?.trim();

            return (
              <article
                key={menu.id}
                className={`rounded-[30px] border bg-white p-5 shadow-sm transition ${
                  isPublic
                    ? "border-emerald-100"
                    : "border-slate-100"
                }`}
              >
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <Chip className={badgeClass}>{badgeLabel}</Chip>

                  <Chip className="bg-slate-950 text-white">
                    <span className="mr-1">{getPlatformIcon(platformLabel)}</span>
                    {platformLabel}
                  </Chip>

                  <Chip className="bg-purple-100 text-purple-700">
                    {menuTypeLabel(menu.menu_type, safeLocale, copy.notSet)}
                  </Chip>

                  {menu.category?.trim() ? (
                    <Chip className="bg-slate-100 text-slate-700">
                      {menu.category.trim()}
                    </Chip>
                  ) : null}
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-black text-slate-950">
                      {menu.title}
                    </h2>
                    <p className="mt-2 text-xs font-semibold text-slate-400">
                      {copy.lastUpdated}:{" "}
                      {formatDateTime(menu.updated_at || menu.created_at, safeLocale)}
                    </p>
                  </div>

                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    ›
                  </span>
                </div>

                <div className="mt-5 rounded-[24px] bg-slate-50 p-4">
                  <div className="grid gap-3">
                    <DetailRow
                      label={copy.price}
                      value={formatPrice(
                        menu.price,
                        menu.currency,
                        menu.reference_price_text,
                        safeLocale
                      )}
                      strong
                    />
                    <DetailRow
                      label={copy.deliveryDays}
                      value={formatDeliveryDays(
                        menu.delivery_days,
                        safeLocale,
                        copy.notSet
                      )}
                    />
                    <DetailRow
                      label={copy.secondaryUse}
                      value={menu.allow_secondary_use ? copy.allow : copy.disallow}
                    />
                    <DetailRow
                      label={copy.accountUrl}
                      value={
                        accountUrl ? (
                          <a
                            href={accountUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 underline underline-offset-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {copy.viewAccount}
                          </a>
                        ) : (
                          copy.notSet
                        )
                      }
                    />
                  </div>
                </div>

                {hasLegacyReferenceOnly ? (
                  <div className="mt-4 rounded-[22px] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                    {copy.legacyPriceNotice}
                  </div>
                ) : null}

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <SectionPreview
                    label={copy.description}
                    value={menu.description?.trim() || copy.noDescription}
                  />
                  <SectionPreview
                    label={copy.deliverables}
                    value={menu.deliverables?.trim() || copy.noDeliverables}
                  />
                </div>

                <SectionPreview
                  label={copy.notes}
                  value={menu.notes?.trim() || copy.noNotes}
                />

                {menu.tags?.trim() ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {menu.tags
                      .split(",")
                      .map((tag) => tag.trim())
                      .filter(Boolean)
                      .map((tag) => (
                        <Chip key={tag} className="bg-slate-100 text-slate-700">
                          #{tag}
                        </Chip>
                      ))}
                  </div>
                ) : null}

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => toggleActive(menu.id, menu.is_active)}
                    disabled={isLoading}
                    className={`rounded-2xl px-4 py-3 text-sm font-black text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
                      isPublic
                        ? "bg-amber-500 hover:bg-amber-600"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {isLoading
                      ? copy.updating
                      : isPublic
                      ? copy.makePrivate
                      : copy.makePublic}
                  </button>

                  <Link
                    href={`/creator/menus/${menu.id}/edit`}
                    className="rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-black text-white transition active:scale-[0.98]"
                  >
                    {copy.edit}
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleDelete(menu.id)}
                    disabled={isLoading}
                    className="rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-black text-rose-600 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? copy.deleting : copy.delete}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}