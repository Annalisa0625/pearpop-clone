import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getCreatorLinkInquiryLocale,
  isCreatorLinkInquiryStatus,
  localizeCreatorLinkInquiry,
  type CreatorLinkInquiryDetailResponse,
  type CreatorLinkInquiryListItem,
} from "@/lib/trendre-link/inquiry-inbox";
import { UUID_PATTERN } from "@/lib/trendre-link/items-server";
import { getTrendreLinkAuthenticatedUser } from "@/lib/trendre-link/server-auth";

const INQUIRY_SELECT = `
  id,
  created_at,
  updated_at,
  status,
  inquiry_type,
  inquiry_type_title_snapshot,
  company_name,
  contact_name,
  contact_email,
  product_name,
  desired_timing,
  budget_text,
  requested_platform,
  offer_type,
  purpose,
  message,
  request_data,
  source,
  company_user_id,
  converted_order_id,
  converted_request_id
`;

type RouteContext = { params: Promise<{ id: string }> };
type PatchBody = { status?: unknown };

function errorResponse(error: string, status: number) {
  return NextResponse.json<CreatorLinkInquiryDetailResponse>(
    { ok: false, error },
    { status }
  );
}

async function findOwnedInquiry(id: string, ownerUserId: string) {
  const { data, error } = await supabaseAdmin
    .from("creator_inquiries")
    .select(INQUIRY_SELECT)
    .eq("id", id)
    .eq("creator_user_id", ownerUserId)
    .eq("source", "trendre_link")
    .maybeSingle();

  if (error) throw new Error("inquiry_lookup_failed");
  return (data ?? null) as CreatorLinkInquiryListItem | null;
}

function localizedInquiry(
  inquiry: CreatorLinkInquiryListItem,
  request: NextRequest
) {
  const locale = getCreatorLinkInquiryLocale(
    request.headers.get("accept-language")
  );
  return localizeCreatorLinkInquiry(inquiry, locale);
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await getTrendreLinkAuthenticatedUser(request);
  if (!auth.user) return errorResponse("ログインが必要です。", 401);

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) {
    return errorResponse("問い合わせIDが正しくありません。", 400);
  }

  try {
    const inquiry = await findOwnedInquiry(id, auth.user.id);
    if (!inquiry) return errorResponse("仕事相談が見つかりません。", 404);

    return NextResponse.json<CreatorLinkInquiryDetailResponse>({
      ok: true,
      inquiry: localizedInquiry(inquiry, request),
    });
  } catch (error) {
    console.error(
      "[trendre-link/inquiries] 問い合わせ詳細を取得できませんでした。",
      {
        cause: error instanceof Error ? error.message : "unknown",
      }
    );
    return errorResponse(
      "仕事相談を読み込めませんでした。時間を置いてもう一度お試しください。",
      500
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await getTrendreLinkAuthenticatedUser(request);
  if (!auth.user) return errorResponse("ログインが必要です。", 401);

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) {
    return errorResponse("問い合わせIDが正しくありません。", 400);
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return errorResponse("入力内容を確認してください。", 400);
  }

  if (!isCreatorLinkInquiryStatus(body.status)) {
    return errorResponse("対応状況が正しくありません。", 400);
  }

  try {
    const owned = await findOwnedInquiry(id, auth.user.id);
    if (!owned) return errorResponse("仕事相談が見つかりません。", 404);

    const { data, error } = await supabaseAdmin
      .from("creator_inquiries")
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("creator_user_id", auth.user.id)
      .eq("source", "trendre_link")
      .select(INQUIRY_SELECT)
      .single();

    if (error || !data) throw new Error("inquiry_update_failed");

    return NextResponse.json<CreatorLinkInquiryDetailResponse>({
      ok: true,
      inquiry: localizedInquiry(data as CreatorLinkInquiryListItem, request),
    });
  } catch (error) {
    console.error(
      "[trendre-link/inquiries] 対応状況を更新できませんでした。",
      {
        cause: error instanceof Error ? error.message : "unknown",
      }
    );
    return errorResponse(
      "対応状況を更新できませんでした。時間を置いてもう一度お試しください。",
      500
    );
  }
}
