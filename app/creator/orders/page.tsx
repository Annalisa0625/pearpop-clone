"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAppLocale } from "@/lib/i18n/locale";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type {
  CreatorLinkInquiryInboxResponse,
  CreatorLinkInquiryListItem,
} from "@/lib/trendre-link/inquiry-inbox";

type FilterKey = "all" | "order" | "quote";

type MartOrder = {
  id: string;
  created_at: string;
  product_name: string | null;
  menu_title_snapshot: string | null;
  creator_payout_amount: number | null;
  currency: string | null;
  creator_accept_deadline: string | null;
  status: string;
};

type OrderItem =
  | {
      kind: "order";
      id: string;
      createdAt: string;
      href: string;
      title: string;
      description: string;
      amount: number | null;
      currency: string | null;
      deadline: string | null;
    }
  | {
      kind: "quote";
      id: string;
      createdAt: string;
      href: string;
      title: string;
      description: string;
      status: string;
      budget: string | null;
    };

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function OrderIcon({ kind }: { kind: OrderItem["kind"] }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-white to-slate-100 text-slate-700 shadow-[0_5px_14px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
      {kind === "order" ? (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path d="M7 4.5h10a2 2 0 0 1 2 2v13l-3-1.7-2.7 1.7-2.6-1.7L8 19.5l-3-1.7V6.5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 9h8M8 13h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path d="M6 4.5h9l3 3v12H6v-15Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M15 4.5v3h3M9 12h6M9 15.5h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}

function EmptyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
      <path d="M5 7.5h14M7 4h10l1 3.5H6L7 4Zm-1 3.5V20h12V7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function formatDate(value: string, locale: "ja" | "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US", {
    month: "numeric",
    day: "numeric",
  });
}

function formatMoney(value: number | null, currency: string | null, locale: "ja" | "en") {
  if (value == null) return locale === "ja" ? "金額未設定" : "Amount pending";
  const safeCurrency = currency || "JPY";
  try {
    return new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: safeCurrency === "JPY" ? 0 : 2,
    }).format(value);
  } catch {
    return `¥${value.toLocaleString()}`;
  }
}

function formatBudget(value: string | null, locale: "ja" | "en") {
  if (!value?.trim()) return locale === "ja" ? "予算は要相談" : "Budget to discuss";
  const trimmed = value.trim();
  const normalizedNumber = trimmed.replace(/[¥￥,\s]/g, "");
  if (/^\d+$/.test(normalizedNumber)) {
    return `¥${Number(normalizedNumber).toLocaleString(locale === "ja" ? "ja-JP" : "en-US")}`;
  }
  return trimmed;
}

function deadlineText(value: string | null, locale: "ja" | "en") {
  if (!value) return locale === "ja" ? "回答期限を確認" : "Check reply deadline";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return value;
  const diff = time - Date.now();
  if (diff <= 0) return locale === "ja" ? "回答期限を過ぎています" : "Reply deadline passed";
  const hours = Math.ceil(diff / (60 * 60 * 1000));
  if (hours <= 24) return locale === "ja" ? `${hours}時間以内に回答` : `Reply within ${hours}h`;
  const days = Math.ceil(hours / 24);
  return locale === "ja" ? `${days}日以内に回答` : `Reply within ${days}d`;
}

function quoteStatusText(status: string, locale: "ja" | "en") {
  if (locale === "en") {
    if (status === "new") return "Create a quote";
    if (status === "creator_reviewing") return "Quote in progress";
    if (status === "quoted") return "Waiting for the company";
    return "Review the request";
  }
  if (status === "new") return "見積もりを作成してください";
  if (status === "creator_reviewing") return "見積もりを作成中";
  if (status === "quoted") return "企業の回答を待っています";
  return "依頼内容を確認してください";
}

