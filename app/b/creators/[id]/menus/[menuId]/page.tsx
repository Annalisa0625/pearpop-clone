// File: app/b/creators/[id]/menus/[menuId]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

export default function MenuDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale } = useAppLocale();
  const safeLocale = locale === "en" ? "en" : "ja";

  const creatorId = params.id as string;
  const menuId = params.menuId as string;

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            loading: "読み込み中...",
            creatorNotFound: "クリエイターが見つかりません。",
            menuNotFound: "メニューが見つかりません。",
            publicMenu: "公開メニュー",
            price: "価格",
            delivery: "納期",
            deliverables: "納品物",
            description: "メニュー説明",
            secondaryUse: "二次利用",
            allowed: "許可",
            notAllowed: "不可",
            notes: "注意事項・補足",
            accountUrl: "対象アカウント",
            openAccount: "アカウントを開く",
            category: "カテゴリー",
            menuType: "種別",
            notSet: "未設定",
            none: "なし",
            backToMenus: "メニュー一覧へ戻る",
            orderMenu: "このメニューを注文する",
            temporaryNotice:
              "現在は注文フロー移行中のため、次の画面では既存の依頼フォームを利用します。今後、checkoutとrequirements提出に置き換える予定です。",
          }
        : {
            loading: "Loading...",
            creatorNotFound: "Creator not found.",
            menuNotFound: "Menu not found.",
            publicMenu: "Public Menu",
            price: "Price",
            delivery: "Delivery",
            deliverables: "Deliverables",
            description: "Menu Description",
            secondaryUse: "Secondary Use",
            allowed: "Allowed",
            notAllowed: "Not allowed",
            notes: "Notes / Conditions",
            accountUrl: "Account",
            openAccount: "Open account",
            category: "Category",
            menuType: "Type",
            notSet: "Not set",
            none: "None",
            backToMenus: "Back to Menus",
            orderMenu: "Order This Menu",
            temporaryNotice:
              "The order flow is being migrated. For now, the next screen uses the existing request form. It will later be replaced with checkout and requirements submission.",
          },
    [safeLocale]
  );

  const [creator, setCreator] = useState<Creator | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!creatorId || !menuId) return;

    let isMounted = true;

    const load = async () => {
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
        setMenu(null);
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
          updated_at
        `
        )
        .eq("id", menuId)
        .eq("creator_id", creatorData.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!isMounted) return;

      if (error || !data) {
        console.error("menu detail load error:", error);
        setMenu(null);
      } else {
        setMenu(data as Menu);
      }

      setLoading(false);
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [creatorId, menuId, supabase]);

  if (loading) return <p className="p-6">{copy.loading}</p>;
  if (!creator) return <p className="p-6">{copy.creatorNotFound}</p>;
  if (!menu) return <p className="p-6">{copy.menuNotFound}</p>;

  const platformLabel = menu.platform || menu.sns || copy.notSet;
  const requestHref = `/b/creators/${creatorId}/request?menuId=${menu.id}`;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-blue-600">
          {copy.publicMenu}
        </p>

        <div className="mt-2 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-gray-500">@{creator.display_name}</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              {menu.title}
            </h1>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {platformLabel}
              </span>

              <span className="inline-flex rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
                {menuTypeLabel(menu.menu_type, safeLocale, copy.notSet)}
              </span>

              {menu.category ? (
                <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                  {menu.category}
                </span>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl bg-gray-50 p-5 lg:min-w-[260px]">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {copy.price}
            </p>
            <p className="mt-2 text-3xl font-bold">
              {formatPrice(
                menu.price,
                menu.currency,
                menu.reference_price_text,
                safeLocale
              )}
            </p>

            <p className="mt-4 text-sm text-gray-600">
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
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-5">
          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">{copy.description}</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-700">
              {menu.description?.trim() || copy.none}
            </p>
          </div>

          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">{copy.deliverables}</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-700">
              {menu.deliverables?.trim() || copy.none}
            </p>
          </div>

          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">{copy.notes}</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-700">
              {menu.notes?.trim() || copy.none}
            </p>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">{copy.secondaryUse}</h2>
            <p className="mt-3 text-sm font-semibold text-gray-900">
              {menu.allow_secondary_use ? copy.allowed : copy.notAllowed}
            </p>
          </div>

          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">{copy.accountUrl}</h2>
            {menu.account_url ? (
              <a
                href={menu.account_url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex break-all text-sm font-semibold text-blue-600 hover:underline"
              >
                {copy.openAccount}
              </a>
            ) : (
              <p className="mt-3 text-sm text-gray-600">{copy.notSet}</p>
            )}
          </div>

          <div className="rounded-3xl border border-blue-100 bg-blue-50 p-6">
            <p className="text-sm leading-6 text-blue-800">
              {copy.temporaryNotice}
            </p>

            <button
              type="button"
              onClick={() => router.push(requestHref)}
              className="mt-5 w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              {copy.orderMenu}
            </button>

            <button
              type="button"
              onClick={() => router.push(`/b/creators/${creatorId}/menus`)}
              className="mt-3 w-full rounded-2xl border bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              {copy.backToMenus}
            </button>
          </div>
        </aside>
      </section>
    </div>
  );
}