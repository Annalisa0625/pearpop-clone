import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  CAMPAIGN_GOALS,
  COMPANY_SOCIAL_PLATFORMS,
  FREE_OFFER_OPTIONS,
  MEETING_METHODS,
  PLATFORM_DELIVERABLES,
  PR_PROJECT_TYPES,
  PRIVACY_VERSION,
  REQUEST_MODES,
  REQUESTED_PLATFORMS,
  TERMS_VERSION,
  UGC_DELIVERABLE_TYPES,
  UGC_USAGE_PURPOSES,
  cleanInquiryText,
  isCreatorLinkInquiryFormKind,
  isValidInquiryEmail,
  type CreatorLinkRequestData,
  type PlatformDeliverable,
} from "@/lib/trendre-link/inquiry-forms";
import { validateCreatorLinkSlug } from "@/lib/trendre-link/slug";
import { UUID_PATTERN } from "@/lib/trendre-link/items-server";
import {
  isInquirySubmissionId,
  isPublicInquiryFormTarget,
  matchesInquirySubmissionTarget,
} from "@/lib/trendre-link/inquiry-submission";
import type { CreatorLinkPublicInquiryResponse } from "@/lib/trendre-link/types";
import { insertOrRecoverUnique } from "@/lib/db/unique-insert";

type Body = Record<string, unknown>;
const MAX_BODY_BYTES = 48_000;

function errorResponse(error: string, status = 400) {
  return NextResponse.json<CreatorLinkPublicInquiryResponse>({ ok: false, error }, { status });
}

function text(body: Body, key: string, max: number, required = false) {
  return cleanInquiryText(body[key], max, required);
}

function url(body: Body, key: string) {
  const value = text(body, key, 500);
  if (!value.ok || !value.value) return value;
  try {
    const parsed = new URL(value.value);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
    return { ok: true as const, value: parsed.toString() };
  } catch {
    return { ok: false as const, error: "URLはhttpまたはhttpsで正しく入力してください。" };
  }
}

function selection(value: unknown, allowed: readonly string[], required = true) {
  return typeof value === "string" && allowed.includes(value) ? value : required ? null : undefined;
}

function selections(value: unknown, allowed: readonly string[], max = allowed.length) {
  if (!Array.isArray(value) || value.length < 1 || value.length > max) return null;
  if (value.some((item) => typeof item !== "string" || !allowed.includes(item))) return null;
  const unique = [...new Set(value)];
  return unique.length === value.length ? unique as string[] : null;
}

function positiveInteger(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1 ? value : null;
}

function validateSocialAccounts(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  if (entries.length > COMPANY_SOCIAL_PLATFORMS.length) return null;
  const result: Record<string, string> = {};
  for (const [platform, username] of entries) {
    if (!(COMPANY_SOCIAL_PLATFORMS as readonly string[]).includes(platform)) return null;
    if (typeof username !== "string" || !username.trim() || username.trim().length > 100) return null;
    result[platform] = username.trim().replace(/^@/, "");
  }
  return result;
}

function validateDeliverables(value: unknown, platforms: string[]) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  if (entries.length !== platforms.length || entries.length > REQUESTED_PLATFORMS.length) return null;
  const result: Record<string, PlatformDeliverable[]> = {};
  for (const platform of platforms) {
    const items = (value as Record<string, unknown>)[platform];
    const allowed = PLATFORM_DELIVERABLES[platform as keyof typeof PLATFORM_DELIVERABLES] as readonly string[];
    if (!Array.isArray(items) || items.length < 1 || items.length > allowed.length) return null;
    const seen = new Set<string>();
    const validated: PlatformDeliverable[] = [];
    for (const raw of items) {
      if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
      const item = raw as Record<string, unknown>;
      if (typeof item.type !== "string" || !allowed.includes(item.type) || seen.has(item.type)) return null;
      const count = positiveInteger(item.count);
      if (!count) return null;
      let otherText: string | null = null;
      if (item.type === "other") {
        if (typeof item.other_text !== "string" || !item.other_text.trim() || item.other_text.trim().length > 200) return null;
        otherText = item.other_text.trim();
      } else if (item.other_text != null && item.other_text !== "") {
        return null;
      }
      seen.add(item.type);
      validated.push({ type: item.type, count, other_text: otherText });
    }
    result[platform] = validated;
  }
  if (Object.keys(value).some((key) => !platforms.includes(key))) return null;
  return result;
}

