import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  CREATOR_LINK_ACTIVE_INQUIRY_STATUSES,
  CREATOR_LINK_CLOSED_INQUIRY_STATUSES,
  getCreatorLinkInquiryLocale,
  localizeCreatorLinkInquiry,
  type CreatorLinkInquiryInboxResponse,
  type CreatorLinkInquiryListItem,
} from "@/lib/trendre-link/inquiry-inbox";
import { getTrendreLinkAuthenticatedUser } from "@/lib/trendre-link/server-auth";

// Keep this typed as a runtime string until the generated Supabase database
// types include creator_inquiries.request_data.
const INQUIRY_SELECT: string = `
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

function errorResponse(error: string, status: number) {
  return NextResponse.json<CreatorLinkInquiryInboxResponse>(
    { ok: false, error },
    { status }
  );
}

function asInquiryList(value: unknown): CreatorLinkInquiryListItem[] {
  return Array.isArray(value)
    ? (value as CreatorLinkInquiryListItem[])
    : [];
}

export async function GET(request: NextRequest) {
  const auth = await getTrendreLinkAuthenticatedUser(request);
  if (!auth.user) return errorResponse("ログインが必要です。", 401);

  try {
    const { data, error } = await supabaseAdmin
      .from("creator_inquiries")
      .select(INQUIRY_SELECT)
      .eq("creator_user_id", auth.user.id)
      .eq("source", "trendre_link")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw new Error("inquiry_list_failed");

    const locale = getCreatorLinkInquiryLocale(
      request.headers.get("accept-language")
    );
    const inquiries = asInquiryList(data).map((inquiry) =>
      localizeCreatorLinkInquiry(inquiry, locale)
    );
    const activeStatuses =
      CREATOR_LINK_ACTIVE_INQUIRY_STATUSES as readonly string[];
    const closedStatuses =
      CREATOR_LINK_CLOSED_INQUIRY_STATUSES as readonly string[];

    return NextResponse.json<CreatorLinkInquiryInboxResponse>({
      ok: true,
      inquiries,
      counts: {
        all: inquiries.length,
        new: inquiries.filter((item) => item.status === "new").length,
        active: inquiries.filter((item) => activeStatuses.includes(item.status))
          .length,
        closed: inquiries.filter((item) => closedStatuses.includes(item.status))
          .length,
      },
    });
  } catch (error) {
    console.error(
      "[trendre-link/inquiries] 問い合わせ一覧を取得できませんでした。",
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
