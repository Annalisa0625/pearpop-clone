import { createHash, randomBytes } from "node:crypto";
import { createElement } from "react";
import { Resend } from "resend";
import type { User } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const QUOTE_ACCESS_LIFETIME_MS = 72 * 60 * 60 * 1000;

export type QuoteNotificationStatus = "sent" | "failed" | "not_configured";

export type QuoteNotificationResult = {
  status: QuoteNotificationStatus;
  sent: boolean;
  duplicate?: boolean;
};

type NotificationContext = {
  accessId: string;
  inquiryId: string;
  quoteId: string;
  contactEmail: string;
  creatorName: string;
  companyName: string | null;
  contactName: string | null;
  attempt: number;
};

function safeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "notification_failed";
  return message
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/[A-Za-z0-9_-]{32,}/g, "[redacted]")
    .slice(0, 500);
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function createClaimToken() {
  return randomBytes(32).toString("base64url");
}

export function hashClaimToken(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function getTrustedAppUrl() {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!configured) return null;

  try {
    const url = new URL(configured);
    const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && isLocal)) {
      return null;
    }
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

export function isTrustedRequestOrigin(request: Request) {
  const appUrl = getTrustedAppUrl();
  const origin = request.headers.get("origin");
  if (!appUrl || !origin) return false;
  try {
    return new URL(origin).origin === appUrl.origin;
  } catch {
    return false;
  }
}

function quoteEmailReact(creatorName: string, activationUrl: string) {
  const h = createElement;
  return h(
    "div",
    {
      style: {
        margin: "0",
        padding: "32px 16px",
        backgroundColor: "#f6f7f9",
        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
        color: "#0f172a",
      },
    },
    h(
      "div",
      {
        style: {
          maxWidth: "560px",
          margin: "0 auto",
          padding: "32px",
          backgroundColor: "#ffffff",
          borderRadius: "20px",
        },
      },
      h("div", { style: { fontSize: "20px", fontWeight: "800" } }, "TrendMart"),
      h(
        "h1",
        { style: { margin: "28px 0 12px", fontSize: "24px", lineHeight: "1.5" } },
        `${creatorName}さんから見積もりが届きました`
      ),
      h(
        "p",
        { style: { margin: "0", fontSize: "15px", lineHeight: "1.8", color: "#475569" } },
        "以下のボタンから内容をご確認ください。"
      ),
      h(
        "a",
        {
          href: activationUrl,
          style: {
            display: "inline-block",
            marginTop: "24px",
            padding: "14px 24px",
            borderRadius: "999px",
            backgroundColor: "#0f172a",
            color: "#ffffff",
            fontSize: "15px",
            fontWeight: "700",
            textDecoration: "none",
          },
        },
        "見積もりを確認する"
      ),
      h(
        "p",
        { style: { margin: "28px 0 0", fontSize: "12px", lineHeight: "1.8", color: "#64748b" } },
        "このリンクには有効期限があります。心当たりがない場合は、このメールを破棄してください。"
      )
    )
  );
}

function quoteEmailText(creatorName: string, activationUrl: string) {
  return [
    "TrendMart",
    "",
    `${creatorName}さんから見積もりが届きました`,
    "以下のリンクから内容をご確認ください。",
    "",
    activationUrl,
    "",
    "このリンクには有効期限があります。",
    "心当たりがない場合は、このメールを破棄してください。",
  ].join("\n");
}

async function generateSupabaseToken(
  email: string,
  metadata: { companyName: string | null; contactName: string | null }
) {
  const appUrl = getTrustedAppUrl();
  if (!appUrl) throw new Error("app_url_not_configured");

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: new URL("/company/quote-access/confirm", appUrl).toString(),
      data: {
        company_name: metadata.companyName,
        contact_name: metadata.contactName,
        source: "trendre_link_quote",
      },
    },
  });

  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) throw error ?? new Error("auth_link_generation_failed");
  return tokenHash;
}

