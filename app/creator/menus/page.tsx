// File: app/creator/menus/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  return date.toLocaleString(locale === "ja" ? "ja-JP" : "en-US");
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
}: {
  label: string;
  value: number;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      {helper ? <p className="mt-1 text-xs text-gray-500">{helper}</p> : null}
    </div>
  );
}

function Chip({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

export default function CreatorMenusPage() {
  const [menus, setMenus] = useState<CreatorMenu[]>([]);
  const [socials, setSocials] = useState<SocialAccount[]>([]);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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
            title: "メニュー管理",
            subtitle:
              "企業が購入・注文できるメニューを管理します。価格、納期、納品物、公開状態をここで確認できます。",
            loginRequired: "ログインしてください",
            creatorNotFound: "クリエイター情報が見つかりません",
            toggleFailed: "公開状態の切り替えに失敗しました",
            confirmDelete:
              "このメニューを削除しますか？企業側からも表示されなくなります。",
            deleteFailed: "削除に失敗しました",
            loadFailed: "メニューの取得に失敗しました",
            loading: "読み込み中...",
            createNew: "＋ 新しいメニューを作成",
            emptyTitle: "まだメニューがありません",
            empty:
              "企業が購入できるメニューを作成しましょう。投稿、ショート動画、UGC制作など、依頼されたい内容を分かりやすく登録できます。",
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
            lastUpdated: "最終更新",
            makePrivate: "非公開にする",
            makePublic: "公開する",
            edit: "編集",
            delete: "削除",
            totalMenus: "全メニュー",
            publicMenus: "公開中",
            privateMenus: "非公開",
            visibleToCompanies: "企業側に表示されます",
            hiddenFromCompanies: "企業側には表示されません",
            legacyPriceNotice:
              "旧形式の参考価格が残っています。必要に応じて編集画面で価格を設定してください。",
            viewAccount: "アカウントを開く",
          }
        : {
            badge: "Creator Menus",
            title: "Menu Management",
            subtitle:
              "Manage the menus companies can purchase or order. Review pricing, delivery timing, deliverables, and visibility here.",
            loginRequired: "Please log in",
            creatorNotFound: "Creator information was not found",
            toggleFailed: "Failed to change the visibility status",
            confirmDelete:
              "Delete this menu? It will no longer be visible to companies.",
            deleteFailed: "Failed to delete the menu",
            loadFailed: "Failed to load menus",
            loading: "Loading...",
            createNew: "+ Create New Menu",
            emptyTitle: "No menus yet",
            empty:
              "Create menus companies can purchase. You can list posts, short videos, UGC creation, packages, and other services clearly.",
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
            lastUpdated: "Last Updated",
            makePrivate: "Make Private",
            makePublic: "Make Public",
            edit: "Edit",
            delete: "Delete",
            totalMenus: "Total Menus",
            publicMenus: "Public",
            privateMenus: "Private",
            visibleToCompanies: "Visible to companies",
            hiddenFromCompanies: "Hidden from companies",
            legacyPriceNotice:
              "This menu still has a legacy reference price. Set a fixed price from the edit page when needed.",
            viewAccount: "Open account",
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

    if (updateError) {
      console.error("visibility toggle error:", updateError);
      window.alert(copy.toggleFailed);
      return;
    }

    void fetchMenus();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(copy.confirmDelete)) return;

    let query = supabase.from("creator_menus").delete().eq("id", id);

    if (creatorId) {
      query = query.eq("creator_id", creatorId);
    }

    const { error: deleteError } = await query;

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
    return <p className="p-6">{copy.loading}</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-semibold text-blue-600">{copy.badge}</p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{copy.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              {copy.subtitle}
            </p>
          </div>

          <Link
            href="/creator/menus/new"
            className="inline-flex items-center justify-center rounded-2xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
          >
            {copy.createNew}
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <StatCard label={copy.totalMenus} value={menus.length} />
          <StatCard
            label={copy.publicMenus}
            value={publicCount}
            helper={copy.visibleToCompanies}
          />
          <StatCard
            label={copy.privateMenus}
            value={privateCount}
            helper={copy.hiddenFromCompanies}
          />
        </div>
      </section>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {menus.length === 0 ? (
        <div className="rounded-3xl border bg-white p-10 text-center shadow-sm">
          <h2 className="text-xl font-bold">{copy.emptyTitle}</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            {copy.empty}
          </p>
          <div className="mt-6">
            <Link
              href="/creator/menus/new"
              className="inline-flex items-center justify-center rounded-2xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
            >
              {copy.createNew}
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {menus.map((menu) => {
            const accountUrl = resolveAccountUrl(menu);
            const badgeLabel = menu.is_active ? copy.public : copy.private;
            const badgeClass = menu.is_active
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-700";

            const platformLabel = menu.platform || menu.sns || copy.platformUnset;
            const hasLegacyReferenceOnly =
              menu.price == null && !!menu.reference_price_text?.trim();

            return (
              <section
                key={menu.id}
                className="rounded-3xl border bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip className={badgeClass}>{badgeLabel}</Chip>

                      <Chip className="bg-blue-50 text-blue-700">
                        {platformLabel}
                      </Chip>

                      <Chip className="bg-purple-50 text-purple-700">
                        {menuTypeLabel(
                          menu.menu_type,
                          safeLocale,
                          copy.notSet
                        )}
                      </Chip>

                      {menu.category?.trim() ? (
                        <Chip className="bg-gray-100 text-gray-700">
                          {menu.category.trim()}
                        </Chip>
                      ) : null}
                    </div>

                    <h2 className="mt-3 text-2xl font-bold tracking-tight">
                      {menu.title}
                    </h2>

                    <p className="mt-2 text-sm text-gray-500">
                      {copy.lastUpdated}:{" "}
                      {formatDateTime(
                        menu.updated_at || menu.created_at,
                        safeLocale
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => toggleActive(menu.id, menu.is_active)}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${
                        menu.is_active
                          ? "bg-amber-500 hover:bg-amber-600"
                          : "bg-green-600 hover:bg-green-700"
                      }`}
                    >
                      {menu.is_active ? copy.makePrivate : copy.makePublic}
                    </button>

                    <Link
                      href={`/creator/menus/${menu.id}/edit`}
                      className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      {copy.edit}
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleDelete(menu.id)}
                      className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                    >
                      {copy.delete}
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {copy.price}
                    </p>
                    <p className="mt-2 text-2xl font-bold">
                      {formatPrice(
                        menu.price,
                        menu.currency,
                        menu.reference_price_text,
                        safeLocale
                      )}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {copy.deliveryDays}
                    </p>
                    <p className="mt-2 text-2xl font-bold">
                      {formatDeliveryDays(
                        menu.delivery_days,
                        safeLocale,
                        copy.notSet
                      )}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {copy.secondaryUse}
                    </p>
                    <p className="mt-2 text-2xl font-bold">
                      {menu.allow_secondary_use ? copy.allow : copy.disallow}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {copy.accountUrl}
                    </p>
                    {accountUrl ? (
                      <a
                        href={accountUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 block break-all text-sm font-medium text-blue-600 hover:underline"
                      >
                        {copy.viewAccount}
                      </a>
                    ) : (
                      <p className="mt-2 text-sm text-gray-600">
                        {copy.notSet}
                      </p>
                    )}
                  </div>
                </div>

                {hasLegacyReferenceOnly ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                    {copy.legacyPriceNotice}
                  </div>
                ) : null}

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {copy.description}
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-700">
                      {menu.description?.trim() || copy.none}
                    </p>
                  </div>

                  <div className="rounded-2xl border bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {copy.deliverables}
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-700">
                      {menu.deliverables?.trim() || copy.none}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {copy.notes}
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-700">
                    {menu.notes?.trim() || copy.none}
                  </p>
                </div>

                {menu.tags?.trim() ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {menu.tags
                      .split(",")
                      .map((tag) => tag.trim())
                      .filter(Boolean)
                      .map((tag) => (
                        <Chip key={tag} className="bg-gray-100 text-gray-700">
                          #{tag}
                        </Chip>
                      ))}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}