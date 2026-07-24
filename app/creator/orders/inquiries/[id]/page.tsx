"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAppLocale } from "@/lib/i18n/locale";
import type {
  CreatorInquiryQuote,
  CreatorInquiryQuoteResponse,
} from "@/lib/trendre-link/inquiry-quote";
import type {
  CreatorLinkInquiryDetailResponse,
  CreatorLinkInquiryListItem,
} from "@/lib/trendre-link/inquiry-inbox";

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="m15 5-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M8 5H5.5A1.5 1.5 0 0 0 4 6.5v8A1.5 1.5 0 0 0 5.5 16h8a1.5 1.5 0 0 0 1.5-1.5V12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M11 4h5v5M10 10l6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatDate(value: string, locale: "ja" | "en", withTime = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale === "ja" ? "ja-JP" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

function formatMoney(value: number, locale: "ja" | "en") {
  return new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatBudget(value: string | null, locale: "ja" | "en") {
  if (!value) return null;
  const normalized = value.replace(/[^0-9]/g, "");
  if (!normalized) return value;
  return formatMoney(Number(normalized), locale);
}

function requestTypeLabel(value: string | null, locale: "ja" | "en") {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  const labels = locale === "ja"
    ? {
        pr_post: "PR投稿",
        "pr post": "PR投稿",
        ugc: "UGC制作",
        "ugc production": "UGC制作",
        product_review: "商品レビュー",
        "product review": "商品レビュー",
        visit_event: "来店・体験",
        "store visit / experience": "来店・体験",
        other: "その他",
      }
    : {
        pr_post: "PR post",
        "pr post": "PR post",
        ugc: "UGC production",
        "ugc production": "UGC production",
        product_review: "Product review",
        "product review": "Product review",
        visit_event: "Visit / experience",
        "store visit / experience": "Visit / experience",
        other: "Other",
      };
  return (labels as Record<string, string>)[normalized] ?? value;
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
    .map((item) => labels[item.trim().toLowerCase()] ?? item.trim())
    .filter(Boolean)
    .join(" / ");
}

function offerLabel(value: string | null, locale: "ja" | "en") {
  if (!value) return null;
  const labels = locale === "ja"
    ? { provided: "商品提供あり", not_provided: "商品提供なし", consult: "相談して決める" }
    : { provided: "Product provided", not_provided: "No product", consult: "To discuss" };
  return (labels as Record<string, string>)[value] ?? value;
}

function formatContentFormats(values: string[] | undefined, locale: "ja" | "en") {
  if (!values?.length) return null;
  const labels = locale === "ja"
    ? {
        feed: "フィード投稿",
        reel: "リール",
        story: "ストーリーズ",
        short_video: "ショート動画",
        long_video: "長尺動画",
        photo: "写真素材",
        live: "ライブ配信",
        other: "その他",
      }
    : {
        feed: "Feed post",
        reel: "Reel",
        story: "Stories",
        short_video: "Short video",
        long_video: "Long video",
        photo: "Photo assets",
        live: "Live stream",
        other: "Other",
      };
  return values.map((value) => (labels as Record<string, string>)[value] ?? value).join(" / ");
}

function campaignGoalLabel(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return null;
  const labels = locale === "ja"
    ? {
        awareness: "認知を広げたい",
        product_launch: "新商品を知ってほしい",
        sales: "購入につなげたい",
        store_visit: "来店を増やしたい",
        content_asset: "広告素材がほしい",
        other: "その他",
      }
    : {
        awareness: "Build awareness",
        product_launch: "Launch a product",
        sales: "Drive sales",
        store_visit: "Increase visits",
        content_asset: "Create ad assets",
        other: "Other",
      };
  return (labels as Record<string, string>)[value] ?? value;
}

function usageRightsLabel(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return null;
  const labels = locale === "ja"
    ? {
        none: "二次利用なし",
        organic: "自社SNS・サイトで利用",
        paid_ads: "広告にも利用",
        undecided: "相談して決める",
      }
    : {
        none: "No secondary use",
        organic: "Brand channels and website",
        paid_ads: "Paid advertising",
        undecided: "To discuss",
      };
  return (labels as Record<string, string>)[value] ?? value;
}

function statusText(status: string, locale: "ja" | "en") {
  if (locale === "en") {
    if (status === "new") return "Create a quote";
    if (status === "creator_reviewing") return "Quote in progress";
    if (status === "quoted") return "Waiting for the company";
    if (status === "converted") return "Accepted";
    if (status === "declined") return "Declined";
    return "Review the request";
  }
  if (status === "new") return "見積もりを作成してください";
  if (status === "creator_reviewing") return "見積もりを作成中";
  if (status === "quoted") return "企業の回答を待っています";
  if (status === "converted") return "依頼が成立しました";
  if (status === "declined") return "辞退しました";
  return "依頼内容を確認してください";
}

function defaultValidDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

function toDateInput(value: string | null | undefined) {
  if (!value) return defaultValidDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? defaultValidDate()
    : date.toISOString().slice(0, 10);
}

function InfoRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number | null | undefined;
  href?: string | null;
}) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="grid grid-cols-[108px_minmax(0,1fr)] gap-3 px-4 py-3.5">
      <dt className="text-[12px] font-medium leading-6 text-slate-400">{label}</dt>
      <dd className="min-w-0 whitespace-pre-wrap break-words text-[14px] font-medium leading-6 text-slate-800">
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1.5 text-slate-950 underline decoration-slate-300 underline-offset-4">
            <span className="truncate">{String(value)}</span>
            <ExternalIcon />
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function InfoSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="px-1 pb-2 text-[13px] font-semibold text-slate-900">{title}</h2>
      <dl className="divide-y divide-slate-100 overflow-hidden rounded-[18px] bg-white shadow-[0_8px_26px_rgba(15,23,42,0.035)] ring-1 ring-slate-200/70">
        {children}
      </dl>
    </section>
  );
}

