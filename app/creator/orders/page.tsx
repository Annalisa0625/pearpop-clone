"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAppLocale } from "@/lib/i18n/locale";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type {
  CreatorLinkInquiryInboxResponse,
  CreatorLinkInquiryListItem,
} from "@/lib/trendre-link/inquiry-inbox";
import { useCreatorOnlyRelease } from "../CreatorReleaseMode";

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
      quoteAmount: number | null;
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
    <span className="flex h-10 w-10 shrink-0 items-center justify-center text-slate-500">
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
    if (status === "quoted" || status === "sent") return "Waiting for the company";
    if (status === "accepted") return "Quote approved";
    if (status === "declined") return "Quote declined";
    if (status === "expired") return "Quote expired";
    if (status === "cancelled") return "Quote cancelled";
    return "Review the request";
  }
  if (status === "new") return "見積もりを作成してください";
  if (status === "creator_reviewing") return "見積もりを作成中";
  if (status === "quoted" || status === "sent") return "企業の回答を待っています";
  if (status === "accepted") return "企業が見積もりを承認しました";
  if (status === "declined") return "企業が見積もりを見送りました";
  if (status === "expired") return "見積もりの期限が切れました";
  if (status === "cancelled") return "見積もりは取り消されています";
  return "依頼内容を確認してください";
}

function quoteStatusClass(status: string) {
  if (status === "accepted") return "text-emerald-700";
  if (status === "declined" || status === "cancelled") return "text-slate-500";
  if (status === "expired") return "text-amber-700";
  return "text-slate-500";
}

