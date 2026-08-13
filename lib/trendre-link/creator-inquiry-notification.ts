import { Resend } from "resend";

import { createNotification } from "@/lib/notifications/createNotification";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getTrustedAppUrl } from "@/lib/trendre-link/quote-access";

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** A saved inquiry must never depend on notification delivery succeeding. */
export async function notifyCreatorOfLinkInquiry(args: {
  inquiryId: string;
  creatorUserId: string;
}) {
  const linkPath = `/creator/orders/inquiries/${args.inquiryId}`;
  try {
    await createNotification({
      recipientUserId: args.creatorUserId,
      notificationType: "trendre_link_inquiry_received",
      title: "Trendre Linkに新しい仕事相談が届きました",
      body: "ログインして相談内容を確認してください。",
      linkPath,
      entityType: "creator_inquiry",
      entityId: args.inquiryId,
      importance: "high",
      dedupeKey: `trendre-link-creator-inquiry:${args.inquiryId}`,
      bypassInAppPreferences: true,
    });
  } catch {
    console.warn("trendre link inquiry in-app notification failed", { inquiryId: args.inquiryId });
  }

  const appUrl = getTrustedAppUrl();
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!appUrl || !apiKey || !from) return { email: "not_configured" as const };

  try {
    const { data: userResult, error: userError } = await supabaseAdmin.auth.admin.getUserById(args.creatorUserId);
    const email = userResult.user?.email?.trim();
    if (userError || !email) return { email: "unavailable" as const };
    const destination = new URL(linkPath, appUrl).toString();
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: email,
      subject: "Trendre Linkに新しい仕事相談が届きました",
      html: `<div style="margin:0;padding:32px 16px;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a"><div style="max-width:560px;margin:0 auto;padding:32px;background:#fff;border-radius:20px"><div style="font-size:20px;font-weight:800">Trendre</div><h1 style="margin:28px 0 12px;font-size:24px;line-height:1.5">Trendre Linkに新しい仕事相談が届きました</h1><p style="margin:0;color:#475569;font-size:15px;line-height:1.8">ログインして相談内容を確認してください。</p><a href="${escapeHtml(destination)}" style="display:inline-block;margin-top:24px;padding:14px 24px;border-radius:999px;background:#0f172a;color:#fff;font-size:15px;font-weight:700;text-decoration:none">相談内容を確認する</a></div></div>`,
      text: `Trendre Linkに新しい仕事相談が届きました。\n\nログインして相談内容を確認してください。\n${destination}`,
    }, { idempotencyKey: `trendre-link-creator-inquiry/${args.inquiryId}` });
    if (error || !data?.id) throw error ?? new Error("resend_send_failed");
    return { email: "sent" as const };
  } catch {
    console.warn("trendre link inquiry email notification failed", { inquiryId: args.inquiryId });
    return { email: "failed" as const };
  }
}
