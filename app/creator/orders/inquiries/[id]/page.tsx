"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { CreatorInquiryQuote, CreatorInquiryQuoteResponse } from "@/lib/trendre-link/inquiry-quote";
import type { CreatorLinkInquiryDetailResponse, CreatorLinkInquiryListItem } from "@/lib/trendre-link/inquiry-inbox";

const valueLabels: Record<string, string> = {
  pr_post: "PR投稿", ugc: "UGC制作",
  visit_experience: "来店・体験", product_delivery: "商品提供", provided_assets: "素材提供",
  instagram: "Instagram", tiktok: "TikTok", x: "X", youtube: "YouTube", other: "その他",
  photo_image: "写真・画像素材", video: "動画素材",
  paid_ads: "広告で使用", owned_social: "自社SNSへ掲載",
  website_lp_ec: "自社Webサイト・LP・ECサイトへ掲載", digital_signage: "デジタルサイネージ・看板へ掲載",
  chat: "チャットで相談", in_person: "対面で打ち合わせ", online: "オンラインで打ち合わせ", not_needed: "打ち合わせ不要",
  awareness: "認知を広げたい", product_launch: "新商品を知ってほしい", sales: "購入につなげたい",
  store_visit: "来店を増やしたい", content_asset: "広告素材がほしい",
  feed_post: "フィード投稿", reel: "リール", stories: "ストーリーズ", live_stream: "ライブ配信",
  short_video: "ショート動画", standard_post: "通常投稿", thread_post: "スレッド投稿",
  video_post: "動画投稿", long_video: "長尺動画",
  feed: "フィード投稿", story: "ストーリーズ", photo: "写真素材", live: "ライブ配信",
  product_review: "商品レビュー", visit_event: "来店・体験",
  provided: "商品・サービスを提供する", not_provided: "提供なし", consult: "相談して決める",
  organic: "自社SNS・Webサイトで利用", none: "二次利用なし", undecided: "相談して決める",
};

function label(value: string | null | undefined) {
  return value ? valueLabels[value] ?? value : null;
}

function list(values: string[] | null | undefined) {
  return values?.length ? values.map((value) => label(value)).join(" / ") : null;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ja-JP", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatMoney(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const amount = typeof value === "number" ? value : Number(String(value).replace(/\D/g, ""));
  return Number.isFinite(amount) ? new Intl.NumberFormat("ja-JP", {
    style: "currency", currency: "JPY", maximumFractionDigits: 0,
  }).format(amount) : String(value);
}