export async function POST(request: NextRequest) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return errorResponse("入力内容が大きすぎます。", 413);

  let body: Body;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return errorResponse("入力内容が大きすぎます。", 413);
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error();
    body = value as Body;
  } catch {
    return errorResponse("入力内容を確認してください。");
  }

  if (typeof body.website === "string" && body.website.trim()) {
    return NextResponse.json<CreatorLinkPublicInquiryResponse>({ ok: true });
  }
  if (
    typeof body.slug !== "string" ||
    !isCreatorLinkInquiryFormKind(body.formKind) ||
    typeof body.formId !== "string" ||
    !UUID_PATTERN.test(body.formId) ||
    !isInquirySubmissionId(body.submissionId)
  ) {
    return errorResponse("問い合わせ先が正しくありません。");
  }
  const slugValidation = validateCreatorLinkSlug(body.slug);
  if (!slugValidation.valid) return errorResponse("問い合わせ先が正しくありません。");
  const submissionId = body.submissionId;

  const contactName = text(body, "contact_name", 80, true);
  const contactEmail = text(body, "contact_email", 254, true);
  if (!contactName.ok || !contactEmail.ok || !contactEmail.value || !isValidInquiryEmail(contactEmail.value)) {
    return errorResponse("担当者名と正しいメールアドレスを入力してください。");
  }

  let companyUserId: string | null = null;
  if (body.formKind === "pr") {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return errorResponse("見積もり依頼には企業アカウントでのログインが必要です。", 401);
    }
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id,approval_status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (companyError) {
      console.error("[trendre-link/public-inquiries] company lookup failed");
      return errorResponse("企業アカウントを確認できませんでした。", 500);
    }
    if (!company || company.approval_status !== "approved") {
      return errorResponse("承認済みの企業アカウントでログインしてください。", 403);
    }
    companyUserId = user.id;
  }

  let insert: Record<string, unknown>;
  if (body.formKind === "simple") {
    const subject = text(body, "subject", 120);
    const message = text(body, "message", 3000, true);
    if (!subject.ok || !message.ok) return errorResponse("お問い合わせ内容を確認してください。");
    insert = {
      company_name: null,
      product_name: null,
      desired_timing: null,
      budget_text: null,
      requested_platform: null,
      offer_type: null,
      purpose: subject.value,
      message: message.value,
      request_data: {},
    };
  } else {
    const requestMode = selection(body.request_mode, REQUEST_MODES);
    const companyName = text(body, "company_name", 120, true);
    const productName = text(body, "product_name", 200, true);
    const productUrl = url(body, "product_url");
    const desiredTiming = text(body, "desired_timing", 120, true);
    const budget = text(body, "budget_text", 12, true);
    const companyWebsite = url(body, "company_website");
    const sellingPoints = text(body, "selling_points", 2000);
    const referenceUrl = url(body, "reference_url");
    const additionalNotes = text(body, "additional_notes", 3000);
    const hasFreeOffer = selection(body.has_free_offer, FREE_OFFER_OPTIONS);
    const freeOfferItem = text(body, "free_offer_item", 200, hasFreeOffer === "provided");
    const freeOfferQuantity = text(body, "free_offer_quantity", 80);
    const freeOfferFrequency = text(body, "free_offer_frequency", 80);
    const freeOfferPeople = text(body, "free_offer_people", 80);
    const freeOfferConditions = text(body, "free_offer_conditions", 1000);
    const socialAccounts = validateSocialAccounts(body.company_social_accounts);
    const consents = body.consents;

    if (!requestMode || !companyName.ok || !productName.ok || !productUrl.ok || !desiredTiming.ok ||
      !budget.ok || !budget.value || !/^[1-9]\d*$/.test(budget.value) || !companyWebsite.ok ||
      !sellingPoints.ok || !referenceUrl.ok || !additionalNotes.ok || !hasFreeOffer ||
      !freeOfferItem.ok || !freeOfferQuantity.ok || !freeOfferFrequency.ok || !freeOfferPeople.ok ||
      !freeOfferConditions.ok || !socialAccounts) {
      return errorResponse("必須項目、URL、予算、入力文字数を確認してください。");
    }
    if (!Array.isArray(consents) || consents.length !== 6 || consents.some((value) => value !== true)) {
      return errorResponse("すべての確認事項への同意が必要です。");
    }

    const requestData: CreatorLinkRequestData = {
      request_mode: requestMode as "pr_post" | "ugc",
      product_name: productName.value,
      product_url: productUrl.value,
      desired_timing: desiredTiming.value,
      budget_text: budget.value,
      has_free_offer: hasFreeOffer === "provided",
      free_offer_item: freeOfferItem.value,
      free_offer_quantity: freeOfferQuantity.value,
      free_offer_frequency: freeOfferFrequency.value,
      free_offer_people: freeOfferPeople.value,
      free_offer_conditions: freeOfferConditions.value,
      company_website: companyWebsite.value,
      company_social_accounts: socialAccounts,
      selling_points: sellingPoints.value,
      reference_url: referenceUrl.value,
      additional_notes: additionalNotes.value,
      consent_data: {
        accepted_at: new Date().toISOString(),
        terms_accepted: true,
        privacy_accepted: true,
        truthful_information_confirmed: true,
        no_false_experience_request_confirmed: true,
        no_forced_positive_opinion_confirmed: true,
        account_activation_notice_accepted: true,
        platform_transaction_accepted: true,
        terms_version: TERMS_VERSION,
        privacy_version: PRIVACY_VERSION,
      },
    };

    let requestedPlatform: string | null = null;
    let purpose: string = requestMode;
    if (requestMode === "ugc") {
      const types = selections(body.ugc_deliverable_types, UGC_DELIVERABLE_TYPES);
      const otherDeliverable = text(body, "ugc_other_deliverable", 200, types?.includes("other"));
      const count = positiveInteger(body.deliverable_count);
      const purposes = selections(body.usage_purposes, UGC_USAGE_PURPOSES);
      const usageOther = text(body, "usage_other", 200, purposes?.includes("other"));
      const meeting = selection(body.meeting_method, MEETING_METHODS);
      if (!types || !otherDeliverable.ok || !count || !purposes || !usageOther.ok || !meeting) {
        return errorResponse("UGC制作の制作物、制作数、用途、打ち合わせ方法を確認してください。");
      }
      requestData.ugc_deliverable_types = types;
      requestData.ugc_other_deliverable = otherDeliverable.value;
      requestData.deliverable_count = count;
      requestData.usage_purposes = purposes;
      requestData.usage_other = usageOther.value;
      requestData.meeting_method = meeting;
    } else {
      const projectType = selection(body.project_type, PR_PROJECT_TYPES);
      const platforms = selections(body.requested_platforms, REQUESTED_PLATFORMS);
      const otherPlatform = text(body, "other_platform", 100, platforms?.includes("other"));
      const deliverables = platforms ? validateDeliverables(body.deliverables_by_platform, platforms) : null;
      const campaignGoal = selection(body.campaign_goal, CAMPAIGN_GOALS);
      const goalOther = text(body, "campaign_goal_other", 200, campaignGoal === "other");
      if (!projectType || !platforms || !otherPlatform.ok || !deliverables || !campaignGoal || !goalOther.ok) {
        return errorResponse("PR投稿の案件タイプ、SNS、制作物、制作数、目的を確認してください。");
      }
      requestData.project_type = projectType;
      requestData.requested_platforms = platforms;
      requestData.other_platform = otherPlatform.value;
      requestData.deliverables_by_platform = deliverables;
      requestData.campaign_goal = campaignGoal;
      requestData.campaign_goal_other = goalOther.value;
      requestedPlatform = platforms.join(",");
      purpose = projectType;
    }

    insert = {
      company_name: companyName.value,
      product_name: productName.value,
      desired_timing: desiredTiming.value,
      budget_text: budget.value,
      requested_platform: requestedPlatform,
      offer_type: hasFreeOffer,
      purpose,
      message: additionalNotes.value,
      request_data: requestData,
    };
  }

  try {
    const { data: page, error: pageError } = await supabaseAdmin
      .from("creator_link_pages")
      .select("id, creator_id, owner_user_id, status, is_accepting_inquiries")
      .eq("slug", slugValidation.normalizedSlug)
      .eq("status", "published")
      .eq("is_accepting_inquiries", true)
      .maybeSingle();
    if (pageError) throw pageError;
    if (!page) return errorResponse("現在、このページでは問い合わせを受け付けていません。", 404);

    let typeQuery = supabaseAdmin.from("creator_link_inquiry_types")
      .select("id, page_id, template_key, title, is_custom, is_enabled")
      .eq("id", body.formId)
      .eq("page_id", page.id)
      .eq("is_enabled", true);
    typeQuery = body.formKind === "simple"
      ? typeQuery.is("template_key", null)
      : typeQuery.eq("template_key", "pr_post");
    const { data: inquiryType, error: typeError } = await typeQuery.maybeSingle();
    if (typeError) throw typeError;
    if (
      !inquiryType ||
      !isPublicInquiryFormTarget({
        pageStatus: page.status,
        isAcceptingInquiries: page.is_accepting_inquiries,
        pageId: page.id,
        formPageId: inquiryType.page_id,
        formEnabled: inquiryType.is_enabled,
        requestedKind: body.formKind,
        templateKey: inquiryType.template_key,
        isCustom: inquiryType.is_custom,
      })
    ) {
      return errorResponse("このフォームは現在公開されていません。", 404);
    }

    let existingQuery = supabaseAdmin
      .from("creator_inquiries")
      .select("id,link_page_id,inquiry_type_id")
      .eq("submission_id", submissionId);
    existingQuery = companyUserId
      ? existingQuery.eq("company_user_id", companyUserId)
      : existingQuery.is("company_user_id", null).eq("link_page_id", page.id);
    const { data: existing, error: existingError } = await existingQuery.maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      if (!matchesInquirySubmissionTarget(existing, { pageId: page.id, formId: inquiryType.id })) {
        return errorResponse("この送信IDは別の問い合わせで使用されています。", 409);
      }
      return NextResponse.json<CreatorLinkPublicInquiryResponse>({
        ok: true,
        inquiryId: existing.id,
        duplicate: true,
      });
    }

    const inquiryPayload = {
      creator_id: page.creator_id,
      creator_user_id: page.owner_user_id,
      company_user_id: companyUserId,
      link_page_id: page.id,
      inquiry_type_id: inquiryType.id,
      submission_id: submissionId,
      inquiry_type_title_snapshot: inquiryType.title,
      inquiry_type: body.formKind === "simple" ? "other" : "pr_post",
      contact_name: contactName.value,
      contact_email: contactEmail.value,
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
      ...insert,
    };
    const insertion = await insertOrRecoverUnique({
      insert: async () => {
        const { data, error } = await supabaseAdmin
          .from("creator_inquiries")
          .insert(inquiryPayload)
          .select("id,link_page_id,inquiry_type_id")
          .single();
        return { data, error };
      },
      recover: async () => {
        let racedQuery = supabaseAdmin
          .from("creator_inquiries")
          .select("id,link_page_id,inquiry_type_id")
          .eq("submission_id", submissionId);
        racedQuery = companyUserId
          ? racedQuery.eq("company_user_id", companyUserId)
          : racedQuery.is("company_user_id", null).eq("link_page_id", page.id);
        const { data, error } = await racedQuery.maybeSingle();
        return { data, error };
      },
      validateRecovered: (raced) =>
        matchesInquirySubmissionTarget(raced, {
          pageId: page.id,
          formId: inquiryType.id,
        }),
      missingError: "inquiry_insert_missing",
    });
    return NextResponse.json<CreatorLinkPublicInquiryResponse>({
      ok: true,
      inquiryId: insertion.value.id,
      ...(insertion.duplicate ? { duplicate: true } : {}),
    });
  } catch (cause) {
    console.error("[trendre-link/public-inquiries] inquiry insert failed", {
      cause: cause instanceof Error ? cause.message : "unknown",
    });
    return errorResponse("送信できませんでした。入力内容を残したまま、もう一度お試しください。", 500);
  }
}