async function deliverNotification(
  context: NotificationContext,
  rawClaimToken: string
): Promise<QuoteNotificationResult> {
  const appUrl = getTrustedAppUrl();
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();

  if (!appUrl || !apiKey || !from) {
    await (supabaseAdmin as any)
      .from("creator_inquiry_quote_access")
      .update({
        email_status: "not_configured",
        email_last_error: "notification_environment_not_configured",
      })
      .eq("id", context.accessId);
    return { status: "not_configured", sent: false };
  }

  try {
    const supabaseTokenHash = await generateSupabaseToken(context.contactEmail, {
      companyName: context.companyName,
      contactName: context.contactName,
    });
    const activationUrl = new URL("/company/quote-access/activate", appUrl);
    activationUrl.searchParams.set("claim", rawClaimToken);
    activationUrl.searchParams.set("token_hash", supabaseTokenHash);

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send(
      {
        from,
        to: context.contactEmail,
        subject: `${context.creatorName}さんから見積もりが届きました｜TrendMart`,
        react: quoteEmailReact(context.creatorName, activationUrl.toString()),
        text: quoteEmailText(context.creatorName, activationUrl.toString()),
      },
      { idempotencyKey: `creator-quote-received/${context.quoteId}/${context.attempt}` }
    );
    if (error || !data?.id) throw error ?? new Error("resend_send_failed");

    await (supabaseAdmin as any)
      .from("creator_inquiry_quote_access")
      .update({
        email_status: "sent",
        email_provider_id: data.id,
        email_sent_at: new Date().toISOString(),
        email_last_error: null,
      })
      .eq("id", context.accessId);
    return { status: "sent", sent: true };
  } catch (error) {
    await (supabaseAdmin as any)
      .from("creator_inquiry_quote_access")
      .update({
        email_status: "failed",
        email_last_error: safeErrorMessage(error),
      })
      .eq("id", context.accessId);
    return { status: "failed", sent: false };
  }
}

async function getCreatorName(creatorUserId: string) {
  const admin = supabaseAdmin as any;
  const [{ data: page }, { data: creator }] = await Promise.all([
    admin
      .from("creator_link_pages")
      .select("display_name")
      .eq("owner_user_id", creatorUserId)
      .maybeSingle(),
    admin
      .from("creators")
      .select("display_name")
      .eq("user_id", creatorUserId)
      .maybeSingle(),
  ]);
  return String(page?.display_name || creator?.display_name || "クリエイター")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .trim()
    .slice(0, 80) || "クリエイター";
}

export async function sendInitialQuoteNotification(args: {
  inquiryId: string;
  quoteId: string;
  creatorUserId: string;
  contactEmail: string;
  companyName: string | null;
  contactName: string | null;
}): Promise<QuoteNotificationResult> {
  const admin = supabaseAdmin as any;
  const { data: existing, error: existingError } = await admin
    .from("creator_inquiry_quote_access")
    .select("email_status")
    .eq("quote_id", args.quoteId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) {
    const status = existing.email_status as QuoteNotificationStatus;
    return {
      status: ["sent", "failed", "not_configured"].includes(status) ? status : "failed",
      sent: status === "sent",
      duplicate: true,
    };
  }

  const rawClaimToken = createClaimToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + QUOTE_ACCESS_LIFETIME_MS).toISOString();
  const normalizedEmail = normalizeEmail(args.contactEmail);
  const { data: access, error: insertError } = await admin
    .from("creator_inquiry_quote_access")
    .insert({
      inquiry_id: args.inquiryId,
      quote_id: args.quoteId,
      contact_email: normalizedEmail,
      claim_token_hash: hashClaimToken(rawClaimToken),
      expires_at: expiresAt,
      email_status: "pending",
      send_attempt_count: 1,
      last_send_attempt_at: now.toISOString(),
    })
    .select("id")
    .single();

  if (insertError?.code === "23505") {
    const { data: raced } = await admin
      .from("creator_inquiry_quote_access")
      .select("email_status")
      .eq("quote_id", args.quoteId)
      .maybeSingle();
    const racedStatus = raced?.email_status as QuoteNotificationStatus | undefined;
    const status =
      racedStatus && ["sent", "failed", "not_configured"].includes(racedStatus)
        ? racedStatus
        : "failed";
    return { status, sent: status === "sent", duplicate: true };
  }
  if (insertError || !access) throw insertError ?? new Error("quote_access_insert_failed");

  return deliverNotification(
    {
      accessId: access.id,
      inquiryId: args.inquiryId,
      quoteId: args.quoteId,
      contactEmail: normalizedEmail,
      creatorName: await getCreatorName(args.creatorUserId),
      companyName: args.companyName,
      contactName: args.contactName,
      attempt: 1,
    },
    rawClaimToken
  );
}