function statusLabel(status: string) {
  if (status === "new") return "見積もりを作成してください";
  if (status === "creator_reviewing") return "確認中";
  if (status === "quoted") return "企業の回答待ち";
  if (status === "converted") return "成立済み";
  if (status === "declined") return "辞退済み";
  return status;
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

function deliverablesText(data: CreatorLinkInquiryListItem["request_data"] | undefined) {
  if (!data?.deliverables_by_platform) return null;
  return Object.entries(data.deliverables_by_platform).map(([platform, items]) => {
    const details = items.map((item) => `${item.type === "other" ? item.other_text || "その他" : label(item.type)} ${item.count}件`).join("、");
    return `${label(platform)}: ${details}`;
  }).join("\n");
}

export default function CreatorInquiryDetailPage() {
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
  const [declining, setDeclining] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [inquiryResponse, quoteResponse] = await Promise.all([
        fetch(`/api/creator/link/inquiries/${params.id}`, { cache: "no-store" }),
        fetch(`/api/creator/orders/inquiries/${params.id}/quote`, { cache: "no-store" }),
      ]);
      if (inquiryResponse.status === 401 || quoteResponse.status === 401) {
        window.location.assign(`/login?next=/creator/orders/inquiries/${params.id}`);
        return;
      }
      const inquiryBody = await inquiryResponse.json() as CreatorLinkInquiryDetailResponse;
      const quoteBody = await quoteResponse.json() as CreatorInquiryQuoteResponse;
      if (!inquiryResponse.ok || !inquiryBody.ok) throw new Error(inquiryBody.ok ? "依頼を読み込めませんでした。" : inquiryBody.error);
      setInquiry(inquiryBody.inquiry);
      if (quoteResponse.ok && quoteBody.ok) setQuote(quoteBody.quote);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "依頼を読み込めませんでした。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (params.id) void load(); }, [params.id]);

  const data = inquiry?.request_data;
  const requestMode = data?.request_mode;
  const requestType = useMemo(() => {
    if (!inquiry) return null;
    // Do not use inquiry_type_title_snapshot here: it is the form title
    // ("PR案件を依頼する"), not the request actually selected by the company.
    return label(requestMode || inquiry.purpose || inquiry.inquiry_type);
  }, [inquiry, requestMode]);
  const isNewPr = requestMode === "pr_post";
  const isNewUgc = requestMode === "ugc";

  const openQuote = () => {
    setAmount(quote ? String(quote.quoted_amount) : "");
    setNote(quote?.note ?? "");
    setFormError("");
    setSheetOpen(true);
  };

  const sendQuote = async () => {
    if (sending) return;
    if (!/^[1-9]\d*$/.test(amount) || Number(amount) < 1000) return setFormError("見積金額は1,000円以上の整数で入力してください。");
    setSending(true);
    setFormError("");
    try {
      const response = await fetch(`/api/creator/orders/inquiries/${params.id}/quote`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ quotedAmount: amount, note }),
      });
      const body = await response.json() as CreatorInquiryQuoteResponse;
      if (!response.ok || !body.ok || !body.quote) throw new Error(body.ok ? "見積もりを送信できませんでした。" : body.error);
      setQuote(body.quote);
      setInquiry((current) => current ? { ...current, status: "quoted" } : current);
      setSheetOpen(false);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "見積もりを送信できませんでした。");
    } finally {
      setSending(false);
    }
  };

  const decline = async () => {
    if (!inquiry || declining || !window.confirm("この依頼を辞退しますか？")) return;
    setDeclining(true);
    try {
      const response = await fetch(`/api/creator/link/inquiries/${inquiry.id}`, {
        method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "declined" }),
      });
      if (!response.ok) throw new Error();
      window.location.assign("/creator/orders");
    } catch {
      setError("辞退できませんでした。");
      setDeclining(false);
    }
  };

  const socials = data?.company_social_accounts;
  const socialDisplay = socials && Object.keys(socials).length
    ? Object.entries(socials).map(([platform, username]) => `${label(platform)}: ${username}`).join("\n")
    : null;
  const freeOfferDetails = data?.has_free_offer
    ? [
        data.free_offer_item,
        data.free_offer_quantity ? `数量: ${data.free_offer_quantity}` : null,
        data.free_offer_frequency ? `提供回数: ${data.free_offer_frequency}` : null,
        data.free_offer_people ? `対象人数: ${data.free_offer_people}` : null,
        data.free_offer_conditions,
      ].filter(Boolean).join("\n")
    : null;

  return (
    <div className="mx-auto w-full max-w-3xl pb-8 pt-1">
      <header className="flex h-12 items-center justify-between">
        <Link href="/creator/orders" aria-label="受注一覧へ戻る" className="flex h-10 w-10 items-center justify-center rounded-full text-xl">‹</Link>
        <h1 className="text-[14px] font-semibold">見積もり依頼</h1>
        <button type="button" onClick={() => void decline()} disabled={declining} className="px-2 text-[12px] font-medium text-rose-600 disabled:opacity-50">辞退</button>
      </header>

      {loading ? <div className="mt-4 h-64 animate-pulse rounded-[18px] bg-white ring-1 ring-slate-100" /> : error && !inquiry ? (
        <div className="mt-4 rounded-[18px] bg-white px-6 py-12 text-center ring-1 ring-slate-200"><p className="text-sm">{error}</p><button type="button" onClick={() => void load()} className="mt-5 rounded-full bg-slate-950 px-5 py-3 text-sm text-white">再読み込み</button></div>
      ) : inquiry ? <>
        <section className="px-1 pb-5 pt-3">
          <p className="text-[12px] text-slate-500">{statusLabel(inquiry.status)}</p>
          <h2 className="mt-3 text-[25px] font-semibold tracking-[-0.04em] text-slate-950">{inquiry.company_name || inquiry.contact_name}</h2>
          <p className="mt-2 text-[14px] text-slate-500">{[requestType, inquiry.product_name].filter(Boolean).join(" · ")}</p>
        </section>

        {quote ? <section className="mb-5 rounded-[18px] bg-slate-950 px-5 py-5 text-white">
          <div className="flex items-start justify-between"><div><p className="text-[11px] text-white/55">送信済みの見積もり</p><p className="mt-2 text-[27px] font-semibold">{formatMoney(quote.quoted_amount)}</p></div><span className="text-[11px] text-white/55">企業の回答待ち</span></div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4"><div><p className="text-[10px] text-white/45">企業の支払合計</p><p className="mt-1 text-[13px] font-semibold">{formatMoney(quote.buyer_total_amount)}</p></div><div><p className="text-[10px] text-white/45">受取予定額</p><p className="mt-1 text-[13px] font-semibold">{formatMoney(quote.creator_payout_amount)}</p></div></div>
          {quote.note ? <p className="mt-4 border-t border-white/10 pt-4 text-[12px] leading-6 text-white/75">企業への備考: {quote.note}</p> : null}
        </section> : null}

        <div className="space-y-5">
          <Section title="依頼内容">
            <Row name="依頼形式" value={requestType} />
            {isNewPr ? <Row name="案件タイプ" value={label(data?.project_type)} /> : null}
            {isNewPr ? <Row name="SNS" value={list(data?.requested_platforms) || label(data?.other_platform)} /> : null}
            {isNewPr ? <Row name="制作物・制作数" value={deliverablesText(data)} /> : null}
            {isNewUgc ? <Row name="制作物" value={[list(data?.ugc_deliverable_types), data?.ugc_other_deliverable].filter(Boolean).join(" / ")} /> : null}
            {isNewUgc ? <Row name="制作数" value={data?.deliverable_count ? `${data.deliverable_count}件` : null} /> : null}
            {isNewUgc ? <Row name="利用用途" value={[list(data?.usage_purposes), data?.usage_other].filter(Boolean).join(" / ")} /> : null}
            {isNewUgc ? <Row name="打ち合わせ" value={label(data?.meeting_method)} /> : null}
            {!requestMode ? <Row name="SNS" value={inquiry.requested_platform} /> : null}
            {!requestMode ? <Row name="制作物" value={list(data?.content_formats)} /> : null}
            {!requestMode ? <Row name="制作数" value={data?.deliverable_count ? `${data.deliverable_count}件` : null} /> : null}
          </Section>

          <Section title="商品・条件・予算">
            <Row name="商品・サービス" value={inquiry.product_name || data?.product_name} />
            <Row name="商品URL" value={data?.product_url} href={data?.product_url} />
            <Row name="希望時期" value={inquiry.desired_timing || data?.desired_timing} />
            <Row name="予算" value={formatMoney(inquiry.budget_text || data?.budget_text)} />
            {isNewPr ? <Row name="目的" value={[label(data?.campaign_goal), data?.campaign_goal_other].filter(Boolean).join(" / ")} /> : null}
            {!requestMode ? <Row name="目的" value={label(data?.campaign_goal)} /> : null}
            <Row name="無償提供" value={data?.has_free_offer !== undefined ? (data.has_free_offer ? "あり" : "なし") : label(inquiry.offer_type)} />
            <Row name="提供内容" value={freeOfferDetails} />
          </Section>

          {(data?.selling_points || data?.reference_url || data?.additional_notes || (!requestMode && (data?.key_message || inquiry.message))) ? <Section title="特徴・参考情報">
            <Row name="特徴・アピール" value={data?.selling_points || data?.key_message} />
            <Row name="参考URL" value={data?.reference_url} href={data?.reference_url} />
            <Row name="その他の補足" value={data?.additional_notes || inquiry.message} />
          </Section> : null}

          <Section title="企業情報">
            <Row name="会社・ブランド" value={inquiry.company_name} />
            <Row name="担当者" value={inquiry.contact_name} />
            <Row name="メール" value={inquiry.contact_email} />
            <Row name="Webサイト" value={data?.company_website} href={data?.company_website} />
            <Row name="企業SNS" value={socialDisplay} />
            <Row name="受信日時" value={formatDate(inquiry.created_at)} />
          </Section>
        </div>

        {error ? <p className="mt-4 text-[13px] text-rose-600">{error}</p> : null}
        {!["declined", "converted"].includes(inquiry.status) ? <div className="sticky bottom-[76px] z-20 mt-5 bg-gradient-to-t from-[#f6f7f9] via-[#f6f7f9] to-transparent pb-2 pt-6"><button type="button" onClick={openQuote} className="h-[52px] w-full rounded-full bg-slate-950 text-[14px] font-semibold text-white">{quote ? "見積もりを確認・編集" : "見積もりを作成"}</button></div> : null}
      </> : null}

      {sheetOpen ? <div className="fixed inset-0 z-[170] flex items-end justify-center bg-slate-950/40 backdrop-blur-[2px]">
        <button type="button" aria-label="閉じる" onClick={() => !sending && setSheetOpen(false)} className="absolute inset-0" />
        <section role="dialog" aria-modal="true" aria-label="見積もりを作成" className="relative z-10 w-full max-w-xl rounded-t-[26px] bg-white px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-3">
          <div className="mx-auto h-1 w-10 rounded-full bg-slate-200" />
          <div className="mt-4 flex items-center justify-between"><h2 className="text-[19px] font-semibold">見積もりを作成</h2><button type="button" onClick={() => setSheetOpen(false)} className="h-9 w-9 rounded-full bg-slate-100">×</button></div>
          <div className="mt-5 space-y-5">
            <label className="block"><span className="text-[13px] font-semibold">見積金額 <span className="text-rose-500">必須</span></span><div className="mt-2 flex h-[52px] items-center rounded-[14px] bg-slate-50 px-4 ring-1 ring-slate-200"><span className="mr-2 text-slate-400">¥</span><input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder="100000" className="min-w-0 flex-1 bg-transparent text-[20px] font-semibold outline-none" /></div><span className="mt-2 block text-[11px] text-slate-400">企業にはサービス手数料を加算した金額が表示されます。</span></label>
            <label className="block"><span className="text-[13px] font-semibold">企業への備考 <span className="text-slate-400">任意</span></span><textarea rows={4} value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} placeholder="企業へ伝えておきたいこと" className="mt-2 w-full resize-none rounded-[14px] bg-slate-50 px-4 py-3 text-[14px] leading-6 outline-none ring-1 ring-slate-200" /></label>
          </div>
          {formError ? <p role="alert" className="mt-4 text-[13px] text-rose-600">{formError}</p> : null}
          <button type="button" onClick={() => void sendQuote()} disabled={sending} className="mt-6 h-[52px] w-full rounded-full bg-slate-950 text-[14px] font-semibold text-white disabled:opacity-50">{sending ? "送信中…" : "見積もりを送信"}</button>
        </section>
      </div> : null}
    </div>
  );
}
