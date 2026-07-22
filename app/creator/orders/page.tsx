"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { useAppLocale } from "@/lib/i18n/locale";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type {
  CreatorLinkInquiryInboxResponse,
  CreatorLinkInquiryListItem,
} from "@/lib/trendre-link/inquiry-inbox";

type FilterKey = "all" | "trend_mart" | "trendre_link";

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
      source: "trend_mart";
      id: string;
      createdAt: string;
      href: string;
      title: string;
      description: string;
      status: string;
      amount: number | null;
      currency: string | null;
      deadline: string | null;
    }
  | {
      source: "trendre_link";
      id: string;
      createdAt: string;
      href: string;
      title: string;
      description: string;
      status: string;
      budget: string | null;
      company: string | null;
    };

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="M7 4h10a2 2 0 0 1 2 2v14l-3-1.7-2.7 1.7-2.6-1.7L8 20l-3-1.7V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 9h8M8 13h5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="M5 5.5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.9" />
      <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EmptyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
      <path d="M5 7.5h14M7 4h10l1 3.5H6L7 4Zm-1 3.5V20h12V7.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 12h6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
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
  if (value == null) return locale === "ja" ? "報酬未設定" : "Payout not set";
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
  const label = locale === "ja" ? "予算" : "Budget";
  if (!value?.trim()) return locale === "ja" ? "予算未設定" : "Budget not set";

  const trimmed = value.trim();
  const normalizedNumber = trimmed.replace(/[¥￥,\s]/g, "");
  if (/^\d+$/.test(normalizedNumber)) {
    return `${label} ¥${Number(normalizedNumber).toLocaleString(locale === "ja" ? "ja-JP" : "en-US")}`;
  }

  return `${label} ${trimmed}`;
}

function deadlineLabel(value: string | null, locale: "ja" | "en") {
  if (!value) return locale === "ja" ? "返答期限未設定" : "No reply deadline";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return value;
  const diff = time - Date.now();
  if (diff <= 0) return locale === "ja" ? "返答期限切れ" : "Reply deadline passed";
  const hours = Math.ceil(diff / (60 * 60 * 1000));
  if (hours <= 24) return locale === "ja" ? `残り${hours}時間` : `${hours}h remaining`;
  const days = Math.ceil(hours / 24);
  return locale === "ja" ? `残り${days}日` : `${days}d remaining`;
}

function inquiryStatusLabel(status: string, locale: "ja" | "en") {
  const labels = locale === "ja"
    ? {
        new: "新着",
        creator_reviewing: "対応中",
        quoted: "見積もり送信済み",
      }
    : {
        new: "New",
        creator_reviewing: "In progress",
        quoted: "Quote sent",
      };
  return (labels as Record<string, string>)[status] ?? status;
}

function SourceIcon({ source }: { source: OrderItem["source"] }) {
  return (
    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${source === "trend_mart" ? "bg-slate-950 text-white" : "bg-violet-100 text-violet-700"}`}>
      {source === "trend_mart" ? <ReceiptIcon /> : <MailIcon />}
    </span>
  );
}

function SourceBadge({ source }: { source: OrderItem["source"] }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${source === "trend_mart" ? "bg-slate-100 text-slate-600" : "bg-violet-50 text-violet-700"}`}>
      {source === "trend_mart" ? "Trend Mart" : "Trendre Link"}
    </span>
  );
}

function Meta({ children }: { children: ReactNode }) {
  return <span className="text-xs font-semibold text-slate-500">{children}</span>;
}

