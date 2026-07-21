"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAppLocale } from "@/lib/i18n/locale";
import {
  CREATOR_LINK_ACTIVE_INQUIRY_STATUSES,
  CREATOR_LINK_CLOSED_INQUIRY_STATUSES,
  type CreatorLinkInquiryInboxResponse,
  type CreatorLinkInquiryListItem,
} from "@/lib/trendre-link/inquiry-inbox";

type FilterKey = "all" | "new" | "active" | "closed";

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="m15 5-7 7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InboxIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M5 5.5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" />
      <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path d="m8 5 5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatDate(value: string, locale: "ja" | "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale === "ja" ? "ja-JP" : "en-US", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: string, locale: "ja" | "en") {
  const ja: Record<string, string> = {
    new: "新着",
    read: "確認済み",
    considering: "検討中",
    replied: "返信済み",
    quoted: "見積もり送信済み",
    accepted: "成約",
    declined: "辞退",
    closed: "完了",
  };
  const en: Record<string, string> = {
    new: "New",
    read: "Read",
    considering: "Considering",
    replied: "Replied",
    quoted: "Quote sent",
    accepted: "Accepted",
    declined: "Declined",
    closed: "Closed",
  };
  return (locale === "ja" ? ja : en)[status] ?? status;
}

function statusClass(status: string) {
  if (status === "new") return "bg-rose-50 text-[#ff3b5c] ring-rose-100";
  if (status === "considering" || status === "quoted") return "bg-amber-50 text-amber-800 ring-amber-100";
  if (status === "accepted") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (status === "declined" || status === "closed") return "bg-slate-100 text-slate-500 ring-slate-200";
  return "bg-blue-50 text-blue-700 ring-blue-100";
}

function getTitle(item: CreatorLinkInquiryListItem, locale: "ja" | "en") {
  return (
    item.company_name ||
    item.contact_name ||
    (locale === "ja" ? "名前未設定の相談" : "Unnamed inquiry")
  );
}

function getDescription(item: CreatorLinkInquiryListItem, locale: "ja" | "en") {
  return (
    item.product_name ||
    item.purpose ||
    item.message ||
    item.inquiry_type_title_snapshot ||
    (locale === "ja" ? "仕事についての相談" : "Work inquiry")
  );
}

