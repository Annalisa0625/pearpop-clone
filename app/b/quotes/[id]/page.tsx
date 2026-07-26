import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { calculateOrderFees } from "@/lib/orders/fees";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { UUID_PATTERN } from "@/lib/trendre-link/items-server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type PageProps = { params: Promise<{ id: string }> };
type Data = Record<string, any>;

const LABELS: Record<string, string> = {
  pr_post: "PR投稿",
  ugc: "UGC制作",
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X",
  youtube: "YouTube",
  other: "その他",
  feed_post: "フィード投稿",
  reel: "リール",
  stories: "ストーリーズ",
  live_stream: "ライブ配信",
  short_video: "ショート動画",
  standard_post: "通常投稿",
  thread_post: "スレッド投稿",
  video_post: "動画投稿",
  long_video: "長尺動画",
  photo_image: "写真・画像素材",
  video: "動画素材",
  provided: "あり",
  not_provided: "なし",
};

function label(value: unknown) {
  return typeof value === "string" && value ? LABELS[value] ?? value : null;
}

function joinLabels(value: unknown) {
  return Array.isArray(value) && value.length
    ? value.map(label).filter(Boolean).join(" / ")
    : null;
}

function money(value: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);
}

function snapshotAmount(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

function DetailRow({ title, value }: { title: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-4 border-t border-slate-100 px-4 py-4 first:border-t-0">
      <dt className="text-xs leading-6 text-slate-400">{title}</dt>
      <dd className="min-w-0 whitespace-pre-wrap break-words text-sm font-medium leading-6 text-slate-800">
        {value}
      </dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-sm font-bold text-slate-950">{title}</h2>
      <dl className="overflow-hidden rounded-[18px] bg-white ring-1 ring-slate-200/70">
        {children}
      </dl>
    </section>
  );
}

function deliverables(data: Data) {
  if (data.deliverables_by_platform && typeof data.deliverables_by_platform === "object") {
    return Object.entries(data.deliverables_by_platform)
      .map(([platform, rawItems]) => {
        const items = Array.isArray(rawItems) ? rawItems : [];
        const details = items
          .map((item: Data) => {
            const name = item.type === "other" ? item.other_text || "その他" : label(item.type);
            return `${name} ${item.count ?? 1}件`;
          })
          .join("、");
        return `${label(platform)}: ${details}`;
      })
      .join("\n");
  }
  const kinds = joinLabels(data.ugc_deliverable_types || data.content_formats);
  const count = data.deliverable_count ? `${data.deliverable_count}件` : null;
  return [kinds, count].filter(Boolean).join(" / ") || null;
}

function freeOffer(data: Data, inquiry: Data) {
  const enabled =
    typeof data.has_free_offer === "boolean"
      ? data.has_free_offer
      : inquiry.offer_type === "provided";
  if (!enabled) return label(inquiry.offer_type) || "なし";
  return [
    data.free_offer_item,
    data.free_offer_quantity ? `数量: ${data.free_offer_quantity}` : null,
    data.free_offer_frequency ? `提供回数: ${data.free_offer_frequency}` : null,
    data.free_offer_people ? `対象人数: ${data.free_offer_people}` : null,
    data.free_offer_conditions,
  ]
    .filter(Boolean)
    .join("\n");
}

export default async function CompanyQuotePage({ params }: PageProps) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/b/quotes/${id}`)}`);

  const admin = supabaseAdmin as any;

  // Verify the current user-to-access grant before loading the quote or inquiry.
  const { data: access, error: accessError } = await admin
    .from("creator_inquiry_quote_access")
    .select("inquiry_id,quote_id")
    .eq("quote_id", id)
    .eq("user_id", user.id)
    .not("claimed_at", "is", null)
    .maybeSingle();
  if (accessError || !access) notFound();

  const [{ data: quote, error: quoteError }, { data: inquiry, error: inquiryError }] =
    await Promise.all([
      admin
        .from("creator_inquiry_quotes")
        .select(
          "id,creator_user_id,currency,quoted_amount,buyer_plan_code_snapshot,buyer_marketplace_fee_amount,buyer_total_amount,note,valid_until,sent_at"
        )
        .eq("id", access.quote_id)
        .single(),
      admin.from("creator_inquiries").select("*").eq("id", access.inquiry_id).single(),
    ]);
  if (quoteError || inquiryError || !quote || !inquiry) notFound();

  const [{ data: linkPage }, { data: creator }] = await Promise.all([
    admin
      .from("creator_link_pages")
      .select("display_name")
      .eq("owner_user_id", quote.creator_user_id)
      .maybeSingle(),
    admin
      .from("creators")
      .select("display_name")
      .eq("user_id", quote.creator_user_id)
      .maybeSingle(),
  ]);

  const creatorName = linkPage?.display_name || creator?.display_name || "クリエイター";
  const requestData: Data =
    inquiry.request_data && typeof inquiry.request_data === "object" ? inquiry.request_data : {};
  const requestMode = requestData.request_mode || inquiry.purpose || inquiry.inquiry_type;
  const storedQuoteAmount = snapshotAmount(quote.quoted_amount);
  const storedFeeAmount = snapshotAmount(quote.buyer_marketplace_fee_amount);
  const storedTotalAmount = snapshotAmount(quote.buyer_total_amount);
  const needsLegacyFeeFallback =
    storedQuoteAmount === null ||
    storedFeeAmount === null ||
    storedTotalAmount === null;
  // Backward compatibility only: old rows missing a stored fee snapshot may
  // fall back to the existing fee helper. Current quotes always use snapshots.
  const legacyFees = needsLegacyFeeFallback
    ? calculateOrderFees({
        menuPriceAmount: storedQuoteAmount ?? 0,
        buyerPlanCode: quote.buyer_plan_code_snapshot,
      })
    : null;
  const displayQuoteAmount = storedQuoteAmount ?? legacyFees!.menuPriceAmount;
  const displayFeeAmount = storedFeeAmount ?? legacyFees!.buyerMarketplaceFeeAmount;
  const displayTotalAmount = storedTotalAmount ?? legacyFees!.buyerTotalAmount;
  const platforms =
    joinLabels(requestData.requested_platforms) || inquiry.requested_platform || null;
  const inquiryMessage =
    requestData.additional_notes || requestData.key_message || inquiry.message || null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-10 pt-2">
      <header className="flex items-center gap-3">
        <Link
          href="/b/dashboard"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg text-slate-700 ring-1 ring-slate-200"
          aria-label="ダッシュボードへ戻る"
        >
          ‹
        </Link>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-500">QUOTE</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950">見積もり詳細</h1>
        </div>
      </header>

      <section className="rounded-[22px] bg-slate-950 px-5 py-6 text-white">
        <p className="text-sm text-white/60">{creatorName}さんからの見積もり</p>
        <p className="mt-4 text-[32px] font-bold tracking-tight">{money(displayQuoteAmount)}</p>
        <dl className="mt-5 space-y-3 border-t border-white/10 pt-5 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-white/55">サービス手数料</dt>
            <dd className="font-semibold">{money(displayFeeAmount)}</dd>
          </div>
          <div className="flex items-center justify-between text-base">
            <dt className="font-semibold">お支払い合計</dt>
            <dd className="font-bold">{money(displayTotalAmount)}</dd>
          </div>
        </dl>
        {quote.note ? (
          <div className="mt-5 border-t border-white/10 pt-5">
            <p className="text-xs text-white/45">クリエイターからの備考</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-white/80">{quote.note}</p>
          </div>
        ) : null}
      </section>

      <div className="space-y-6">
        <Section title="依頼内容">
          <DetailRow title="依頼形式" value={label(requestMode)} />
          <DetailRow
            title="商品・サービス名"
            value={inquiry.product_name || requestData.product_name}
          />
          <DetailRow title="SNS" value={platforms} />
          <DetailRow title="制作物・制作数" value={deliverables(requestData)} />
          <DetailRow
            title="希望時期"
            value={inquiry.desired_timing || requestData.desired_timing}
          />
          <DetailRow title="無償提供内容" value={freeOffer(requestData, inquiry)} />
          <DetailRow
            title="特徴・アピールポイント"
            value={requestData.selling_points || requestData.key_message}
          />
          <DetailRow title="企業が入力した依頼内容" value={inquiryMessage} />
        </Section>
      </div>
    </div>
  );
}
