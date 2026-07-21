"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAppLocale } from "@/lib/i18n/locale";
import {
  type CreatorLinkInquiryDetailResponse,
  type CreatorLinkInquiryListItem,
  type CreatorLinkInquiryStatus,
} from "@/lib/trendre-link/inquiry-inbox";

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="m15 5-7 7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M5 5.5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" />
      <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatDate(value: string, locale: "ja" | "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale === "ja" ? "ja-JP" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: string, locale: "ja" | "en") {
  const labels = locale === "ja"
    ? {
        new: "新着",
        creator_reviewing: "対応中",
        quoted: "見積もり送信済み",
        converted: "成約",
        declined: "辞退",
      }
    : {
        new: "New",
        creator_reviewing: "In progress",
        quoted: "Quote sent",
        converted: "Converted",
        declined: "Declined",
      };
  return (labels as Record<string, string>)[status] ?? status;
}

function statusClass(status: string) {
  if (status === "new") return "bg-rose-50 text-[#ff3b5c] ring-rose-100";
  if (status === "creator_reviewing") return "bg-amber-50 text-amber-800 ring-amber-100";
  if (status === "quoted") return "bg-violet-50 text-violet-800 ring-violet-100";
  if (status === "converted") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function platformLabel(value: string | null, locale: "ja" | "en") {
  if (!value) return null;
  const labels: Record<string, string> = {
    instagram: "Instagram",
    tiktok: "TikTok",
    x: "X",
    youtube: "YouTube",
    other: locale === "ja" ? "その他" : "Other",
  };
  return value
    .split(",")
    .map((item) => labels[item] ?? item)
    .join(" / ");
}

function offerLabel(value: string | null, locale: "ja" | "en") {
  if (!value) return null;
  const labels = locale === "ja"
    ? { provided: "商品提供あり", not_provided: "商品提供なし", consult: "相談したい" }
    : { provided: "Product provided", not_provided: "No product provided", consult: "To be discussed" };
  return (labels as Record<string, string>)[value] ?? value;
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="border-b border-slate-100 py-3 last:border-b-0">
      <p className="text-[11px] font-black text-slate-400">{label}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-[15px] font-bold leading-7 text-slate-800">{value}</p>
    </div>
  );
}