export async function resendQuoteNotification(currentRawClaimToken: string) {
  return resendQuoteNotificationFromHash(hashClaimToken(currentRawClaimToken));
}

export async function resendQuoteNotificationByQuoteId(quoteId: string) {
  const { data, error } = await (supabaseAdmin as any)
    .from("creator_inquiry_quote_access")
    .select("claim_token_hash")
    .eq("quote_id", quoteId)
    .maybeSingle();
  if (error || !data?.claim_token_hash) return null;
  return resendQuoteNotificationFromHash(data.claim_token_hash);
}

async function resendQuoteNotificationFromHash(currentHash: string) {
  const rawClaimToken = createClaimToken();
  const newHash = hashClaimToken(rawClaimToken);
  const expiresAt = new Date(Date.now() + QUOTE_ACCESS_LIFETIME_MS).toISOString();
  const admin = supabaseAdmin as any;
  const { data, error } = await admin.rpc("rotate_creator_inquiry_quote_access", {
    p_current_claim_token_hash: currentHash,
    p_new_claim_token_hash: newHash,
    p_new_expires_at: expiresAt,
  });
  const rotated = Array.isArray(data) ? data[0] : data;
  if (error || !rotated) return null;

  const { data: inquiry, error: inquiryError } = await admin
    .from("creator_inquiries")
    .select("creator_user_id,company_name,contact_name")
    .eq("id", rotated.inquiry_id)
    .single();
  if (inquiryError || !inquiry) return null;

  const result = await deliverNotification(
    {
      accessId: rotated.id,
      inquiryId: rotated.inquiry_id,
      quoteId: rotated.quote_id,
      contactEmail: normalizeEmail(rotated.contact_email),
      creatorName: await getCreatorName(inquiry.creator_user_id),
      companyName: inquiry.company_name,
      contactName: inquiry.contact_name,
      attempt: rotated.send_attempt_count,
    },
    rawClaimToken
  );
  return { result, rawClaimToken };
}

export function maskEmail(value: string) {
  const [local, domain] = normalizeEmail(value).split("@");
  if (!local || !domain) return "登録メールアドレス";
  return `${local.slice(0, 1)}***@${domain}`;
}

