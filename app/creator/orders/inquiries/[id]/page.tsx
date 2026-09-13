"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type {
  CreatorInquiryQuote,
  CreatorInquiryQuoteNotification,
  CreatorInquiryQuoteResponse,
} from "@/lib/trendre-link/inquiry-quote";
import type { CreatorLinkInquiryDetailResponse, CreatorLinkInquiryListItem } from "@/lib/trendre-link/inquiry-inbox";
import { useCreatorOnlyRelease } from "../../../CreatorReleaseMode";
import { useAppLocale } from "@/lib/i18n/locale";
import type { AppLocale } from "@/lib/i18n/types";
import { creatorLocaleTags } from "@/lib/i18n/creatorDashboard";
import { creatorInquiryDictionary, creatorInquiryValueLabels, creatorQuoteStatusDictionary } from "@/lib/i18n/creatorOrders";

function label(value: string | null | undefined, locale:AppLocale) {
  return value ? creatorInquiryValueLabels[locale][value] ?? value : null;
}

function list(values: string[] | null | undefined,locale:AppLocale) {
  return values?.length ? values.map((value) => label(value,locale)).join(" / ") : null;
}

function formatDate(value: string,locale:AppLocale) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(creatorLocaleTags[locale], {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatMoney(value: number | string | null | undefined,locale:AppLocale) {
  if (value === null || value === undefined || value === "") return null;
  const amount = typeof value === "number" ? value : Number(String(value).replace(/\D/g, ""));
  return Number.isFinite(amount) ? new Intl.NumberFormat(creatorLocaleTags[locale], {
    style: "currency", currency: "JPY", maximumFractionDigits: 0,
  }).format(amount) : String(value);
}

function safeReplyMailto(email: string | null | undefined,subjectText:string) {
  const normalized = email?.trim() ?? "";
  if (!/^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i.test(normalized)) return null;
  const address = encodeURIComponent(normalized).replace(/%40/i, "@");
  const subject = encodeURIComponent(subjectText);
  return `mailto:${address}?subject=${subject}`;
}

function statusLabel(status: string,locale:AppLocale) {
  const labels={ja:{new:"見積もりを作成してください",creator_reviewing:"確認中",quoted:"企業の回答待ち",converted:"成立済み",declined:"辞退済み"},en:{new:"Create a quote",creator_reviewing:"Reviewing",quoted:"Waiting for the company",converted:"Converted",declined:"Declined"},ko:{new:"견적을 작성해 주세요",creator_reviewing:"확인 중",quoted:"브랜드 답변 대기 중",converted:"협업 성사",declined:"거절 완료"},"zh-TW":{new:"請建立報價",creator_reviewing:"確認中",quoted:"等待品牌回覆",converted:"合作已成立",declined:"已婉拒"}}[locale];
  return labels[status as keyof typeof labels] ?? status;
}

function quoteStatusLabel(status: string,locale:AppLocale) {
  return creatorQuoteStatusDictionary[locale][status] ?? creatorQuoteStatusDictionary[locale].quoted;
}

function quoteCardClass(status: string) {
  if (status === "accepted") return "bg-emerald-950";
  if (status === "declined") return "bg-slate-700";
  if (status === "expired") return "bg-amber-900";
  if (status === "cancelled") return "bg-slate-500";
  return "bg-slate-950";
}

function Row({ name, value, href }: { name: string; value: React.ReactNode; href?: string | null }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="grid grid-cols-[108px_minmax(0,1fr)] gap-3 px-4 py-3.5">
      <dt className="text-[12px] leading-6 text-slate-400">{name}</dt>
      <dd className="min-w-0 whitespace-pre-wrap break-words text-[14px] font-medium leading-6 text-slate-800">
        {href ? <a href={href} target="_blank" rel="noreferrer" className="underline decoration-slate-300 underline-offset-4">{value}</a> : value}
      </dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const present = Array.isArray(children) ? children.some(Boolean) : Boolean(children);
  if (!present) return null;
  return <section><h2 className="px-1 pb-2 text-[13px] font-semibold text-slate-900">{title}</h2><dl className="divide-y divide-slate-100 overflow-hidden rounded-[16px] bg-white ring-1 ring-slate-200/70">{children}</dl></section>;
}

function deliverablesText(data: CreatorLinkInquiryListItem["request_data"] | undefined,locale:AppLocale) {
  if (!data?.deliverables_by_platform) return null;
  return Object.entries(data.deliverables_by_platform).map(([platform, items]) => {
    const details = items.map((item) => `${item.type === "other" ? item.other_text || creatorInquiryValueLabels[locale].other : label(item.type,locale)} ${creatorInquiryDictionary[locale].itemCount(item.count)}`).join("、");
    return `${label(platform,locale)}: ${details}`;
  }).join("\n");
}

export default function CreatorInquiryDetailPage() {
  const {locale}=useAppLocale();
  const copy=creatorInquiryDictionary[locale];
  const isCreatorOnly = useCreatorOnlyRelease();
  const params = useParams<{ id: string }>();
  const [inquiry, setInquiry] = useState<CreatorLinkInquiryListItem | null>(null);
  const [quote, setQuote] = useState<CreatorInquiryQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");
  const [sendNotice, setSendNotice] = useState("");
  const [sendNoticeWarning, setSendNoticeWarning] = useState(false);
  const [notification, setNotification] = useState<CreatorInquiryQuoteNotification | null>(null);
  const [resending, setResending] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [blockedInquiryId, setBlockedInquiryId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    let loadedInquiry: CreatorLinkInquiryListItem | null = null;
    try {
      const inquiryResponse = await fetch(`/api/creator/link/inquiries/${params.id}`, { cache: "no-store" });
      if (inquiryResponse.status === 401) {
        window.location.assign(`/login?next=/creator/orders/inquiries/${params.id}`);
        return;
      }
      const inquiryBody = await inquiryResponse.json() as CreatorLinkInquiryDetailResponse;
      if (!inquiryResponse.ok || !inquiryBody.ok) throw new Error(inquiryBody.ok ? copy.loadFailed : inquiryBody.error);
      loadedInquiry = inquiryBody.inquiry;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.loadFailed);
      setLoading(false);
      return;
    }

    if (!loadedInquiry) {
      setLoading(false);
      return;
    }
    if (isCreatorOnly && loadedInquiry.inquiry_type !== "other") {
      setBlockedInquiryId(params.id);
      setLoading(false);
      return;
    }

    try {
      setInquiry(loadedInquiry);
      const quoteResponse = await fetch(`/api/creator/orders/inquiries/${params.id}/quote`, { cache: "no-store" });
      if (quoteResponse.status === 401) {
        window.location.assign(`/login?next=/creator/orders/inquiries/${params.id}`);
        return;
      }
      const quoteBody = await quoteResponse.json() as CreatorInquiryQuoteResponse;
      if (quoteResponse.ok && quoteBody.ok) {
        setQuote(quoteBody.quote);
        setNotification(quoteBody.notification ?? null);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (params.id) void load(); }, [isCreatorOnly, params.id]);

  if (blockedInquiryId === params.id) notFound();

  const data = inquiry?.request_data;
  const requestMode = data?.request_mode;
  const requestType = useMemo(() => {
    if (!inquiry) return null;
    // Do not use inquiry_type_title_snapshot here: it is the form title
    // ("PR案件を依頼する"), not the request actually selected by the company.
    return label(requestMode || inquiry.purpose || inquiry.inquiry_type,locale);
  }, [inquiry, locale, requestMode]);
  const isNewPr = requestMode === "pr_post";
  const isNewUgc = requestMode === "ugc";
  const effectiveQuoteStatus = useMemo(() => {
    if (!quote) return null;
    if (quote.status === "sent") {
      const expiry = new Date(quote.valid_until).getTime();
      if (!Number.isNaN(expiry) && expiry <= Date.now()) return "expired";
    }
    return quote.status;
  }, [quote]);
  const isSimpleLinkInquiry = inquiry?.inquiry_type === "other";
  const isCreatorOnlySimpleInquiry = isCreatorOnly && isSimpleLinkInquiry;
  const canManageQuote = !isSimpleLinkInquiry && (!effectiveQuoteStatus || effectiveQuoteStatus === "sent");
  const replyMailto = safeReplyMailto(inquiry?.contact_email,copy.mailSubject);

  const openQuote = () => {
    if (!canManageQuote) return;
    setAmount(quote ? String(quote.quoted_amount) : "");
    setNote(quote?.note ?? "");
    setFormError("");
    setSheetOpen(true);
  };

  const sendQuote = async () => {
    if (sending) return;
    if (!canManageQuote) return setFormError(copy.quoteLocked);
    if (!/^[1-9]\d*$/.test(amount) || Number(amount) < 1000) return setFormError(copy.quoteInvalid);
    setSending(true);
    setFormError("");
    setSendNotice("");
    try {
      const response = await fetch(`/api/creator/orders/inquiries/${params.id}/quote`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ quotedAmount: amount, note }),
      });
      const body = await response.json() as CreatorInquiryQuoteResponse;
      if (!response.ok || !body.ok || !body.quote) throw new Error(body.ok ? copy.quoteFailed : body.error);
      setQuote(body.quote);
      setInquiry((current) => current ? { ...current, status: "quoted" } : current);
      const notificationFailed =
        body.notification?.status === "failed" ||
        body.notification?.status === "not_configured";
      setSendNoticeWarning(notificationFailed);
      setNotification(body.notification ?? null);
      setSendNotice(
        notificationFailed
          ? copy.quoteSavedMailFailed
          : copy.quoteSent
      );
      setSheetOpen(false);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : copy.quoteFailed);
    } finally {
      setSending(false);
    }
  };

  const resendNotification = async () => {
    if (resending || effectiveQuoteStatus !== "sent") return;
    setResending(true);
    setSendNotice("");
    try {
      const response = await fetch(`/api/creator/orders/inquiries/${params.id}/quote`, {
        method: "PATCH",
      });
      const body = await response.json() as CreatorInquiryQuoteResponse;
      if (!response.ok || !body.ok || !body.notification) throw new Error();
      setNotification(body.notification);
      setSendNoticeWarning(!body.notification.sent);
      setSendNotice(
        body.notification.sent
          ? copy.mailResent
          : copy.mailFailed
      );
    } catch {
      setSendNoticeWarning(true);
      setSendNotice(copy.mailFailed);
    } finally {
      setResending(false);
    }
  };

  const decline = async () => {
    if (!inquiry || declining || !canManageQuote || !window.confirm(copy.declineConfirm)) return;
    setDeclining(true);
    try {
      const response = await fetch(`/api/creator/link/inquiries/${inquiry.id}`, {
        method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "declined" }),
      });
      if (!response.ok) throw new Error();
      window.location.assign("/creator/orders");
    } catch {
      setError(copy.declineFailed);
      setDeclining(false);
    }
  };

  const socials = data?.company_social_accounts;
  const socialDisplay = socials && Object.keys(socials).length
    ? Object.entries(socials).map(([platform, username]) => `${label(platform,locale)}: ${username}`).join("\n")
    : null;
  const freeOfferDetails = data?.has_free_offer
    ? [
        data.free_offer_item,
        data.free_offer_quantity ? copy.quantity(data.free_offer_quantity) : null,
        data.free_offer_frequency ? copy.frequency(data.free_offer_frequency) : null,
        data.free_offer_people ? copy.people(data.free_offer_people) : null,
        data.free_offer_conditions,
      ].filter(Boolean).join("\n")
    : null;

  return (
    <div className="mx-auto w-full max-w-3xl pb-8 pt-1">
      <header className="flex h-12 items-center justify-between">
        <Link href="/creator/orders" aria-label={copy.back} className="flex h-10 w-10 items-center justify-center rounded-full text-xl">‹</Link>
        <h1 className="text-[14px] font-semibold">{isCreatorOnlySimpleInquiry ? copy.simpleTitle : copy.title}</h1>
        {inquiry && canManageQuote && !["declined", "converted"].includes(inquiry.status) ? (
          <button type="button" onClick={() => void decline()} disabled={declining} className="px-2 text-[12px] font-medium text-rose-600 disabled:opacity-50">{copy.decline}</button>
        ) : <span className="w-10" />}
      </header>

      {loading ? <div className="mt-4 h-64 animate-pulse rounded-[18px] bg-white ring-1 ring-slate-100" /> : error && !inquiry ? (
        <div className="mt-4 rounded-[18px] bg-white px-6 py-12 text-center ring-1 ring-slate-200"><p className="text-sm">{error}</p><button type="button" onClick={() => void load()} className="mt-5 rounded-full bg-slate-950 px-5 py-3 text-sm text-white">{copy.reload}</button></div>
      ) : inquiry ? <>
        <section className="px-1 pb-5 pt-3">
          <p className="text-[12px] text-slate-500">{isSimpleLinkInquiry ? copy.newInquiry : quote && effectiveQuoteStatus ? quoteStatusLabel(effectiveQuoteStatus,locale) : statusLabel(inquiry.status,locale)}</p>
          <h2 className="mt-3 text-[25px] font-semibold tracking-[-0.04em] text-slate-950">{inquiry.company_name || inquiry.contact_name}</h2>
          {!isCreatorOnlySimpleInquiry ? <p className="mt-2 text-[14px] text-slate-500">{[requestType, inquiry.product_name].filter(Boolean).join(" · ")}</p> : null}
        </section>

        {quote && !isSimpleLinkInquiry ? <section className={`mb-5 rounded-[18px] px-5 py-5 text-white ${quoteCardClass(effectiveQuoteStatus || quote.status)}`}>
          <div className="flex items-start justify-between"><div><p className="text-[11px] text-white/55">{copy.sentQuote}</p><p className="mt-2 text-[27px] font-semibold">{formatMoney(quote.quoted_amount,locale)}</p></div><span className="max-w-[150px] text-right text-[11px] leading-5 text-white/70">{quoteStatusLabel(effectiveQuoteStatus || quote.status,locale)}</span></div>
          <div className="mt-4 border-t border-white/10 pt-4"><p className="text-[10px] text-white/45">{copy.expected}</p><p className="mt-1 text-[13px] font-semibold">{formatMoney(quote.creator_payout_amount,locale)}</p></div>
          {quote.note ? <p className="mt-4 border-t border-white/10 pt-4 text-[12px] leading-6 text-white/75">{copy.note}: {quote.note}</p> : null}
        </section> : null}

        <div className="space-y-5">
          {isCreatorOnlySimpleInquiry ? <>
            <Section title={copy.inquiry}>
              <Row name={copy.subject} value={inquiry.purpose} />
              <Row name={copy.inquiryBody} value={inquiry.message} />
            </Section>
            <Section title={copy.sender}>
              <Row name={copy.name} value={inquiry.contact_name} />
              <Row name={copy.email} value={inquiry.contact_email} />
              <Row name={copy.received} value={formatDate(inquiry.created_at,locale)} />
            </Section>
            {replyMailto ? <a href={replyMailto} className="flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-[14px] font-semibold text-slate-800">{copy.replyMail}</a> : null}
          </> : <>
            <Section title={copy.request}>
              <Row name={copy.requestMode} value={requestType} />
              {isNewPr ? <Row name={copy.projectType} value={label(data?.project_type,locale)} /> : null}
              {isNewPr ? <Row name={copy.sns} value={list(data?.requested_platforms,locale) || label(data?.other_platform,locale)} /> : null}
              {isNewPr ? <Row name={copy.deliverables} value={deliverablesText(data,locale)} /> : null}
              {isNewUgc ? <Row name={copy.deliverable} value={[list(data?.ugc_deliverable_types,locale), data?.ugc_other_deliverable].filter(Boolean).join(" / ")} /> : null}
              {isNewUgc ? <Row name={copy.count} value={data?.deliverable_count ? copy.itemCount(data.deliverable_count) : null} /> : null}
              {isNewUgc ? <Row name={copy.usage} value={[list(data?.usage_purposes,locale), data?.usage_other].filter(Boolean).join(" / ")} /> : null}
              {isNewUgc ? <Row name={copy.meeting} value={label(data?.meeting_method,locale)} /> : null}
              {!requestMode ? <Row name={copy.sns} value={inquiry.requested_platform} /> : null}
              {!requestMode ? <Row name={copy.deliverable} value={list(data?.content_formats,locale)} /> : null}
              {!requestMode ? <Row name={copy.count} value={data?.deliverable_count ? copy.itemCount(data.deliverable_count) : null} /> : null}
            </Section>

            <Section title={copy.conditions}>
              <Row name={copy.product} value={inquiry.product_name || data?.product_name} />
              <Row name={copy.productUrl} value={data?.product_url} href={data?.product_url} />
              <Row name={copy.timing} value={inquiry.desired_timing || data?.desired_timing} />
              <Row name={copy.budget} value={formatMoney(inquiry.budget_text || data?.budget_text,locale)} />
              {isNewPr ? <Row name={copy.goal} value={[label(data?.campaign_goal,locale), data?.campaign_goal_other].filter(Boolean).join(" / ")} /> : null}
              {!requestMode ? <Row name={copy.goal} value={label(data?.campaign_goal,locale)} /> : null}
              <Row name={copy.freeOffer} value={data?.has_free_offer !== undefined ? (data.has_free_offer ? copy.yes : copy.no) : label(inquiry.offer_type,locale)} />
              <Row name={copy.offerDetails} value={freeOfferDetails} />
            </Section>

            {(data?.selling_points || data?.reference_url || data?.additional_notes || (!requestMode && (data?.key_message || inquiry.message))) ? <Section title={copy.references}>
              <Row name={copy.sellingPoints} value={data?.selling_points || data?.key_message} />
              <Row name={copy.referenceUrl} value={data?.reference_url} href={data?.reference_url} />
              <Row name={copy.additional} value={data?.additional_notes || inquiry.message} />
            </Section> : null}

            <Section title={copy.company}>
              <Row name={copy.companyBrand} value={inquiry.company_name} />
              <Row name={copy.contact} value={inquiry.contact_name} />
              <Row name={copy.email} value={inquiry.contact_email} />
              <Row name={copy.website} value={data?.company_website} href={data?.company_website} />
              <Row name={copy.companySns} value={socialDisplay} />
              <Row name={copy.received} value={formatDate(inquiry.created_at,locale)} />
            </Section>
            {isSimpleLinkInquiry && replyMailto ? <a href={replyMailto} className="flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-[14px] font-semibold text-slate-800">{copy.replyMail}</a> : null}
          </>}
        </div>

        {sendNotice ? (
          <p
            role="status"
            className={`mt-4 rounded-[14px] px-4 py-3 text-[13px] ${
              sendNoticeWarning
                ? "bg-amber-50 text-amber-800"
                : "bg-emerald-50 text-emerald-800"
            }`}
          >
            {sendNotice}
          </p>
        ) : null}
        {quote && effectiveQuoteStatus === "sent" && notification && !notification.sent ? (
          <button
            type="button"
            onClick={() => void resendNotification()}
            disabled={resending}
            className="mt-3 w-full rounded-full bg-white px-5 py-3 text-[13px] font-semibold text-slate-800 ring-1 ring-slate-200 disabled:opacity-50"
          >
            {resending ? copy.resending : copy.resend}
          </button>
        ) : null}
        {error ? <p className="mt-4 text-[13px] text-rose-600">{error}</p> : null}
        {!['declined', 'converted'].includes(inquiry.status) && canManageQuote ? <div className="sticky bottom-[76px] z-20 mt-5 bg-gradient-to-t from-[#f6f7f9] via-[#f6f7f9] to-transparent pb-2 pt-6"><button type="button" onClick={openQuote} className="h-[52px] w-full rounded-full bg-slate-950 text-[14px] font-semibold text-white">{quote ? copy.editQuote : copy.createQuote}</button></div> : null}
      </> : null}

      {sheetOpen ? <div className="fixed inset-0 z-[170] flex items-end justify-center bg-slate-950/40 backdrop-blur-[2px]">
        <button type="button" aria-label={copy.close} onClick={() => !sending && setSheetOpen(false)} className="absolute inset-0" />
        <section role="dialog" aria-modal="true" aria-label={copy.createQuote} className="relative z-10 w-full max-w-xl rounded-t-[26px] bg-white px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-3">
          <div className="mx-auto h-1 w-10 rounded-full bg-slate-200" />
          <div className="mt-4 flex items-center justify-between"><h2 className="text-[19px] font-semibold">{copy.createQuote}</h2><button type="button" aria-label={copy.close} onClick={() => setSheetOpen(false)} className="h-9 w-9 rounded-full bg-slate-100">×</button></div>
          <div className="mt-5 space-y-5">
            <label className="block"><span className="text-[13px] font-semibold">{copy.amount} <span className="text-rose-500">{copy.required}</span></span><div className="mt-2 flex h-[52px] items-center rounded-[14px] bg-slate-50 px-4 ring-1 ring-slate-200"><span className="mr-2 text-slate-400">¥</span><input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder="100000" className="min-w-0 flex-1 bg-transparent text-[20px] font-semibold outline-none" /></div><span className="mt-2 block text-[11px] text-slate-400">{copy.feeNote}</span></label>
            <label className="block"><span className="text-[13px] font-semibold">{copy.note} <span className="text-slate-400">{copy.optional}</span></span><textarea rows={4} value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} placeholder={copy.notePlaceholder} className="mt-2 w-full resize-none rounded-[14px] bg-slate-50 px-4 py-3 text-[14px] leading-6 outline-none ring-1 ring-slate-200" /></label>
          </div>
          {formError ? <p role="alert" className="mt-4 text-[13px] text-rose-600">{formError}</p> : null}
          <button type="button" onClick={() => void sendQuote()} disabled={sending} className="mt-6 h-[52px] w-full rounded-full bg-slate-950 text-[14px] font-semibold text-white disabled:opacity-50">{sending ? copy.sending : copy.send}</button>
        </section>
      </div> : null}
    </div>
  );
}
