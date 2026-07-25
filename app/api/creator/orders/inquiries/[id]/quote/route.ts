import { NextRequest, NextResponse } from "next/server";

import { calculateOrderFees } from "@/lib/orders/fees";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { CreatorInquiryQuote, CreatorInquiryQuoteResponse } from "@/lib/trendre-link/inquiry-quote";
import { UUID_PATTERN } from "@/lib/trendre-link/items-server";
import { getTrendreLinkAuthenticatedUser } from "@/lib/trendre-link/server-auth";

type RouteContext = { params: Promise<{ id: string }> };
type QuoteBody = {
  quotedAmount?: unknown;
  note?: unknown;
  // Older clients can keep sending these fields.
  scope?: unknown;
  deliveryText?: unknown;
  validUntil?: unknown;
};

const QUOTE_SELECT = "id,inquiry_id,status,currency,quoted_amount,buyer_marketplace_fee_amount,buyer_total_amount,creator_transaction_fee_amount,creator_payout_amount,scope,delivery_text,note,valid_until,sent_at,created_at,updated_at";

function errorResponse(error: string, status: number, setupRequired = false) {
  return NextResponse.json<CreatorInquiryQuoteResponse>(
    { ok: false, error, ...(setupRequired ? { setupRequired: true } : {}) },
    { status }
  );
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function parseAmount(value: unknown) {
  const amount = typeof value === "number" ? value : typeof value === "string"
    ? Number(value.replace(/[¥￥,\s]/g, ""))
    : Number.NaN;
  if (!Number.isInteger(amount) || amount < 1000 || amount > 100_000_000) return null;
  return amount;
}

function parseValidUntil(value: unknown) {
  if (typeof value !== "string") return null;
  const date = new Date(`${value}T23:59:59+09:00`);
  const max = Date.now() + 90 * 24 * 60 * 60 * 1000;
  return !Number.isNaN(date.getTime()) && date.getTime() > Date.now() && date.getTime() <= max
    ? date.toISOString()
    : null;
}

type OwnedInquiry = {
  id: string;
  creator_user_id: string;
  company_user_id: string | null;
  contact_email: string;
  status: string;
  inquiry_type: string;
  purpose: string | null;
  product_name: string | null;
  requested_platform: string | null;
  request_data: unknown;
};

async function findOwnedInquiry(id: string, creatorUserId: string) {
  const admin = supabaseAdmin as any;
  const { data, error } = await admin.from("creator_inquiries")
    .select("id,creator_user_id,company_user_id,contact_email,status,source,inquiry_type,purpose,product_name,requested_platform,request_data")
    .eq("id", id).eq("creator_user_id", creatorUserId).eq("source", "trendre_link").maybeSingle();
  if (error) throw error;
  return data as OwnedInquiry | null;
}

function buildScopeSnapshot(inquiry: OwnedInquiry) {
  const data = typeof inquiry.request_data === "object" && inquiry.request_data !== null
    ? inquiry.request_data as Record<string, unknown>
    : {};
  const parts = [
    typeof data.request_mode === "string" ? data.request_mode : inquiry.purpose || inquiry.inquiry_type,
    inquiry.product_name,
    Array.isArray(data.requested_platforms) ? data.requested_platforms.join(", ") : inquiry.requested_platform,
    typeof data.deliverable_count === "number" ? `${data.deliverable_count}件` : null,
  ].filter((value): value is string => typeof value === "string" && Boolean(value.trim()));
  return (parts.join(" / ") || "企業からの見積もり依頼内容に基づく対応").slice(0, 2000);
}

async function getBuyerPlanCode(companyUserId: string | null) {
  if (!companyUserId) return "free";
  const admin = supabaseAdmin as any;
  const { data, error } = await admin.from("user_states").select("company_plan_code")
    .eq("user_id", companyUserId).maybeSingle();
  if (error) return "free";
  return (data as { company_plan_code?: string | null } | null)?.company_plan_code ?? "free";
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await getTrendreLinkAuthenticatedUser(request);
  if (!auth.user) return errorResponse("ログインが必要です。", 401);
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return errorResponse("見積もり依頼が見つかりません。", 400);
  try {
    const inquiry = await findOwnedInquiry(id, auth.user.id);
    if (!inquiry) return errorResponse("見積もり依頼が見つかりません。", 404);
    const admin = supabaseAdmin as any;
    const { data, error } = await admin.from("creator_inquiry_quotes")
      .select(QUOTE_SELECT).eq("inquiry_id", id).maybeSingle();
    if (error?.code === "42P01") return NextResponse.json<CreatorInquiryQuoteResponse>({ ok: true, quote: null });
    if (error) throw error;
    return NextResponse.json<CreatorInquiryQuoteResponse>({ ok: true, quote: (data ?? null) as CreatorInquiryQuote | null });
  } catch (cause) {
    console.error("creator inquiry quote load failed", { cause: cause instanceof Error ? cause.message : "unknown" });
    return errorResponse("見積もりを読み込めませんでした。", 500);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await getTrendreLinkAuthenticatedUser(request);
  if (!auth.user) return errorResponse("ログインが必要です。", 401);
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return errorResponse("見積もり依頼が見つかりません。", 400);
  let body: QuoteBody;
  try {
    body = await request.json() as QuoteBody;
  } catch {
    return errorResponse("入力内容を確認してください。", 400);
  }
  const quotedAmount = parseAmount(body.quotedAmount);
  if (!quotedAmount) return errorResponse("見積金額は1,000円以上の整数で入力してください。", 400);
  const note = cleanText(body.note, 2000);

  try {
    const inquiry = await findOwnedInquiry(id, auth.user.id);
    if (!inquiry) return errorResponse("見積もり依頼が見つかりません。", 404);
    if (["converted", "declined"].includes(inquiry.status)) {
      return errorResponse("この依頼には見積もりを送信できません。", 409);
    }
    const fees = calculateOrderFees({
      menuPriceAmount: quotedAmount,
      buyerPlanCode: await getBuyerPlanCode(inquiry.company_user_id),
    });
    const now = new Date().toISOString();
    const validUntilDate = new Date();
    validUntilDate.setDate(validUntilDate.getDate() + 30);
    const admin = supabaseAdmin as any;
    const { data, error } = await admin.from("creator_inquiry_quotes").upsert({
      inquiry_id: inquiry.id,
      creator_user_id: auth.user.id,
      company_user_id: inquiry.company_user_id,
      contact_email: inquiry.contact_email,
      status: "sent",
      currency: "JPY",
      quoted_amount: fees.menuPriceAmount,
      buyer_plan_code_snapshot: fees.buyerPlanCodeSnapshot,
      buyer_marketplace_fee_rate_bps: fees.buyerMarketplaceFeeRateBps,
      buyer_marketplace_fee_amount: fees.buyerMarketplaceFeeAmount,
      creator_transaction_fee_rate_bps: fees.creatorTransactionFeeRateBps,
      creator_transaction_fee_amount: fees.creatorTransactionFeeAmount,
      buyer_total_amount: fees.buyerTotalAmount,
      creator_payout_amount: fees.creatorPayoutAmount,
      platform_gross_revenue_amount: fees.platformGrossRevenueAmount,
      scope: cleanText(body.scope, 2000) || buildScopeSnapshot(inquiry),
      delivery_text: cleanText(body.deliveryText, 200),
      note,
      valid_until: parseValidUntil(body.validUntil) || validUntilDate.toISOString(),
      sent_at: now,
      updated_at: now,
    }, { onConflict: "inquiry_id" }).select(QUOTE_SELECT).single();
    if (error?.code === "42P01") return errorResponse("見積もり機能の準備が完了していません。", 503, true);
    if (error || !data) throw error ?? new Error("quote_upsert_failed");
    const { error: inquiryError } = await admin.from("creator_inquiries")
      .update({ status: "quoted", updated_at: now }).eq("id", inquiry.id).eq("creator_user_id", auth.user.id);
    if (inquiryError) throw inquiryError;
    return NextResponse.json<CreatorInquiryQuoteResponse>({ ok: true, quote: data as CreatorInquiryQuote });
  } catch (cause) {
    console.error("creator inquiry quote send failed", { cause: cause instanceof Error ? cause.message : "unknown" });
    return errorResponse("見積もりを送信できませんでした。", 500);
  }
}