function OrderRow({ item, locale, isCreatorOnly }: { item: OrderItem; locale: "ja" | "en"; isCreatorOnly: boolean }) {
  const isNew = item.kind === "quote" && item.status === "new";
  const urgent = item.kind === "order" && item.deadline
    ? new Date(item.deadline).getTime() - Date.now() <= 24 * 60 * 60 * 1000
    : false;
  const statusClass = item.kind === "order"
    ? urgent ? "text-[#e22645]" : "text-slate-500"
    : quoteStatusClass(item.status);

  return (
    <Link
      href={item.href}
      className="group relative flex min-h-[132px] items-start gap-3 px-1 py-5 outline-none transition duration-150 hover:pl-2 focus-visible:bg-rose-50/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-200 active:bg-white/70 motion-reduce:transition-none sm:px-2"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
            {isNew ? <span className="h-2 w-2 rounded-full bg-[#ed3155]" aria-label={locale === "ja" ? "新着" : "New"} /> : null}
            {isCreatorOnly
              ? locale === "ja" ? "仕事相談" : "Work inquiry"
              : item.kind === "order"
              ? locale === "ja" ? "注文" : "Order"
              : locale === "ja" ? "見積もり依頼" : "Quote request"}
          </p>
          <time className="shrink-0 text-[11px] font-medium text-slate-400" dateTime={item.createdAt}>
            {formatDate(item.createdAt, locale)}
          </time>
        </div>

        <div className="mt-1 flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[17px] font-semibold tracking-[-0.03em] text-slate-950">
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
          <p className="text-[16px] font-semibold tabular-nums tracking-[-0.02em] text-slate-950">
            {isCreatorOnly
              ? locale === "ja" ? "相談内容を確認" : "Review inquiry"
              : item.kind === "order"
              ? formatMoney(item.amount, item.currency, locale)
              : item.quoteAmount != null
                ? formatMoney(item.quoteAmount, "JPY", locale)
                : formatBudget(item.budget, locale)}
          </p>
          <p className={`text-[11px] font-medium ${statusClass}`}>
            {isCreatorOnly
              ? locale === "ja" ? "新しい相談" : "New inquiry"
              : item.kind === "order"
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
  const isCreatorOnly = useCreatorOnlyRelease();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const copy = safeLocale === "ja"
    ? {
        title: isCreatorOnly ? "仕事相談" : "受注",
        all: "すべて",
        orders: "注文",
        quotes: isCreatorOnly ? "仕事相談" : "見積もり依頼",
        emptyTitle: "新しい依頼はありません",
        emptyBody: isCreatorOnly ? "新しい仕事相談が届くと、ここに表示されます。" : "注文や見積もり依頼が届くと、ここに表示されます。",
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

      const inquiryPromise = fetch("/api/creator/link/inquiries", { credentials: "same-origin", cache: "no-store" })
        .then(async (response) => ({ response, body: (await response.json().catch(() => null)) as CreatorLinkInquiryInboxResponse | null }));
      const orderPromise = isCreatorOnly
        ? null
        : supabase
            .from("orders")
            .select("id, created_at, product_name, menu_title_snapshot, creator_payout_amount, currency, creator_accept_deadline, status")
            .eq("creator_user_id", user.id)
            .eq("status", "authorized_pending_creator")
            .order("created_at", { ascending: false });
      const [orderResult, inquiryResult] = await Promise.all([orderPromise, inquiryPromise]);

      if (orderResult?.error) throw orderResult.error;
      if (!inquiryResult.response.ok || !inquiryResult.body?.ok) throw new Error(copy.loadError);

      const orderItems: OrderItem[] = ((orderResult?.data ?? []) as MartOrder[]).map((order) => ({
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
        .filter((inquiry: CreatorLinkInquiryListItem) => activeStatuses.has(inquiry.status) && (!isCreatorOnly || inquiry.inquiry_type === "other"))
        .map((inquiry: CreatorLinkInquiryListItem) => ({
          kind: "quote",
          id: inquiry.id,
          createdAt: inquiry.created_at,
          href: `/creator/orders/inquiries/${inquiry.id}`,
          title: inquiry.company_name || inquiry.contact_name || (safeLocale === "ja" ? "見積もり依頼" : "Quote request"),
          description: inquiry.product_name || inquiry.purpose || inquiry.message || (safeLocale === "ja" ? "依頼内容を確認してください" : "Review the request"),
          status: inquiry.quote_status || inquiry.status,
          budget: inquiry.budget_text,
          quoteAmount: inquiry.quote_amount ?? null,
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
  }, [isCreatorOnly]);

  const counts = useMemo(() => ({
    all: items.length,
    order: items.filter((item) => item.kind === "order").length,
    quote: items.filter((item) => item.kind === "quote").length,
  }), [items]);

  const visibleItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => item.kind === filter);
  }, [filter, items]);

  const tabs: Array<{ key: FilterKey; label: string; count: number }> = isCreatorOnly ? [
    { key: "all", label: copy.quotes, count: counts.all },
  ] : [
    { key: "all", label: copy.all, count: counts.all },
    { key: "order", label: copy.orders, count: counts.order },
    { key: "quote", label: copy.quotes, count: counts.quote },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl pb-6 pt-1 sm:pb-8 sm:pt-2">
      <header className="flex items-end justify-between px-0.5 pb-4 pt-2 sm:pt-3">
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.05em] text-slate-950">{copy.title}</h1>
        <p className="pb-1 text-xs font-medium tabular-nums text-slate-500">{counts.all}</p>
      </header>

      <nav className="creator-scrollbar-none flex min-h-11 overflow-x-auto border-b border-slate-200/80" aria-label={copy.title}>
        {tabs.map((tab) => {
          const active = filter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              aria-pressed={active}
              className={`relative min-h-11 shrink-0 rounded-t-md px-4 text-[13px] font-medium outline-none transition duration-150 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-200 active:opacity-60 motion-reduce:transition-none ${active ? "text-slate-950" : "text-slate-500 hover:text-slate-800"}`}
            >
              {tab.label}
              <span className="ml-1.5 text-[11px] text-slate-400">{tab.count}</span>
              {active ? <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#ff3860]" /> : null}
            </button>
          );
        })}
      </nav>

      <section className="mt-4 border-y border-slate-200/80" aria-busy={loading}>
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
              <OrderRow key={`${item.kind}:${item.id}`} item={item} locale={safeLocale} isCreatorOnly={isCreatorOnly} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