export async function claimQuoteAccess(args: {
  rawClaimToken: string;
  user: User;
}) {
  const email = args.user.email ? normalizeEmail(args.user.email) : null;
  if (!email) return null;

  const admin = supabaseAdmin as any;
  const claimHash = hashClaimToken(args.rawClaimToken);
  const { data, error } = await admin.rpc("claim_creator_inquiry_quote_access", {
    p_claim_token_hash: claimHash,
    p_user_id: args.user.id,
    p_email: email,
  });
  if (error || !Array.isArray(data) || data.length !== 1) return null;
  const claimed = data[0];
  if (
    !claimed?.id ||
    !claimed.inquiry_id ||
    !claimed.quote_id ||
    claimed.user_id !== args.user.id ||
    !claimed.claimed_at ||
    normalizeEmail(claimed.contact_email) !== email
  ) {
    return null;
  }

  const { data: access, error: accessError } = await admin
    .from("creator_inquiry_quote_access")
    .select("id,inquiry_id,quote_id,user_id,claimed_at,contact_email,claim_token_hash")
    .eq("id", claimed.id)
    .eq("user_id", args.user.id)
    .single();
  if (
    accessError ||
    !access ||
    access.inquiry_id !== claimed.inquiry_id ||
    access.quote_id !== claimed.quote_id ||
    access.user_id !== args.user.id ||
    !access.claimed_at ||
    access.claim_token_hash !== claimHash ||
    normalizeEmail(access.contact_email) !== email
  ) {
    return null;
  }

  const { data: inquiry, error: inquiryError } = await admin
    .from("creator_inquiries")
    .select("company_name,contact_name")
    .eq("id", access.inquiry_id)
    .single();
  if (inquiryError || !inquiry) return null;

  const [inquiryLinkResult, quoteLinkResult] = await Promise.all([
    admin
      .from("creator_inquiries")
      .update({ company_user_id: args.user.id, updated_at: new Date().toISOString() })
      .eq("id", access.inquiry_id)
      .or(`company_user_id.is.null,company_user_id.eq.${args.user.id}`)
      .select("id,company_user_id")
      .maybeSingle(),
    admin
      .from("creator_inquiry_quotes")
      .update({ company_user_id: args.user.id, updated_at: new Date().toISOString() })
      .eq("id", access.quote_id)
      .or(`company_user_id.is.null,company_user_id.eq.${args.user.id}`)
      .select("id,company_user_id")
      .maybeSingle(),
  ]);
  if (
    inquiryLinkResult.error ||
    !inquiryLinkResult.data ||
    inquiryLinkResult.data.id !== access.inquiry_id ||
    inquiryLinkResult.data.company_user_id !== args.user.id
  ) {
    throw new Error("quote_access_inquiry_link_failed");
  }
  if (
    quoteLinkResult.error ||
    !quoteLinkResult.data ||
    quoteLinkResult.data.id !== access.quote_id ||
    quoteLinkResult.data.company_user_id !== args.user.id
  ) {
    throw new Error("quote_access_quote_link_failed");
  }

  await ensureQuoteViewerAccount({
    user: args.user,
    email,
    companyName: inquiry.company_name,
    contactName: inquiry.contact_name,
  });

  return { quoteId: access.quote_id as string };
}

async function ensureQuoteViewerAccount(args: {
  user: User;
  email: string;
  companyName: string | null;
  contactName: string | null;
}) {
  const admin = supabaseAdmin as any;

  // All writes are insert-if-missing. Existing creator/company profile values
  // and role rows are never replaced.
  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: args.user.id,
      is_public: false,
      onboarding_completed: false,
      public_profile_completed: false,
    },
    { onConflict: "id", ignoreDuplicates: true }
  );
  if (profileError) throw new Error("quote_access_profile_failed");

  const { data: companyRole, error: companyRoleError } = await admin
    .from("user_roles")
    .select("user_id")
    .eq("user_id", args.user.id)
    .eq("role", "company")
    .maybeSingle();
  if (companyRoleError) throw new Error("quote_access_role_load_failed");
  if (!companyRole) {
    const { error } = await admin.from("user_roles").insert({
      user_id: args.user.id,
      role: "company",
    });
    // A deployment with a legacy single-role unique constraint keeps the
    // existing role. Quote access itself does not depend on this role row.
    if (error && error.code !== "23505") {
      throw new Error("quote_access_role_insert_failed");
    }
  }

  const { error: userStateError } = await admin.from("user_states").upsert(
    {
      user_id: args.user.id,
      creator_profile_completed: false,
      company_profile_completed: false,
      onboarding_completed: false,
      company_plan_code: "free",
      company_subscription_status: "inactive",
    },
    { onConflict: "user_id", ignoreDuplicates: true }
  );
  if (userStateError) throw new Error("quote_access_user_state_failed");

  const { error: companyError } = await admin.from("companies").upsert(
    {
      user_id: args.user.id,
      company_name: args.companyName,
      contact_email: args.email,
      approval_status: "pending",
    },
    { onConflict: "user_id", ignoreDuplicates: true }
  );
  if (companyError) throw new Error("quote_access_company_failed");

  const currentMetadata = args.user.user_metadata ?? {};
  const mergedMetadata = {
    ...currentMetadata,
    company_name: currentMetadata.company_name || args.companyName || undefined,
    contact_name: currentMetadata.contact_name || args.contactName || undefined,
    source: currentMetadata.source || "trendre_link_quote",
  };
  const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(args.user.id, {
    user_metadata: mergedMetadata,
  });
  if (metadataError) throw new Error("quote_access_metadata_failed");
}
