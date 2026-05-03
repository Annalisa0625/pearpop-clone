// File: app/b/creators/[id]/menus/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";

type Creator = {
  id: string;
  user_id: string;
  display_name: string;
  category: string | null;
};

type Menu = {
  id: string;
  creator_id: string | null;
  title: string;
  description: string | null;
  platform: string | null;
  sns: string | null;
  menu_type: string | null;
  category: string | null;
  price: number | null;
  currency: string;
  deliverables: string | null;
  delivery_days: number | null;
  allow_secondary_use: boolean;
  notes: string | null;
  account_url: string | null;
  reference_price_text: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  sort_order: number;
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

function menuTypeLabel(
  value: string | null,
  locale: "ja" | "en",
  fallback: string
) {
  const labels: Record<string, { ja: string; en: string }> = {
    post: { ja: "投稿", en: "Post" },
    short_video: { ja: "ショート動画", en: "Short video" },
    story: { ja: "ストーリー", en: "Story" },
    video: { ja: "動画", en: "Video" },
    ugc: { ja: "UGC制作", en: "UGC creation" },
    package: { ja: "セットメニュー", en: "Package" },
    other: { ja: "その他", en: "Other" },
  };

  return labels[value || ""]?.[locale] || fallback;
}

export default function CreatorMenusPage() {
  const params = useParams();
  const creatorId = params.id as string;
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale } = useAppLocale();
  const safeLocale = locale === "en" ? "en" : "ja";

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            loading: "読み込み中...",
            creatorNotFound: "クリエイターが見つかりません。",
            title: "公開メニュー",
            subtitle:
              "このクリエイターが企業向けに公開している購入・注文可能なメニューです。",
            empty: "公開中のメニューがありません。",
            price: "価格",
            delivery: "納期",
            deliverables: "納品物",
            secondaryUse: "二次利用",
            allowed: "許可",
            notAllowed: "不可",
            notSet: "未設定",
            none: "なし",
            viewDetail: "メニュー詳細を見る",
            orderMenu: "このメニューを注文する",
            account: "アカウント",
            openAccount: "アカウントを開く",
            category: "カテゴリー",
            menuType: "種別",
          }
        : {
            loading: "Loading...",
            creatorNotFound: "Creator not found.",
            title: "Public Menus",
            subtitle:
              "These are the menus this creator offers for companies to purchase or order.",
            empty: "There are no public menus.",
            price: "Price",
            delivery: "Delivery",
            deliverables: "Deliverables",
            secondaryUse: "Secondary Use",
            allowed: "Allowed",
            notAllowed: "Not allowed",
            notSet: "Not set",
            none: "None",
            viewDetail: "View Menu Detail",
            orderMenu: "Order This Menu",
            account: "Account",
            openAccount: "Open account",
            category: "Category",
            menuType: "Type",
          },
    [safeLocale]
  );

  const [creator, setCreator] = useState<Creator | null>(null);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!creatorId) return;

    let isMounted = true;

    const fetchMenus = async () => {
      setLoading(true);

      const { data: creatorData, error: creatorError } = await supabase
        .from("creators")
        .select("id, user_id, display_name, category")
        .eq("id", creatorId)
        .eq("is_public", true)
        .eq("approval_status", "approved")
        .maybeSingle();

      if (!isMounted) return;

      if (creatorError || !creatorData) {
        console.error("creator load error:", creatorError);
        setCreator(null);
        setMenus([]);
        setLoading(false);
        return;
      }

      setCreator(creatorData as Creator);

      const { data, error } = await supabase
        .from("creator_menus")
        .select(
          `
          id,
          creator_id,
          title,
          description,
          platform,
          sns,
          menu_type,
          category,
          price,
          currency,
          deliverables,
          delivery_days,
          allow_secondary_use,
          notes,
          account_url,
          reference_price_text,
          is_active,
          created_at,
          updated_at,
          sort_order
        `
        )
        .eq("creator_id", creatorData.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (error) {
        console.error("menu list load error:", error);
        setMenus([]);
      } else {
        setMenus((data as Menu[]) ?? []);
      }

      setLoading(false);
    };

    void fetchMenus();

    return () => {
      isMounted = false;
    };
  }, [creatorId, supabase]);

  if (loading) return <p className="p-6">{copy.loading}</p>;

  if (!creator) {
    return <p className="p-6">{copy.creatorNotFound}</p>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-blue-600">
          @{creator.display_name}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          {copy.title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          {copy.subtitle}
        </p>

        {creator.category ? (
          <div className="mt-4">
            <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              {creator.category}
            </span>
          </div>
        ) : null}
      </section>

      {menus.length === 0 ? (
        <section className="rounded-3xl border bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
          {copy.empty}
        </section>
      ) : (
        <div className="grid gap-4">
          {menus.map((menu) => {
            const platformLabel = menu.platform || menu.sns || copy.notSet;
            const detailHref = `/b/creators/${creatorId}/menus/${menu.id}`;
            const requestHref = `/b/creators/${creatorId}/request?menuId=${menu.id}`;

            return (
              <section
                key={menu.id}
                className="rounded-3xl border bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {platformLabel}
                      </span>

                      <span className="inline-flex rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
                        {menuTypeLabel(
                          menu.menu_type,
                          safeLocale,
                          copy.notSet
                        )}
                      </span>

                      {menu.category ? (
                        <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                          {menu.category}
                        </span>
                      ) : null}
                    </div>

                    <h2 className="mt-3 text-2xl font-bold tracking-tight">
                      {menu.title}
                    </h2>

                    {menu.description ? (
                      <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-6 text-gray-600">
                        {menu.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-4 lg:min-w-[220px]">
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
                    <p className="mt-2 text-sm text-gray-600">
                      {copy.delivery}:{" "}
                      <span className="font-semibold text-gray-900">
                        {formatDeliveryDays(
                          menu.delivery_days,
                          safeLocale,
                          copy.notSet
                        )}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {copy.deliverables}
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-700">
                      {menu.deliverables?.trim() || copy.none}
                    </p>
                  </div>

                  <div className="rounded-2xl border bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {copy.secondaryUse}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-gray-900">
                      {menu.allow_secondary_use
                        ? copy.allowed
                        : copy.notAllowed}
                    </p>

                    {menu.account_url ? (
                      <a
                        href={menu.account_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex text-sm font-semibold text-blue-600 hover:underline"
                      >
                        {copy.openAccount}
                      </a>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Link
                    href={detailHref}
                    className="inline-flex items-center justify-center rounded-2xl border bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    {copy.viewDetail}
                  </Link>

                  <Link
                    href={requestHref}
                    className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    {copy.orderMenu}
                  </Link>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}