// File: app/api/public/inquiries/route.ts

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type InquiryType =
  | "pr_post"
  | "product_review"
  | "visit_event"
  | "ugc"
  | "other";

const allowedInquiryTypes = new Set<InquiryType>([
  "pr_post",
  "product_review",
  "visit_event",
  "ugc",
  "other",
]);

function cleanText(value: unknown, maxLength = 1000) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  if (!trimmed) return null;

  return trimmed.slice(0, maxLength);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  const body = await req.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "送信内容が不正です。" },
      { status: 400 }
    );
  }

  // bot対策のhoneypot。通常ユーザーには表示されない。
  if (cleanText((body as any).website, 200)) {
    return NextResponse.json({ success: true });
  }

  const creatorId = cleanText((body as any).creatorId, 80);
  const inquiryType = cleanText((body as any).inquiryType, 40) as
    | InquiryType
    | null;

  const companyName = cleanText((body as any).companyName, 160);
  const contactName = cleanText((body as any).contactName, 120);
  const contactEmail = cleanText((body as any).contactEmail, 200);
  const contactPhone = cleanText((body as any).contactPhone, 80);

  const productName = cleanText((body as any).productName, 240);
  const productUrl = cleanText((body as any).productUrl, 500);
  const desiredTiming = cleanText((body as any).desiredTiming, 160);
  const budgetText = cleanText((body as any).budgetText, 160);
  const message = cleanText((body as any).message, 3000);

  if (!creatorId) {
    return NextResponse.json(
      { error: "インフルエンサー情報が不足しています。" },
      { status: 400 }
    );
  }

  if (!inquiryType || !allowedInquiryTypes.has(inquiryType)) {
    return NextResponse.json(
      { error: "相談内容の種類を選択してください。" },
      { status: 400 }
    );
  }

  if (!contactEmail || !isValidEmail(contactEmail)) {
    return NextResponse.json(
      { error: "有効なメールアドレスを入力してください。" },
      { status: 400 }
    );
  }

  if (!message) {
    return NextResponse.json(
      { error: "相談内容を入力してください。" },
      { status: 400 }
    );
  }

  const { data: creator, error: creatorError } = await supabase
    .from("creators")
    .select("id, user_id")
    .eq("id", creatorId)
    .eq("is_public", true)
    .eq("approval_status", "approved")
    .maybeSingle();

  if (creatorError) {
    console.error("public inquiry creator load error:", creatorError);

    return NextResponse.json(
      { error: "インフルエンサー情報の確認に失敗しました。" },
      { status: 500 }
    );
  }

  if (!creator) {
    return NextResponse.json(
      { error: "現在このインフルエンサーには相談できません。" },
      { status: 404 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userAgent = req.headers.get("user-agent");
  const forwardedFor = req.headers.get("x-forwarded-for");
  const referrerUrl = req.headers.get("referer");

  const { data: inquiry, error: insertError } = await supabase
    .from("creator_inquiries")
    .insert({
      creator_id: creator.id,
      creator_user_id: creator.user_id,
      company_user_id: user?.id ?? null,

      company_name: companyName,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,

      inquiry_type: inquiryType,
      product_name: productName,
      product_url: productUrl,
      desired_timing: desiredTiming,
      budget_text: budgetText,
      message,

      status: "new",
      source: "public_profile",
      referrer_url: referrerUrl,
      user_agent: userAgent,
      ip_address: forwardedFor,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("public inquiry insert error:", insertError);

    return NextResponse.json(
      { error: "相談内容の送信に失敗しました。" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    inquiryId: inquiry.id,
  });
}