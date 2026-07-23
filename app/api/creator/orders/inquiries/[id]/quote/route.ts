import { NextRequest, NextResponse } from "next/server";

import { calculateOrderFees } from "@/lib/orders/fees";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type {
  CreatorInquiryQuote,
  CreatorInquiryQuoteResponse,
} from "@/lib/trendre-link/inquiry-quote";
import { UUID_PATTERN } from "@/lib/trendre-link/items-server";
import { getTrendreLinkAuthenticatedUser } from "@/lib/trendre-link/server-auth";

type RouteContext = { params: Promise<{ id: string }> };

type QuoteBody = {
  quotedAmount?: unknown;
  scope?: unknown;
  deliveryText?: unknown;
  note?: unknown;
  validUntil?: unknown;
};

const QUOTE_SELECT = `
  id,
  inquiry_id,
  status,
  currency,
  quoted_amount,
  buyer_marketplace_fee_amount,
  buyer_total_amount,
  creator_transaction_fee_amount,
  creator_payout_amount,
  scope,
  delivery_text,
  note,
  valid_until,
  sent_at,
  created_at,
  updated_at
`;

function errorResponse(
  error: string,
  status: number,
  setupRequired = false
) {
  return NextResponse.json<CreatorInquiryQuoteResponse>(
    { ok: false, error, ...(setupRequired ? { setupRequired: true } : {}) },
    { status }
  );
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function parseAmount(value: unknown) {
  const amount =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(/[¥￥,\s]/g, ""))
        : Number.NaN;

  if (!Number.isFinite(amount)) return null;
  const rounded = Math.round(amount);
  if (rounded < 1000 || rounded > 100_000_000) return null;
  return rounded;
}

function parseValidUntil(value: unknown) {
  if (typeof value !== "string") return null;
  const date = new Date(`${value}T23:59:59+09:00`);
  if (Number.isNaN(date.getTime())) return null;

  const now = Date.now();
  const max = now + 90 * 24 * 60 * 60 * 1000;
  if (date.getTime() <= now || date.getTime() > max) return null;
  return date.toISOString();
}

async function findOwnedInquiry(id: string, creatorUserId: string) {
  const admin = supabaseAdmin as any;
  const { data, error } = await admin
    .from("creator_inquiries")
    .select(
      "id, creator_user_id, company_user_id, contact_email, status, source"
    )
    .eq("id", id)
    .eq("creator_user_id", creatorUserId)
    .eq("source", "trendre_link")
    .maybeSingle();

  if (error) throw error;
  return data as {
    id: string;
    creator_user_id: string;
    company_user_id: string | null;
    contact_email: string;
    status: string;
  } | null;
}

async function getBuyerPlanCode(companyUserId: string | null) {
  if (!companyUserId) return "free";

  const admin = supabaseAdmin as any;
  const { data, error } = await admin
    .from("user_states")
    .select("company_plan_code")
    .eq("user_id", companyUserId)
    .maybeSingle();

  if (error) return "free";
  return (data as { company_plan_code?: string | null } | null)
    ?.company_plan_code ?? "free";
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await getTrendreLinkAuthenticatedUser(request);
  if (!auth.user) return errorResponse("ログインが必要です。", 401);

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) {
    return errorResponse("見積もり依頼が見つかりません。", 400);
  }

  try {
    const inquiry = await findOwnedInquiry(id, auth.user.id);
    if (!inquiry) return errorResponse("見積もり依頼が見つかりません。", 404);

    const admin = supabaseAdmin as any;
    const { data, error } = await admin
      .from("creator_inquiry_quotes")
      .select(QUOTE_SELECT)
      .eq("inquiry_id", id)
      .maybeSingle();

    if (error?.code === "42P01") {
      return NextResponse.json<CreatorInquiryQuoteResponse>({
        ok: true,
        quote: null,
      });
    }
    if (error) throw error;

    return NextResponse.json<CreatorInquiryQuoteResponse>({
      ok: true,
      quote: (data ?? null) as CreatorInquiryQuote | null,
    });
  } catch (error) {
    console.error("creator inquiry quote load failed", {
      cause: error instanceof Error ? error.message : "unknown",
    });
    return errorResponse("見積もりを読み込めませんでした。", 500);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await getTrendreLinkAuthenticatedUser(request);
  if (!auth.user) return errorResponse("ログインが必要です。", 401);

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) {
    return errorResponse("見積もり依頼が見つかりません。", 400);
  }

  let body: QuoteBody;
  try {
    body = (await request.json()) as QuoteBody;
  } catch {
    return errorResponse("入力内容を確認してください。", 400);
  }

  const quotedAmount = parseAmount(body.quotedAmount);
  const scope = cleanText(body.scope, 2000);
  const deliveryText = cleanText(body.deliveryText, 200);
  const note = cleanText(body.note, 2000);
  const validUntil = parseValidUntil(body.validUntil);

  if (!quotedAmount) {
    return errorResponse("見積金額は1,000円以上で入力してください。", 400);
  }
  if (!scope || scope.length < 5) {
    return errorResponse("対応内容を入力してください。", 400);
  }
  if (!validUntil) {
    return errorResponse("見積もりの有効期限を確認してください。", 400);
  }

  try {
    const inquiry = await findOwnedInquiry(id, auth.user.id);
    if (!inquiry) return errorResponse("見積もり依頼が見つかりません。", 404);
    if (inquiry.status === "converted" || inquiry.status === "declined") {
      return errorResponse("この依頼には見積もりを送信できません。", 409);
    }

    const buyerPlanCode = await getBuyerPlanCode(inquiry.company_user_id);
    const fees = calculateOrderFees({
      menuPriceAmount: quotedAmount,
      buyerPlanCode,
    });
    const now = new Date().toISOString();

    const admin = supabaseAdmin as any;
    const { data, error } = await admin
      .from("creator_inquiry_quotes")
      .upsert(
        {
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
          scope,
          delivery_text: deliveryText,
          note,
          valid_until: validUntil,
          sent_at: now,
          updated_at: now,
        },
        { onConflict: "inquiry_id" }
      )
      .select(QUOTE_SELECT)
      .single();

    if (error?.code === "42P01") {
      return errorResponse(
        "見積もり機能の準備がまだ完了していません。",
        503,
        true
      );
    }
    if (error || !data) throw error ?? new Error("quote_upsert_failed");

    const { error: inquiryError } = await admin
      .from("creator_inquiries")
      .update({ status: "quoted", updated_at: now })
      .eq("id", inquiry.id)
      .eq("creator_user_id", auth.user.id);

    if (inquiryError) throw inquiryError;

    return NextResponse.json<CreatorInquiryQuoteResponse>({
      ok: true,
      quote: data as CreatorInquiryQuote,
    });
  } catch (error) {
    console.error("creator inquiry quote send failed", {
      cause: error instanceof Error ? error.message : "unknown",
    });
    return errorResponse("見積もりを送信できませんでした。", 500);
  }
}