function OrderRow({ item, locale }: { item: OrderItem; locale: "ja" | "en" }) {
  const isNew = item.kind === "quote" && item.status === "new";
  const urgent = item.kind === "order" && item.deadline
    ? new Date(item.deadline).getTime() - Date.now() <= 24 * 60 * 60 * 1000
    : false;

  return (
    <Link
      href={item.href}
      className="group relative flex min-h-[116px] items-start gap-3.5 px-4 py-4 transition duration-200 active:scale-[0.985] active:bg-slate-50/80"
    >
      <div className="relative">
        <OrderIcon kind={item.kind} />
        {isNew ? (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#ff304f] ring-[3px] ring-white" aria-label={locale === "ja" ? "新着" : "New"} />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-medium text-slate-400">
            {item.kind === "order"
              ? locale === "ja" ? "注文" : "Order"
              : locale === "ja" ? "見積もり依頼" : "Quote request"}
          </p>
          <time className="shrink-0 text-[11px] font-medium text-slate-400" dateTime={item.createdAt}>
            {formatDate(item.createdAt, locale)}
          </time>
        </div>

        <div className="mt-1 flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[16px] font-semibold tracking-[-0.025em] text-slate-950">
              {item.title}
            </h2>
            <p className="mt-1 line-clamp-1 text-[13px] leading-5 text-slate-500">
              {item.description}
            </p>
          </div>
          <span className="mt-1 shrink-0 text-slate-300 transition duration-200 group-hover:translate-x-0.5 group-hover:text-slate-500">
            <ChevronIcon />
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[13px] font-semibold text-slate-800">
            {item.kind === "order"
              ? formatMoney(item.amount, item.currency, locale)
              : formatBudget(item.budget, locale)}
          </p>
          <p className={`text-[11px] font-medium ${urgent ? "text-[#e22645]" : "text-slate-500"}`}>
            {item.kind === "order"
              ? deadlineText(item.deadline, locale)
              : quoteStatusText(item.status, locale)}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default function CreatorOrdersPage() {
  const { locale } = useAppLocale();
  const safeLocale: "ja" | "en" = locale === "en" ? "en" : "ja";
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const copy = safeLocale === "ja"
    ? {
        title: "受注",
        all: "すべて",
        orders: "注文",
        quotes: "見積もり依頼",
        emptyTitle: "新しい依頼はありません",
        emptyBody: "注文や見積もり依頼が届くと、ここに表示されます。",
        loadError: "受注情報を読み込めませんでした。",
        retry: "再読み込み",
      }
    : {
        title: "Orders",
        all: "All",
        orders: "Orders",
        quotes: "Quote requests",
        emptyTitle: "Nothing needs your attention",
        emptyBody: "New orders and quote requests will appear here.",
        loadError: "Could not load orders.",
        retry: "Reload",
      };

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.assign("/login?next=/creator/orders");
        return;
      }

      const [orderResult, inquiryResult] = await Promise.all([
        supabase
          .from("orders")
          .select("id, created_at, product_name, menu_title_snapshot, creator_payout_amount, currency, creator_accept_deadline, status")
          .eq("creator_user_id", user.id)
          .eq("status", "authorized_pending_creator")
          .order("created_at", { ascending: false }),
        fetch("/api/creator/link/inquiries", { credentials: "same-origin", cache: "no-store" })
          .then(async (response) => ({ response, body: (await response.json().catch(() => null)) as CreatorLinkInquiryInboxResponse | null })),
      ]);

      if (orderResult.error) throw orderResult.error;
      if (!inquiryResult.response.ok || !inquiryResult.body?.ok) throw new Error(copy.loadError);

      const orderItems: OrderItem[] = ((orderResult.data ?? []) as MartOrder[]).map((order) => ({
        kind: "order",
        id: order.id,
        createdAt: order.created_at,
        href: `/creator/orders/${order.id}`,
        title: order.product_name || order.menu_title_snapshot || (safeLocale === "ja" ? "注文内容" : "Order details"),
        description: order.menu_title_snapshot || (safeLocale === "ja" ? "内容を確認して回答してください" : "Review and respond"),
        amount: order.creator_payout_amount,
        currency: order.currency,
        deadline: order.creator_accept_deadline,
      }));

      const activeStatuses = new Set(["new", "creator_reviewing", "quoted"]);
      const quoteItems: OrderItem[] = inquiryResult.body.inquiries
        .filter((inquiry: CreatorLinkInquiryListItem) => activeStatuses.has(inquiry.status))
        .map((inquiry: CreatorLinkInquiryListItem) => ({
          kind: "quote",
          id: inquiry.id,
          createdAt: inquiry.created_at,
          href: `/creator/orders/inquiries/${inquiry.id}`,
          title: inquiry.company_name || inquiry.contact_name || (safeLocale === "ja" ? "見積もり依頼" : "Quote request"),
          description: inquiry.product_name || inquiry.purpose || inquiry.message || (safeLocale === "ja" ? "依頼内容を確認してください" : "Review the request"),
          status: inquiry.status,
          budget: inquiry.budget_text,
        }));

      setItems([...orderItems, ...quoteItems].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (loadError) {
      console.error("creator order inbox load failed", loadError);
      setError(copy.loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => ({
    all: items.length,
    order: items.filter((item) => item.kind === "order").length,
    quote: items.filter((item) => item.kind === "quote").length,
  }), [items]);

  const visibleItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => item.kind === filter);
  }, [filter, items]);

  const tabs: Array<{ key: FilterKey; label: string; count: number }> = [
    { key: "all", label: copy.all, count: counts.all },
    { key: "order", label: copy.orders, count: counts.order },
    { key: "quote", label: copy.quotes, count: counts.quote },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl pb-5 pt-3">
      <header className="flex items-end justify-between px-1 pb-3 pt-2">
        <h1 className="text-[27px] font-semibold tracking-[-0.05em] text-slate-950">{copy.title}</h1>
        <p className="pb-1 text-xs font-medium text-slate-400">{counts.all}</p>
      </header>

      <nav className="creator-scrollbar-none flex overflow-x-auto border-b border-slate-200/80" aria-label={copy.title}>
        {tabs.map((tab) => {
          const active = filter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`relative min-h-11 shrink-0 px-4 text-[13px] font-medium transition duration-200 active:opacity-60 ${active ? "text-slate-950" : "text-slate-400"}`}
            >
              {tab.label}
              <span className="ml-1.5 text-[11px] text-slate-400">{tab.count}</span>
              {active ? <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-slate-950" /> : null}
            </button>
          );
        })}
      </nav>

      <section className="mt-3 overflow-hidden rounded-[20px] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.045)] ring-1 ring-slate-200/70" aria-busy={loading}>
        {loading ? (
          <div className="divide-y divide-slate-100">
            {[0, 1, 2].map((item) => (
              <div key={item} className="flex h-[116px] items-center gap-4 px-4">
                <div className="h-11 w-11 animate-pulse rounded-[14px] bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/4 animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-semibold text-slate-900">{error}</p>
            <button type="button" onClick={() => void load()} className="mt-5 min-h-11 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition active:scale-[0.97]">
              {copy.retry}
            </button>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto flex h-13 w-13 items-center justify-center rounded-full bg-slate-50 text-slate-300 ring-1 ring-slate-100"><EmptyIcon /></span>
            <h2 className="mt-4 text-[16px] font-semibold tracking-[-0.025em] text-slate-950">{copy.emptyTitle}</h2>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-6 text-slate-500">{copy.emptyBody}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleItems.map((item) => (
              <OrderRow key={`${item.kind}:${item.id}`} item={item} locale={safeLocale} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
