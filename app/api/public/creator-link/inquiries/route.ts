import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cleanInquiryText, CREATOR_LINK_OFFER_TYPES, CREATOR_LINK_PR_REQUEST_TYPES, CREATOR_LINK_REQUESTED_PLATFORMS, isCreatorLinkInquiryFormKind, isValidInquiryEmail } from "@/lib/trendre-link/inquiry-forms";
import { getTrendreLinkAuthenticatedUser } from "@/lib/trendre-link/server-auth";
import { validateCreatorLinkSlug } from "@/lib/trendre-link/slug";
import type { CreatorLinkPublicInquiryResponse } from "@/lib/trendre-link/types";

type Body = Record<string, unknown>;

function errorResponse(error: string, status: number) {
  return NextResponse.json<CreatorLinkPublicInquiryResponse>({ ok: false, error }, { status });
}

function requiredText(body: Body, key: string, max: number, label: string) {
  const result = cleanInquiryText(body[key], max, true);
  return result.ok ? result : { ok: false as const, error: result.error.includes("文字") ? `${label}は${max}文字以内で入力してください。` : `${label}を入力してください。` };
}

function optionalText(body: Body, key: string, max: number, label: string) {
  const result = cleanInquiryText(body[key], max);
  return result.ok ? result : { ok: false as const, error: `${label}は${max}文字以内で入力してください。` };
}

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    const value: unknown = await request.json();
    if (typeof value !== "object" || value === null || Array.isArray(value)) return errorResponse("入力内容を確認してください。", 400);
    body = value as Body;
  } catch { return errorResponse("入力内容を確認してください。", 400); }

  if (typeof body.website === "string" && body.website.trim()) return NextResponse.json<CreatorLinkPublicInquiryResponse>({ ok: true });
  if (typeof body.slug !== "string" || !isCreatorLinkInquiryFormKind(body.formKind)) return errorResponse("問い合わせ先が正しくありません。", 400);
  const slugValidation = validateCreatorLinkSlug(body.slug);
  if (!slugValidation.valid) return errorResponse("問い合わせ先が正しくありません。", 400);

  const contactName = requiredText(body, "contactName", 80, body.formKind === "pr" ? "担当者名" : "お名前");
  const email = requiredText(body, "contactEmail", 254, "メールアドレス");
  if (!contactName.ok) return errorResponse(contactName.error, 400);
  if (!email.ok || !email.value || !isValidInquiryEmail(email.value)) return errorResponse("有効なメールアドレスを入力してください。", 400);

  const subject = optionalText(body, "subject", 120, "件名");
  const companyName = optionalText(body, "companyName", 120, "会社名・ブランド名");
  const productName = optionalText(body, "productName", 200, "商品・サービス名");
  const desiredTiming = optionalText(body, "desiredTiming", 120, "希望時期");
  const budget = optionalText(body, "budget", 120, "予算");
  const details = optionalText(body, "details", 3000, "詳細");
  if (!subject.ok) return errorResponse(subject.error, 400);
  if (!companyName.ok) return errorResponse(companyName.error, 400);
  if (!productName.ok) return errorResponse(productName.error, 400);
  if (!desiredTiming.ok) return errorResponse(desiredTiming.error, 400);
  if (!budget.ok) return errorResponse(budget.error, 400);
  if (!details.ok) return errorResponse(details.error, 400);

  const primaryMessage = requiredText(body, body.formKind === "simple" ? "message" : "requestContent", 3000, body.formKind === "simple" ? "お問い合わせ内容" : "依頼内容");
  if (!primaryMessage.ok) return errorResponse(primaryMessage.error, 400);
  if (body.formKind === "pr" && (!primaryMessage.value || !(CREATOR_LINK_PR_REQUEST_TYPES as readonly string[]).includes(primaryMessage.value))) return errorResponse("依頼内容を選択してください。", 400);

  const requestedPlatform = body.requestedPlatforms === undefined
    ? null
    : Array.isArray(body.requestedPlatforms)
      && body.requestedPlatforms.length <= CREATOR_LINK_REQUESTED_PLATFORMS.length
      && body.requestedPlatforms.every((value) => typeof value === "string" && (CREATOR_LINK_REQUESTED_PLATFORMS as readonly string[]).includes(value))
      && new Set(body.requestedPlatforms).size === body.requestedPlatforms.length
        ? body.requestedPlatforms.join(",") || null
        : undefined;
  const offerType = body.offerType === "" || body.offerType === undefined
    ? null
    : typeof body.offerType === "string" && (CREATOR_LINK_OFFER_TYPES as readonly string[]).includes(body.offerType)
      ? body.offerType
      : undefined;
  if (requestedPlatform === undefined || offerType === undefined) return errorResponse("選択項目を確認してください。", 400);

  try {
    const { data: page, error: pageError } = await supabaseAdmin.from("creator_link_pages")
      .select("id, creator_id, owner_user_id")
      .eq("slug", slugValidation.normalizedSlug)
      .eq("status", "published")
      .eq("is_accepting_inquiries", true)
      .maybeSingle();
    if (pageError) throw new Error("page_lookup_failed");
    if (!page) return errorResponse("現在、このページでは問い合わせを受け付けていません。", 404);

    let typeQuery = supabaseAdmin.from("creator_link_inquiry_types").select("id, template_key, title").eq("page_id", page.id).eq("is_enabled", true);
    typeQuery = body.formKind === "simple" ? typeQuery.is("template_key", null).eq("is_custom", true) : typeQuery.eq("template_key", "pr_post");
    const { data: inquiryTypes, error: typeError } = await typeQuery.order("sort_order", { ascending: true }).limit(1);
    if (typeError) throw new Error("inquiry_type_lookup_failed");
    const inquiryType = inquiryTypes?.[0];
    if (!inquiryType) return errorResponse("このフォームは現在公開されていません。", 404);

    const auth = await getTrendreLinkAuthenticatedUser(request);
    const message = body.formKind === "simple" ? primaryMessage.value : details.value ?? primaryMessage.value;
    const purpose = body.formKind === "simple" ? subject.value : primaryMessage.value;
    const { error: insertError } = await supabaseAdmin.from("creator_inquiries").insert({
      creator_id: page.creator_id,
      creator_user_id: page.owner_user_id,
      company_user_id: auth.user?.id ?? null,
      link_page_id: page.id,
      inquiry_type_id: inquiryType.id,
      inquiry_type_title_snapshot: inquiryType.title,
      inquiry_type: inquiryType.template_key ?? "other",
      company_name: body.formKind === "pr" ? companyName.value : null,
      contact_name: contactName.value,
      contact_email: email.value,
      product_name: body.formKind === "pr" ? productName.value : null,
      desired_timing: body.formKind === "pr" ? desiredTiming.value : null,
      budget_text: body.formKind === "pr" ? budget.value : null,
      requested_platform: body.formKind === "pr" ? requestedPlatform : null,
      offer_type: body.formKind === "pr" ? offerType : null,
      purpose,
      message,
      status: "new",
      verification_status: "verified",
      submitter_kind: "company",
      source: "trendre_link",
      referrer_url: request.headers.get("referer"),
      user_agent: request.headers.get("user-agent"),
      ip_address: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      converted_order_id: null,
      converted_request_id: null,
      public_reference: null,
      verification_token_hash: null,
      verification_expires_at: null,
      verified_at: null,
    });
    if (insertError) throw new Error("inquiry_insert_failed");
    return NextResponse.json<CreatorLinkPublicInquiryResponse>({ ok: true });
  } catch (error) {
    console.error("[trendre-link/public-inquiries] 問い合わせを保存できませんでした。", { cause: error instanceof Error ? error.message : "unknown" });
    return errorResponse("送信できませんでした。入力内容を残したまま、もう一度お試しください。", 500);
  }
}