export default function CreatorLinkInquiryInboxPage() {
  const { locale } = useAppLocale();
  const [response, setResponse] = useState<CreatorLinkInquiryInboxResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");

  const copy = locale === "ja"
    ? {
        title: "仕事相談",
        description: "Trendre Linkから届いた相談を確認できます。",
        editLink: "リンク編集",
        all: "すべて",
        fresh: "新着",
        active: "対応中",
        closed: "完了",
        emptyTitle: "まだ仕事相談はありません",
        emptyDescription: "公開ページの問い合わせフォームから届いた相談が、ここに表示されます。",
        loadError: "仕事相談を読み込めませんでした。",
        retry: "もう一度試す",
        fromLink: "Trendre Link",
      }
    : {
        title: "Work inquiries",
        description: "Review inquiries received through Trendre Link.",
        editLink: "Edit link",
        all: "All",
        fresh: "New",
        active: "Active",
        closed: "Closed",
        emptyTitle: "No inquiries yet",
        emptyDescription: "Inquiries sent from your public page will appear here.",
        loadError: "Could not load inquiries.",
        retry: "Try again",
        fromLink: "Trendre Link",
      };

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetch("/api/creator/link/inquiries", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      const body = (await result.json()) as CreatorLinkInquiryInboxResponse;

      if (result.status === 401) {
        window.location.assign("/login?next=/creator/link/inquiries");
        return;
      }

      if (!result.ok || !body.ok) {
        throw new Error(body.ok ? copy.loadError : body.error);
      }

      setResponse(body);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : copy.loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleItems = useMemo(() => {
    const items = response?.ok ? response.inquiries : [];
    const active = CREATOR_LINK_ACTIVE_INQUIRY_STATUSES as readonly string[];
    const closed = CREATOR_LINK_CLOSED_INQUIRY_STATUSES as readonly string[];

    if (filter === "new") return items.filter((item) => item.status === "new");
    if (filter === "active") return items.filter((item) => active.includes(item.status));
    if (filter === "closed") return items.filter((item) => closed.includes(item.status));
    return items;
  }, [filter, response]);

  const counts = response?.ok
    ? response.counts
    : { all: 0, new: 0, active: 0, closed: 0 };

  const tabs: Array<{ key: FilterKey; label: string; count: number }> = [
    { key: "all", label: copy.all, count: counts.all },
    { key: "new", label: copy.fresh, count: counts.new },
    { key: "active", label: copy.active, count: counts.active },
    { key: "closed", label: copy.closed, count: counts.closed },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#f6f7f9] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <Link
            href="/creator/link"
            className="flex min-h-11 items-center gap-1 rounded-full px-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 active:scale-[0.98]"
          >
            <ArrowLeftIcon />
            {copy.editLink}
          </Link>

          <div className="text-center">
            <p className="text-sm font-black tracking-[-0.03em]">{copy.title}</p>
            {counts.new > 0 ? (
              <p className="mt-0.5 text-[11px] font-bold text-[#ff3b5c]">
                {locale === "ja" ? `新着 ${counts.new}件` : `${counts.new} new`}
              </p>
            ) : null}
          </div>

          <div className="w-[82px]" aria-hidden="true" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pb-[max(32px,env(safe-area-inset-bottom))] pt-5">
        <section className="overflow-hidden rounded-[28px] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.05)] ring-1 ring-slate-100">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-rose-50 text-[#ff3b5c] ring-1 ring-rose-100">
              <InboxIcon />
            </span>
            <div className="min-w-0">
              <h1 className="text-[26px] font-black tracking-[-0.055em]">{copy.title}</h1>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{copy.description}</p>
            </div>
          </div>

          <div className="creator-scrollbar-none mt-5 flex gap-2 overflow-x-auto pb-1">
            {tabs.map((tab) => {
              const active = filter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilter(tab.key)}
                  className={`flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-black transition active:scale-[0.98] ${
                    active
                      ? "bg-slate-950 text-white shadow-sm"
                      : "bg-slate-50 text-slate-500 ring-1 ring-slate-100"
                  }`}
                >
                  {tab.label}
                  <span className={`text-[11px] ${active ? "text-white/70" : "text-slate-400"}`}>{tab.count}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-4 space-y-3" aria-busy={loading}>
          {loading ? (
            [0, 1, 2].map((item) => (
              <div key={item} className="h-32 animate-pulse rounded-[26px] bg-white ring-1 ring-slate-100" />
            ))
          ) : error ? (
            <div className="rounded-[26px] bg-white px-5 py-8 text-center ring-1 ring-slate-100" role="alert">
              <p className="text-base font-black">{copy.loadError}</p>
              <p className="mt-2 text-sm font-semibold text-slate-500">{error}</p>
              <button type="button" onClick={() => void load()} className="mt-5 min-h-11 rounded-full bg-slate-950 px-5 text-sm font-black text-white">
                {copy.retry}
              </button>
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="rounded-[26px] bg-white px-6 py-10 text-center ring-1 ring-slate-100">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] bg-slate-50 text-slate-400 ring-1 ring-slate-100">
                <InboxIcon className="h-7 w-7" />
              </span>
              <h2 className="mt-5 text-lg font-black tracking-[-0.04em]">{copy.emptyTitle}</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-7 text-slate-500">{copy.emptyDescription}</p>
            </div>
          ) : (
            visibleItems.map((item) => (
              <Link
                key={item.id}
                href={`/creator/link/inquiries/${item.id}`}
                className={`block rounded-[26px] bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.035)] ring-1 transition active:scale-[0.985] ${
                  item.status === "new" ? "ring-rose-200" : "ring-slate-100"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.status === "new" ? "bg-[#ff3b5c]" : "bg-slate-200"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${statusClass(item.status)}`}>
                        {statusLabel(item.status, locale)}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">{copy.fromLink}</span>
                    </div>

                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-[17px] font-black tracking-[-0.04em]">{getTitle(item, locale)}</h2>
                        <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-slate-500">{getDescription(item, locale)}</p>
                      </div>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 ring-1 ring-slate-100">
                        <ChevronIcon />
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs font-bold text-slate-400">
                      <span>{item.inquiry_type_title_snapshot || (item.inquiry_type === "pr_post" ? "PR" : copy.title)}</span>
                      <time dateTime={item.created_at}>{formatDate(item.created_at, locale)}</time>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