export default function CreatorLinkInquiryDetailPage() {
  const params = useParams<{ id: string }>();
  const { locale } = useAppLocale();
  const [inquiry, setInquiry] = useState<CreatorLinkInquiryListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState<CreatorLinkInquiryStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const copy = locale === "ja"
    ? {
        back: "仕事相談",
        title: "相談内容",
        from: "Trendre Linkから届いた相談",
        company: "会社名・ブランド名",
        contact: "担当者・お名前",
        email: "メールアドレス",
        product: "商品・サービス名",
        purpose: "依頼内容",
        message: "詳細",
        timing: "希望時期",
        budget: "予算",
        platforms: "希望SNS",
        offer: "商品提供",
        received: "受信日時",
        reply: "メールで返信",
        start: "対応を始める",
        quoted: "見積もり送信済みにする",
        converted: "成約にする",
        declined: "辞退する",
        hintTitle: "見積もり作成機能は次の実装で追加します",
        hintBody: "現在はメールで返信し、対応状況をこの画面で管理できます。",
        loadError: "仕事相談を読み込めませんでした。",
        saveError: "対応状況を更新できませんでした。",
        retry: "もう一度試す",
        statusHeading: "対応状況",
        updating: "更新中…",
      }
    : {
        back: "Inquiries",
        title: "Inquiry details",
        from: "Received through Trendre Link",
        company: "Company / brand",
        contact: "Contact name",
        email: "Email",
        product: "Product / service",
        purpose: "Request type",
        message: "Details",
        timing: "Preferred timing",
        budget: "Budget",
        platforms: "Platforms",
        offer: "Product offer",
        received: "Received",
        reply: "Reply by email",
        start: "Start handling",
        quoted: "Mark quote sent",
        converted: "Mark converted",
        declined: "Decline",
        hintTitle: "Quote creation will be added next",
        hintBody: "For now, reply by email and manage the status here.",
        loadError: "Could not load this inquiry.",
        saveError: "Could not update the status.",
        retry: "Try again",
        statusHeading: "Status",
        updating: "Updating…",
      };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetch(`/api/creator/link/inquiries/${params.id}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      const body = (await result.json()) as CreatorLinkInquiryDetailResponse;

      if (result.status === 401) {
        window.location.assign(`/login?next=/creator/link/inquiries/${params.id}`);
        return;
      }
      if (!result.ok || !body.ok) throw new Error(body.ok ? copy.loadError : body.error);
      setInquiry(body.inquiry);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : copy.loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const updateStatus = async (status: CreatorLinkInquiryStatus) => {
    if (!inquiry || savingStatus) return;
    setSavingStatus(status);
    setError(null);
    try {
      const result = await fetch(`/api/creator/link/inquiries/${inquiry.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = (await result.json()) as CreatorLinkInquiryDetailResponse;
      if (!result.ok || !body.ok) throw new Error(body.ok ? copy.saveError : body.error);
      setInquiry(body.inquiry);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : copy.saveError);
    } finally {
      setSavingStatus(null);
    }
  };

  const mailtoHref = useMemo(() => {
    if (!inquiry) return "#";
    const subject = locale === "ja"
      ? `【Trendre Link】${inquiry.inquiry_type_title_snapshot || inquiry.purpose || "お問い合わせへのご返信"}`
      : `Trendre Link: ${inquiry.inquiry_type_title_snapshot || inquiry.purpose || "Reply to your inquiry"}`;
    const greeting = locale === "ja"
      ? `${inquiry.contact_name || "ご担当者"} 様\n\nお問い合わせありがとうございます。\n`
      : `Hello ${inquiry.contact_name || "there"},\n\nThank you for your inquiry.\n`;
    return `mailto:${encodeURIComponent(inquiry.contact_email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(greeting)}`;
  }, [inquiry, locale]);

  const actionButtons: Array<{ status: CreatorLinkInquiryStatus; label: string; className: string }> = [
    { status: "creator_reviewing", label: copy.start, className: "bg-amber-50 text-amber-900 ring-amber-100" },
    { status: "quoted", label: copy.quoted, className: "bg-violet-50 text-violet-800 ring-violet-100" },
    { status: "converted", label: copy.converted, className: "bg-emerald-50 text-emerald-800 ring-emerald-100" },
    { status: "declined", label: copy.declined, className: "bg-rose-50 text-rose-800 ring-rose-100" },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#f6f7f9] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <Link href="/creator/link/inquiries" className="flex min-h-11 items-center gap-1 rounded-full px-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 active:scale-[0.98]">
            <ArrowLeftIcon />
            {copy.back}
          </Link>
          <p className="text-sm font-black tracking-[-0.03em]">{copy.title}</p>
          <div className="w-[82px]" aria-hidden="true" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl space-y-4 px-4 pb-[max(32px,env(safe-area-inset-bottom))] pt-5">
        {loading ? (
          <>
            <div className="h-44 animate-pulse rounded-[28px] bg-white ring-1 ring-slate-100" />
            <div className="h-80 animate-pulse rounded-[28px] bg-white ring-1 ring-slate-100" />
          </>
        ) : error && !inquiry ? (
          <div className="rounded-[28px] bg-white px-6 py-10 text-center ring-1 ring-slate-100" role="alert">
            <p className="text-lg font-black">{copy.loadError}</p>
            <p className="mt-2 text-sm font-semibold text-slate-500">{error}</p>
            <button type="button" onClick={() => void load()} className="mt-5 min-h-11 rounded-full bg-slate-950 px-5 text-sm font-black text-white">{copy.retry}</button>
          </div>
        ) : inquiry ? (
          <>
            <section className="rounded-[28px] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.05)] ring-1 ring-slate-100">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black ring-1 ${statusClass(inquiry.status)}`}>
                  {statusLabel(inquiry.status, locale)}
                </span>
                <span className="text-[11px] font-bold text-slate-400">{copy.from}</span>
              </div>
              <h1 className="mt-4 text-[26px] font-black tracking-[-0.055em]">
                {inquiry.company_name || inquiry.contact_name || copy.title}
              </h1>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                {inquiry.inquiry_type_title_snapshot || inquiry.purpose || copy.title}
              </p>
              <a href={mailtoHref} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)] transition active:scale-[0.98]">
                <MailIcon />
                {copy.reply}
              </a>
            </section>

            <section className="rounded-[28px] bg-white p-5 ring-1 ring-slate-100">
              <DetailRow label={copy.company} value={inquiry.company_name} />
              <DetailRow label={copy.contact} value={inquiry.contact_name} />
              <DetailRow label={copy.email} value={inquiry.contact_email} />
              <DetailRow label={copy.product} value={inquiry.product_name} />
              <DetailRow label={copy.purpose} value={inquiry.purpose} />
              <DetailRow label={copy.message} value={inquiry.message} />
              <DetailRow label={copy.timing} value={inquiry.desired_timing} />
              <DetailRow label={copy.budget} value={inquiry.budget_text} />
              <DetailRow label={copy.platforms} value={platformLabel(inquiry.requested_platform, locale)} />
              <DetailRow label={copy.offer} value={offerLabel(inquiry.offer_type, locale)} />
              <DetailRow label={copy.received} value={formatDate(inquiry.created_at, locale)} />
            </section>

            <section className="rounded-[28px] bg-white p-5 ring-1 ring-slate-100">
              <h2 className="text-lg font-black tracking-[-0.04em]">{copy.statusHeading}</h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {actionButtons.map((action) => (
                  <button
                    key={action.status}
                    type="button"
                    disabled={savingStatus !== null || inquiry.status === action.status}
                    onClick={() => void updateStatus(action.status)}
                    className={`min-h-12 rounded-[18px] px-4 text-sm font-black ring-1 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 ${action.className}`}
                  >
                    {savingStatus === action.status ? copy.updating : action.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-[24px] bg-violet-50 p-4 text-violet-950 ring-1 ring-violet-100">
              <p className="text-sm font-black">{copy.hintTitle}</p>
              <p className="mt-1 text-xs font-semibold leading-6 text-violet-700">{copy.hintBody}</p>
            </section>

            {error ? (
              <p className="rounded-[20px] bg-rose-50 p-4 text-sm font-bold text-rose-800 ring-1 ring-rose-100" role="alert">{error}</p>
            ) : null}
          </>
        ) : null}
      </main>
    </div>
  );
}