function buildSuggestedScope(inquiry: CreatorLinkInquiryListItem, locale: "ja" | "en") {
  const data = inquiry.request_data;
  const parts = [
    requestTypeLabel(inquiry.purpose || inquiry.inquiry_type, locale),
    platformLabel(inquiry.requested_platform, locale),
    formatContentFormats(data?.content_formats, locale),
    data?.deliverable_count
      ? locale === "ja"
        ? `${data.deliverable_count}件`
        : `${data.deliverable_count} deliverable${data.deliverable_count === 1 ? "" : "s"}`
      : null,
  ].filter(Boolean);
  return parts.join(" / ");
}

export default function CreatorInquiryOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { locale } = useAppLocale();
  const safeLocale: "ja" | "en" = locale === "en" ? "en" : "ja";
  const [inquiry, setInquiry] = useState<CreatorLinkInquiryListItem | null>(null);
  const [quote, setQuote] = useState<CreatorInquiryQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [sheetMounted, setSheetMounted] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [quotedAmount, setQuotedAmount] = useState("");
  const [scope, setScope] = useState("");
  const [deliveryText, setDeliveryText] = useState("");
  const [note, setNote] = useState("");
  const [validUntil, setValidUntil] = useState(defaultValidDate());
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const copy = safeLocale === "ja"
    ? {
        header: "見積もり依頼",
        back: "受注へ戻る",
        summary: "依頼概要",
        conditions: "制作条件",
        references: "商品・参考情報",
        companyInfo: "企業情報",
        requestType: "依頼内容",
        platforms: "希望SNS",
        formats: "制作物",
        count: "制作数",
        goal: "目的",
        product: "商品・サービス",
        timing: "希望時期",
        budget: "予算目安",
        offer: "商品提供",
        usage: "二次利用",
        keyMessage: "必ず伝えたいこと",
        details: "その他の補足",
        productUrl: "商品URL",
        referenceUrl: "参考URL",
        company: "会社・ブランド",
        contact: "担当者",
        email: "メールアドレス",
        received: "受信日時",
        createQuote: "見積もりを作成",
        editQuote: "見積もりを確認・編集",
        quoteTitle: "見積もりを作成",
        amount: "見積金額",
        amountHint: "企業にはサービス手数料を加算した金額が表示されます。",
        scope: "対応内容",
        scopePlaceholder: "制作物、投稿本数、修正回数などを入力",
        delivery: "実施・納品予定",
        deliveryPlaceholder: "例：商品到着後14日以内",
        note: "備考",
        notePlaceholder: "企業へ伝えておきたいことがあれば入力",
        validUntil: "有効期限",
        send: "企業へ送信",
        sending: "送信中…",
        quoteSent: "送信した見積もり",
        companyTotal: "企業のお支払い合計",
        yourPayout: "受取予定額",
        decline: "この依頼を辞退",
        declineTitle: "依頼を辞退しますか？",
        declineBody: "辞退すると、この依頼は受注一覧から外れます。",
        cancel: "キャンセル",
        confirmDecline: "辞退する",
        loadingError: "依頼内容を読み込めませんでした。",
        retry: "再読み込み",
      }
    : {
        header: "Quote request",
        back: "Back to orders",
        summary: "Request summary",
        conditions: "Production conditions",
        references: "Product and references",
        companyInfo: "Company information",
        requestType: "Request type",
        platforms: "Platforms",
        formats: "Deliverables",
        count: "Quantity",
        goal: "Goal",
        product: "Product / service",
        timing: "Preferred timing",
        budget: "Budget",
        offer: "Product offer",
        usage: "Secondary usage",
        keyMessage: "Must include",
        details: "Additional notes",
        productUrl: "Product URL",
        referenceUrl: "Reference URL",
        company: "Company / brand",
        contact: "Contact",
        email: "Email",
        received: "Received",
        createQuote: "Create quote",
        editQuote: "Review or edit quote",
        quoteTitle: "Create quote",
        amount: "Quote amount",
        amountHint: "A service fee will be added to the amount shown to the company.",
        scope: "What you will deliver",
        scopePlaceholder: "Deliverables, posts, revisions, and more",
        delivery: "Delivery schedule",
        deliveryPlaceholder: "For example: within 14 days of product arrival",
        note: "Note",
        notePlaceholder: "Anything the company should know",
        validUntil: "Valid until",
        send: "Send to company",
        sending: "Sending…",
        quoteSent: "Sent quote",
        companyTotal: "Company total",
        yourPayout: "Estimated payout",
        decline: "Decline this request",
        declineTitle: "Decline this request?",
        declineBody: "The request will be removed from your active orders.",
        cancel: "Cancel",
        confirmDecline: "Decline",
        loadingError: "Could not load the request.",
        retry: "Reload",
      };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [inquiryResult, quoteResult] = await Promise.all([
        fetch(`/api/creator/link/inquiries/${params.id}`, {
          credentials: "same-origin",
          cache: "no-store",
        }),
        fetch(`/api/creator/orders/inquiries/${params.id}/quote`, {
          credentials: "same-origin",
          cache: "no-store",
        }),
      ]);

      if (inquiryResult.status === 401 || quoteResult.status === 401) {
        window.location.assign(`/login?next=/creator/orders/inquiries/${params.id}`);
        return;
      }

      const inquiryBody = (await inquiryResult.json()) as CreatorLinkInquiryDetailResponse;
      const quoteBody = (await quoteResult.json()) as CreatorInquiryQuoteResponse;

      if (!inquiryResult.ok || !inquiryBody.ok) {
        throw new Error(inquiryBody.ok ? copy.loadingError : inquiryBody.error);
      }

      setInquiry(inquiryBody.inquiry);
      if (quoteResult.ok && quoteBody.ok) setQuote(quoteBody.quote);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : copy.loadingError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    if (!sheetMounted && !declineOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [declineOpen, sheetMounted]);

  const requestType = useMemo(
    () =>
      inquiry
        ? inquiry.inquiry_type_title_snapshot ||
          requestTypeLabel(inquiry.purpose || inquiry.inquiry_type, safeLocale)
        : null,
    [inquiry, safeLocale]
  );

  const openQuoteSheet = () => {
    if (!inquiry) return;
    if (quote) {
      setQuotedAmount(String(quote.quoted_amount));
      setScope(quote.scope);
      setDeliveryText(quote.delivery_text ?? "");
      setNote(quote.note ?? "");
      setValidUntil(toDateInput(quote.valid_until));
    } else {
      setQuotedAmount("");
      setScope(buildSuggestedScope(inquiry, safeLocale));
      setDeliveryText(inquiry.desired_timing ?? "");
      setNote("");
      setValidUntil(defaultValidDate());
    }
    setFormError(null);
    setSheetMounted(true);
    window.requestAnimationFrame(() => setSheetVisible(true));
  };

  const closeQuoteSheet = () => {
    if (sending) return;
    setSheetVisible(false);
    window.setTimeout(() => setSheetMounted(false), 240);
  };

  const sendQuote = async () => {
    if (sending) return;
    setSending(true);
    setFormError(null);
    try {
      const response = await fetch(`/api/creator/orders/inquiries/${params.id}/quote`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quotedAmount, scope, deliveryText, note, validUntil }),
      });
      const body = (await response.json()) as CreatorInquiryQuoteResponse;
      if (!response.ok || !body.ok || !body.quote) {
        throw new Error(body.ok ? "見積もりを送信できませんでした。" : body.error);
      }
      setQuote(body.quote);
      setInquiry((current) => (current ? { ...current, status: "quoted" } : current));
      setSheetVisible(false);
      window.setTimeout(() => setSheetMounted(false), 240);
    } catch (sendError) {
      setFormError(sendError instanceof Error ? sendError.message : "見積もりを送信できませんでした。");
    } finally {
      setSending(false);
    }
  };

  const decline = async () => {
    if (!inquiry || declining) return;
    setDeclining(true);
    try {
      const response = await fetch(`/api/creator/link/inquiries/${inquiry.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "declined" }),
      });
      const body = (await response.json()) as CreatorLinkInquiryDetailResponse;
      if (!response.ok || !body.ok) throw new Error("辞退できませんでした。");
      window.location.assign("/creator/orders");
    } catch (declineError) {
      setError(declineError instanceof Error ? declineError.message : "辞退できませんでした。");
      setDeclineOpen(false);
    } finally {
      setDeclining(false);
    }
  };

  const requestData = inquiry?.request_data;
  const contentFormats = formatContentFormats(requestData?.content_formats, safeLocale);
  const campaignGoal = campaignGoalLabel(requestData?.campaign_goal, safeLocale);
  const usageRights = usageRightsLabel(requestData?.usage_rights, safeLocale);

  return (
    <div className="mx-auto w-full max-w-3xl pb-8 pt-1">
      <div className="relative flex h-12 items-center justify-between">
        <Link href="/creator/orders" aria-label={copy.back} className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-slate-800 transition active:scale-90 active:bg-slate-100">
          <BackIcon />
        </Link>
        <p className="absolute left-1/2 -translate-x-1/2 text-[14px] font-semibold tracking-[-0.02em] text-slate-950">{copy.header}</p>
        <div className="relative">
          <button type="button" onClick={() => setMenuOpen((open) => !open)} className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition active:scale-90 active:bg-slate-100" aria-label="menu">
            <MoreIcon />
          </button>
          {menuOpen ? (
            <>
              <button type="button" aria-label="close" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-30 cursor-default" />
              <div className="absolute right-0 top-10 z-40 w-52 overflow-hidden rounded-[16px] bg-white py-1.5 shadow-[0_18px_50px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/70">
                <button type="button" onClick={() => { setMenuOpen(false); setDeclineOpen(true); }} className="w-full px-4 py-3 text-left text-[13px] font-medium text-[#d62845] transition active:bg-slate-50">
                  {copy.decline}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4 pt-4">
          <div className="h-24 animate-pulse rounded-[18px] bg-white ring-1 ring-slate-100" />
          <div className="h-64 animate-pulse rounded-[18px] bg-white ring-1 ring-slate-100" />
        </div>
      ) : error && !inquiry ? (
        <div className="mt-4 rounded-[20px] bg-white px-6 py-12 text-center ring-1 ring-slate-200/70">
          <p className="text-sm font-semibold text-slate-900">{error}</p>
          <button type="button" onClick={() => void load()} className="mt-5 min-h-11 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition active:scale-[0.97]">{copy.retry}</button>
        </div>
      ) : inquiry ? (
        <>
          <section className="px-1 pb-5 pt-3">
            <div className="flex items-center gap-2 text-[12px] font-medium text-slate-500">
              {inquiry.status === "new" ? <span className="h-2 w-2 rounded-full bg-[#ff304f]" /> : null}
              <span>{statusText(inquiry.status, safeLocale)}</span>
            </div>
            <h1 className="mt-3 text-[25px] font-semibold leading-tight tracking-[-0.045em] text-slate-950">
              {inquiry.company_name || inquiry.contact_name || copy.header}
            </h1>
            <p className="mt-2 text-[14px] leading-6 text-slate-500">
              {[requestType, inquiry.product_name].filter(Boolean).join(" · ")}
            </p>
          </section>

          {quote ? (
            <section className="mb-5 overflow-hidden rounded-[20px] bg-[radial-gradient(circle_at_top_right,_rgba(190,100,255,0.45),_transparent_45%),linear-gradient(135deg,#17121f,#101016)] px-5 py-5 text-white shadow-[0_16px_40px_rgba(24,18,31,0.2)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-medium text-white/55">{copy.quoteSent}</p>
                  <p className="mt-2 text-[27px] font-semibold tracking-[-0.05em]">{formatMoney(quote.quoted_amount, safeLocale)}</p>
                </div>
                <p className="pt-1 text-[11px] font-medium text-white/55">{statusText("quoted", safeLocale)}</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
                <div>
                  <p className="text-[10px] font-medium text-white/45">{copy.companyTotal}</p>
                  <p className="mt-1 text-[13px] font-semibold">{formatMoney(quote.buyer_total_amount, safeLocale)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-white/45">{copy.yourPayout}</p>
                  <p className="mt-1 text-[13px] font-semibold">{formatMoney(quote.creator_payout_amount, safeLocale)}</p>
                </div>
              </div>
            </section>
          ) : null}

          <div className="space-y-5">
            <InfoSection title={copy.summary}>
              <InfoRow label={copy.requestType} value={requestType} />
              <InfoRow label={copy.platforms} value={platformLabel(inquiry.requested_platform, safeLocale)} />
              <InfoRow label={copy.formats} value={contentFormats} />
              <InfoRow label={copy.count} value={requestData?.deliverable_count ? `${requestData.deliverable_count}${safeLocale === "ja" ? "件" : ""}` : null} />
              <InfoRow label={copy.goal} value={campaignGoal} />
            </InfoSection>

            <InfoSection title={copy.conditions}>
              <InfoRow label={copy.product} value={inquiry.product_name} />
              <InfoRow label={copy.timing} value={inquiry.desired_timing} />
              <InfoRow label={copy.budget} value={formatBudget(inquiry.budget_text, safeLocale)} />
              <InfoRow label={copy.offer} value={offerLabel(inquiry.offer_type, safeLocale)} />
              <InfoRow label={copy.usage} value={usageRights} />
            </InfoSection>

            {(requestData?.product_url || requestData?.reference_url || requestData?.key_message || inquiry.message) ? (
              <InfoSection title={copy.references}>
                <InfoRow label={copy.productUrl} value={requestData?.product_url} href={requestData?.product_url} />
                <InfoRow label={copy.referenceUrl} value={requestData?.reference_url} href={requestData?.reference_url} />
                <InfoRow label={copy.keyMessage} value={requestData?.key_message} />
                <InfoRow label={copy.details} value={inquiry.message} />
              </InfoSection>
            ) : null}

            <InfoSection title={copy.companyInfo}>
              <InfoRow label={copy.company} value={inquiry.company_name} />
              <InfoRow label={copy.contact} value={inquiry.contact_name} />
              <InfoRow label={copy.email} value={inquiry.contact_email} />
              <InfoRow label={copy.received} value={formatDate(inquiry.created_at, safeLocale, true)} />
            </InfoSection>
          </div>

          {error ? <p className="mt-4 px-1 text-[13px] font-medium text-[#d62845]">{error}</p> : null}

          {inquiry.status !== "declined" && inquiry.status !== "converted" ? (
            <div className="sticky bottom-[76px] z-20 mt-5 bg-gradient-to-t from-[#f6f7f9] via-[#f6f7f9] to-transparent pb-2 pt-6">
              <button type="button" onClick={openQuoteSheet} className="flex min-h-[52px] w-full items-center justify-center rounded-full bg-slate-950 px-5 text-[14px] font-semibold text-white shadow-[0_12px_28px_rgba(15,23,42,0.2)] transition duration-200 active:scale-[0.975] active:shadow-none">
                {quote ? copy.editQuote : copy.createQuote}
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      {sheetMounted ? (
        <div className="fixed inset-0 z-[160]">
          <button type="button" aria-label="close" onClick={closeQuoteSheet} className={`absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] transition-opacity duration-200 ${sheetVisible ? "opacity-100" : "opacity-0"}`} />
          <section className={`absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto rounded-t-[26px] bg-white px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-24px_80px_rgba(15,23,42,0.24)] transition-transform duration-300 ease-out ${sheetVisible ? "translate-y-0" : "translate-y-full"}`}>
            <div className="mx-auto h-1 w-10 rounded-full bg-slate-200" />
            <div className="mt-3 flex items-center justify-between">
              <h2 className="text-[19px] font-semibold tracking-[-0.035em] text-slate-950">{copy.quoteTitle}</h2>
              <button type="button" onClick={closeQuoteSheet} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition active:scale-90">
                <CloseIcon />
              </button>
            </div>

            <div className="mt-5 space-y-5">
              <label className="block">
                <span className="text-[13px] font-semibold text-slate-900">{copy.amount}</span>
                <div className="mt-2 flex h-[52px] items-center rounded-[14px] bg-slate-50 px-4 ring-1 ring-slate-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-950/20">
                  <span className="mr-2 text-lg font-medium text-slate-400">¥</span>
                  <input value={quotedAmount} onChange={(event) => setQuotedAmount(event.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder="100000" className="min-w-0 flex-1 bg-transparent text-[20px] font-semibold tracking-[-0.03em] text-slate-950 outline-none placeholder:text-slate-300" />
                </div>
                <span className="mt-2 block text-[11px] leading-5 text-slate-400">{copy.amountHint}</span>
              </label>

              <label className="block">
                <span className="text-[13px] font-semibold text-slate-900">{copy.scope}</span>
                <textarea value={scope} onChange={(event) => setScope(event.target.value)} rows={4} placeholder={copy.scopePlaceholder} className="mt-2 w-full resize-none rounded-[14px] bg-slate-50 px-4 py-3 text-[14px] leading-6 text-slate-900 outline-none ring-1 ring-slate-200 transition focus:bg-white focus:ring-2 focus:ring-slate-950/20" />
              </label>

              <label className="block">
                <span className="text-[13px] font-semibold text-slate-900">{copy.delivery}</span>
                <input value={deliveryText} onChange={(event) => setDeliveryText(event.target.value)} placeholder={copy.deliveryPlaceholder} className="mt-2 h-12 w-full rounded-[14px] bg-slate-50 px-4 text-[14px] text-slate-900 outline-none ring-1 ring-slate-200 transition focus:bg-white focus:ring-2 focus:ring-slate-950/20" />
              </label>

              <label className="block">
                <span className="text-[13px] font-semibold text-slate-900">{copy.note}</span>
                <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder={copy.notePlaceholder} className="mt-2 w-full resize-none rounded-[14px] bg-slate-50 px-4 py-3 text-[14px] leading-6 text-slate-900 outline-none ring-1 ring-slate-200 transition focus:bg-white focus:ring-2 focus:ring-slate-950/20" />
              </label>

              <label className="block">
                <span className="text-[13px] font-semibold text-slate-900">{copy.validUntil}</span>
                <input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} className="mt-2 h-12 w-full rounded-[14px] bg-slate-50 px-4 text-[14px] text-slate-900 outline-none ring-1 ring-slate-200 transition focus:bg-white focus:ring-2 focus:ring-slate-950/20" />
              </label>
            </div>

            {formError ? <p className="mt-4 text-[13px] font-medium text-[#d62845]">{formError}</p> : null}

            <button type="button" onClick={() => void sendQuote()} disabled={sending} className="mt-6 flex min-h-[52px] w-full items-center justify-center rounded-full bg-slate-950 px-5 text-[14px] font-semibold text-white shadow-[0_12px_28px_rgba(15,23,42,0.18)] transition active:scale-[0.975] disabled:opacity-50">
              {sending ? copy.sending : copy.send}
            </button>
          </section>
        </div>
      ) : null}

      {declineOpen ? (
        <div className="fixed inset-0 z-[170] flex items-end justify-center bg-slate-950/40 px-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-[2px]">
          <button type="button" aria-label="close" onClick={() => setDeclineOpen(false)} className="absolute inset-0" />
          <section className="relative z-10 w-full max-w-md rounded-[22px] bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
            <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-slate-950">{copy.declineTitle}</h2>
            <p className="mt-2 text-[13px] leading-6 text-slate-500">{copy.declineBody}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setDeclineOpen(false)} className="min-h-12 rounded-full bg-slate-100 px-4 text-[13px] font-semibold text-slate-700 transition active:scale-[0.97]">{copy.cancel}</button>
              <button type="button" onClick={() => void decline()} disabled={declining} className="min-h-12 rounded-full bg-[#e22645] px-4 text-[13px] font-semibold text-white transition active:scale-[0.97] disabled:opacity-50">{copy.confirmDecline}</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
