import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  cleanInquiryText,
  CREATOR_LINK_CAMPAIGN_GOALS,
  CREATOR_LINK_CONTENT_FORMATS,
  CREATOR_LINK_OFFER_TYPES,
  CREATOR_LINK_PR_REQUEST_TYPES,
  CREATOR_LINK_REQUESTED_PLATFORMS,
  CREATOR_LINK_USAGE_RIGHTS,
  isCreatorLinkInquiryFormKind,
  isValidInquiryEmail,
  type CreatorLinkRequestData,
} from "@/lib/trendre-link/inquiry-forms";
import { getTrendreLinkAuthenticatedUser } from "@/lib/trendre-link/server-auth";
import { validateCreatorLinkSlug } from "@/lib/trendre-link/slug";
import type { CreatorLinkPublicInquiryResponse } from "@/lib/trendre-link/types";

type Body = Record<string, unknown>;

function errorResponse(error: string, status: number) {
  return NextResponse.json<CreatorLinkPublicInquiryResponse>(
    { ok: false, error },
    { status }
  );
}

function requiredText(body: Body, key: string, max: number, label: string) {
  const result = cleanInquiryText(body[key], max, true);
  return result.ok
    ? result
    : {
        ok: false as const,
        error: result.error.includes("文字")
          ? `${label}は${max}文字以内で入力してください。`
          : `${label}を入力してください。`,
      };
}

function optionalText(body: Body, key: string, max: number, label: string) {
  const result = cleanInquiryText(body[key], max);
  return result.ok
    ? result
    : {
        ok: false as const,
        error: `${label}は${max}文字以内で入力してください。`,
      };
}

function optionalUrl(body: Body, key: string, label: string) {
  const text = optionalText(body, key, 500, label);
  if (!text.ok || !text.value) return text;

  try {
    const url = new URL(text.value);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { ok: false as const, error: `${label}を確認してください。` };
    }
    return { ok: true as const, value: url.toString() };
  } catch {
    return { ok: false as const, error: `${label}を確認してください。` };
  }
}