function OrderCard({ item, locale }: { item: OrderItem; locale: "ja" | "en" }) {
  const isUrgent = item.source === "trend_mart" && item.deadline
    ? new Date(item.deadline).getTime() - Date.now() <= 24 * 60 * 60 * 1000
    : false;

  return (
    <Link href={item.href} className="group block rounded-[22px] bg-white px-4 py-4 ring-1 ring-slate-200/70 transition active:scale-[0.99]">
      <div className="flex items-start gap-3">
        <SourceIcon source={item.source} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <SourceBadge source={item.source} />
            {item.source === "trend_mart" ? (
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${isUrgent ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-[#ff4765]"}`}>
                {deadlineLabel(item.deadline, locale)}
              </span>
            ) : (
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${item.status === "new" ? "bg-rose-50 text-[#ff4765]" : item.status === "quoted" ? "bg-violet-50 text-violet-700" : "bg-amber-50 text-amber-700"}`}>
                {inquiryStatusLabel(item.status, locale)}
              </span>
            )}
          </div>

          <div className="mt-3 flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[17px] font-bold tracking-[-0.035em] text-slate-950">{item.title}</h2>
              <p className="mt-1 line-clamp-2 text-sm font-medium leading-6 text-slate-500">{item.description}</p>
            </div>
            <span className="mt-1 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500"><ArrowIcon /></span>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
            {item.source === "trend_mart" ? (
              <Meta>{locale === "ja" ? "報酬 " : "Payout "}{formatMoney(item.amount, item.currency, locale)}</Meta>
            ) : (
              <Meta>{formatBudget(item.budget, locale)}</Meta>
            )}
            <Meta>{formatDate(item.createdAt, locale)}</Meta>
          </div>
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
        eyebrow: "受注前",
        title: "Order",
        description: "成立前の注文・相談・見積もり依頼をまとめて確認します。",
        all: "すべて",
        mart: "Trend Mart",
        link: "Trendre Link",
        emptyTitle: "対応が必要なOrderはありません",
        emptyBody: "新しい注文や問い合わせが届くと、ここに表示されます。",
        loadError: "Orderを読み込めませんでした。",
        retry: "もう一度試す",
      }
    : {
        eyebrow: "Before agreement",
        title: "Order",
        description: "Review orders, inquiries, and quote requests before they become jobs.",
        all: "All",
        mart: "Trend Mart",
        link: "Trendre Link",
        emptyTitle: "No orders need attention",
        emptyBody: "New orders and inquiries will appear here.",
        loadError: "Could not load Order.",
        retry: "Try again",
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
      if (!inquiryResult.response.ok || !inquiryResult.body?.ok) {
        throw new Error(copy.loadError);
      }

      const martItems: OrderItem[] = ((orderResult.data ?? []) as MartOrder[]).map((order) => ({
        source: "trend_mart",
        id: order.id,
        createdAt: order.created_at,
        href: `/creator/orders/${order.id}`,
        title: order.product_name || order.menu_title_snapshot || (safeLocale === "ja" ? "商品名未設定" : "Untitled order"),
        description: order.menu_title_snapshot || (safeLocale === "ja" ? "内容を確認して承認または辞退してください。" : "Review the details and accept or decline."),
        status: order.status,
        amount: order.creator_payout_amount,
        currency: order.currency,
        deadline: order.creator_accept_deadline,
      }));

      const activeInquiryStatuses = new Set(["new", "creator_reviewing", "quoted"]);
      const linkItems: OrderItem[] = inquiryResult.body.inquiries
        .filter((inquiry: CreatorLinkInquiryListItem) => activeInquiryStatuses.has(inquiry.status))
        .map((inquiry: CreatorLinkInquiryListItem) => ({
          source: "trendre_link",
          id: inquiry.id,
          createdAt: inquiry.created_at,
          href: `/creator/link/inquiries/${inquiry.id}`,
          title: inquiry.company_name || inquiry.contact_name || (safeLocale === "ja" ? "仕事相談" : "Work inquiry"),
          description: inquiry.product_name || inquiry.purpose || inquiry.message || (safeLocale === "ja" ? "相談内容を確認してください。" : "Review the inquiry."),
          status: inquiry.status,
          budget: inquiry.budget_text,
          company: inquiry.company_name,
        }));

      setItems([...martItems, ...linkItems].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (loadError) {
      console.error("creator unified order load failed", loadError);
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
    trend_mart: items.filter((item) => item.source === "trend_mart").length,
    trendre_link: items.filter((item) => item.source === "trendre_link").length,
  }), [items]);

  const visibleItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => item.source === filter);
  }, [filter, items]);

  const tabs: Array<{ key: FilterKey; label: string; count: number }> = [
    { key: "all", label: copy.all, count: counts.all },
    { key: "trend_mart", label: copy.mart, count: counts.trend_mart },
    { key: "trendre_link", label: copy.link, count: counts.trendre_link },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl pb-4 pt-3">
      <section className="px-1 pb-5 pt-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ff4765]">{copy.eyebrow}</p>
        <h1 className="mt-2 text-[34px] font-bold tracking-[-0.06em] text-slate-950">{copy.title}</h1>
        <p className="mt-2 max-w-xl text-sm font-medium leading-7 text-slate-500">{copy.description}</p>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const active = filter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition active:scale-[0.98] ${active ? "bg-slate-950 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200/70"}`}
            >
              {tab.label}
              <span className={active ? "text-white/55" : "text-slate-400"}>{tab.count}</span>
            </button>
          );
        })}
      </div>

      <section className="mt-3 space-y-3" aria-busy={loading}>
        {loading ? (
          [0, 1, 2].map((item) => <div key={item} className="h-36 animate-pulse rounded-[22px] bg-white ring-1 ring-slate-100" />)
        ) : error ? (
          <div className="rounded-[22px] bg-white px-6 py-10 text-center ring-1 ring-slate-200/70">
            <p className="text-base font-bold text-slate-950">{error}</p>
            <button type="button" onClick={() => void load()} className="mt-5 rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white">{copy.retry}</button>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="rounded-[24px] bg-white px-6 py-12 text-center ring-1 ring-slate-200/70">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-300 ring-1 ring-slate-100"><EmptyIcon /></span>
            <h2 className="mt-5 text-lg font-bold tracking-[-0.035em] text-slate-950">{copy.emptyTitle}</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-slate-500">{copy.emptyBody}</p>
          </div>
        ) : (
          visibleItems.map((item) => <OrderCard key={`${item.source}:${item.id}`} item={item} locale={safeLocale} />)
        )}
      </section>
    </div>
  );
}