function validatedStringArray(
  value: unknown,
  allowed: readonly string[],
  required: boolean
) {
  if (!Array.isArray(value)) return required ? undefined : [];
  if (value.length > allowed.length) return undefined;
  if (
    value.some(
      (item) => typeof item !== "string" || !allowed.includes(item)
    )
  ) {
    return undefined;
  }
  const unique = [...new Set(value as string[])];
  if (unique.length !== value.length) return undefined;
  if (required && unique.length === 0) return undefined;
  return unique;
}

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    const value: unknown = await request.json();
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return errorResponse("入力内容を確認してください。", 400);
    }
    body = value as Body;
  } catch {
    return errorResponse("入力内容を確認してください。", 400);
  }

  if (typeof body.website === "string" && body.website.trim()) {
    return NextResponse.json<CreatorLinkPublicInquiryResponse>({ ok: true });
  }

  if (
    typeof body.slug !== "string" ||
    !isCreatorLinkInquiryFormKind(body.formKind)
  ) {
    return errorResponse("問い合わせ先が正しくありません。", 400);
  }

  const slugValidation = validateCreatorLinkSlug(body.slug);
  if (!slugValidation.valid) {
    return errorResponse("問い合わせ先が正しくありません。", 400);
  }

  const contactName = requiredText(
    body,
    "contactName",
    80,
    body.formKind === "pr" ? "担当者名" : "お名前"
  );
  const email = requiredText(body, "contactEmail", 254, "メールアドレス");
  if (!contactName.ok) return errorResponse(contactName.error, 400);
  if (!email.ok || !email.value || !isValidInquiryEmail(email.value)) {
    return errorResponse("有効なメールアドレスを入力してください。", 400);
  }

  const subject = optionalText(body, "subject", 120, "件名");
  const simpleMessage =
    body.formKind === "simple"
      ? requiredText(body, "message", 3000, "お問い合わせ内容")
      : optionalText(body, "message", 3000, "お問い合わせ内容");
  if (!subject.ok) return errorResponse(subject.error, 400);
  if (!simpleMessage.ok) return errorResponse(simpleMessage.error, 400);

  let companyName: string | null = null;
  let productName: string | null = null;
  let desiredTiming: string | null = null;
  let budget: string | null = null;
  let requestedPlatform: string | null = null;
  let offerType: string | null = null;
  let purpose: string | null = subject.value;
  let message: string | null = simpleMessage.value;
  let requestData: CreatorLinkRequestData = {
    campaign_goal: null,
    content_formats: [],
    deliverable_count: null,
    usage_rights: null,
    product_url: null,
    reference_url: null,
    key_message: null,
  };

  if (body.formKind === "pr") {
    const company = requiredText(body, "companyName", 120, "会社名・ブランド名");
    const product = requiredText(body, "productName", 200, "商品・サービス名");
    const timing = requiredText(body, "desiredTiming", 120, "希望時期");
    const budgetResult = requiredText(body, "budget", 12, "予算目安");
    const details = optionalText(body, "details", 3000, "その他の補足");
    const keyMessage = optionalText(body, "keyMessage", 1000, "必ず伝えたいこと");
    const productUrl = optionalUrl(body, "productUrl", "商品・サービスURL");
    const referenceUrl = optionalUrl(body, "referenceUrl", "参考URL");

    if (!company.ok) return errorResponse(company.error, 400);
    if (!product.ok) return errorResponse(product.error, 400);
    if (!timing.ok) return errorResponse(timing.error, 400);
    if (!budgetResult.ok) return errorResponse(budgetResult.error, 400);
    if (!details.ok) return errorResponse(details.error, 400);
    if (!keyMessage.ok) return errorResponse(keyMessage.error, 400);
    if (!productUrl.ok) return errorResponse(productUrl.error, 400);
    if (!referenceUrl.ok) return errorResponse(referenceUrl.error, 400);

    if (!budgetResult.value || !/^\d{1,12}$/.test(budgetResult.value)) {
      return errorResponse("予算目安を数字で入力してください。", 400);
    }

    const requestContent = requiredText(body, "requestContent", 40, "依頼内容");
    if (
      !requestContent.ok ||
      !requestContent.value ||
      !(CREATOR_LINK_PR_REQUEST_TYPES as readonly string[]).includes(
        requestContent.value
      )
    ) {
      return errorResponse("依頼内容を選択してください。", 400);
    }

    const platforms = validatedStringArray(
      body.requestedPlatforms,
      CREATOR_LINK_REQUESTED_PLATFORMS,
      true
    );
    const contentFormats = validatedStringArray(
      body.contentFormats,
      CREATOR_LINK_CONTENT_FORMATS,
      true
    );
    if (!platforms || !contentFormats) {
      return errorResponse("希望するSNSと制作物を確認してください。", 400);
    }

    const count = Number(body.deliverableCount);
    if (!Number.isInteger(count) || count < 1 || count > 20) {
      return errorResponse("制作数を確認してください。", 400);
    }

    const campaignGoal =
      typeof body.campaignGoal === "string" &&
      (CREATOR_LINK_CAMPAIGN_GOALS as readonly string[]).includes(
        body.campaignGoal
      )
        ? body.campaignGoal
        : null;
    if (!campaignGoal) {
      return errorResponse("今回の目的を選択してください。", 400);
    }

    offerType =
      typeof body.offerType === "string" &&
      (CREATOR_LINK_OFFER_TYPES as readonly string[]).includes(body.offerType)
        ? body.offerType
        : null;
    if (!offerType) {
      return errorResponse("商品提供について選択してください。", 400);
    }

    const usageRights =
      typeof body.usageRights === "string" &&
      (CREATOR_LINK_USAGE_RIGHTS as readonly string[]).includes(
        body.usageRights
      )
        ? body.usageRights
        : null;
    if (!usageRights) {
      return errorResponse("制作物の二次利用について選択してください。", 400);
    }

    companyName = company.value;
    productName = product.value;
    desiredTiming = timing.value;
    budget = budgetResult.value;
    requestedPlatform = platforms.join(",");
    purpose = requestContent.value;
    message = details.value ?? keyMessage.value;
    requestData = {
      campaign_goal: campaignGoal as CreatorLinkRequestData["campaign_goal"],
      content_formats:
        contentFormats as CreatorLinkRequestData["content_formats"],
      deliverable_count: count,
      usage_rights: usageRights as CreatorLinkRequestData["usage_rights"],
      product_url: productUrl.value,
      reference_url: referenceUrl.value,
      key_message: keyMessage.value,
    };
  }

  try {
    const { data: page, error: pageError } = await supabaseAdmin
      .from("creator_link_pages")
      .select("id, creator_id, owner_user_id")
      .eq("slug", slugValidation.normalizedSlug)
      .eq("status", "published")
      .eq("is_accepting_inquiries", true)
      .maybeSingle();

    if (pageError) throw new Error("page_lookup_failed");
    if (!page) {
      return errorResponse(
        "現在、このページでは問い合わせを受け付けていません。",
        404
      );
    }

    let typeQuery = supabaseAdmin
      .from("creator_link_inquiry_types")
      .select("id, template_key, title")
      .eq("page_id", page.id)
      .eq("is_enabled", true);

    typeQuery =
      body.formKind === "simple"
        ? typeQuery.is("template_key", null).eq("is_custom", true)
        : typeQuery.eq("template_key", "pr_post");

    const { data: inquiryTypes, error: typeError } = await typeQuery
      .order("sort_order", { ascending: true })
      .limit(1);

    if (typeError) throw new Error("inquiry_type_lookup_failed");
    const inquiryType = inquiryTypes?.[0];
    if (!inquiryType) {
      return errorResponse("このフォームは現在公開されていません。", 404);
    }

    const auth = await getTrendreLinkAuthenticatedUser(request);
    const { error: insertError } = await supabaseAdmin
      .from("creator_inquiries")
      .insert({
        creator_id: page.creator_id,
        creator_user_id: page.owner_user_id,
        company_user_id: auth.user?.id ?? null,
        link_page_id: page.id,
        inquiry_type_id: inquiryType.id,
        inquiry_type_title_snapshot: inquiryType.title,
        inquiry_type: inquiryType.template_key ?? "other",
        company_name: body.formKind === "pr" ? companyName : null,
        contact_name: contactName.value,
        contact_email: email.value,
        product_name: body.formKind === "pr" ? productName : null,
        desired_timing: body.formKind === "pr" ? desiredTiming : null,
        budget_text: body.formKind === "pr" ? budget : null,
        requested_platform: body.formKind === "pr" ? requestedPlatform : null,
        offer_type: body.formKind === "pr" ? offerType : null,
        purpose,
        message,
        request_data: body.formKind === "pr" ? requestData : {},
        status: "new",
        verification_status: "verified",
        submitter_kind: "company",
        source: "trendre_link",
        referrer_url: request.headers.get("referer"),
        user_agent: request.headers.get("user-agent"),
        ip_address:
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          null,
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
    console.error(
      "[trendre-link/public-inquiries] 問い合わせを保存できませんでした。",
      { cause: error instanceof Error ? error.message : "unknown" }
    );
    return errorResponse(
      "送信できませんでした。入力内容を残したまま、もう一度お試しください。",
      500
    );
  }
}
