// File: app/api/line/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getLineProfile,
  replyLineText,
  verifyLineSignature,
} from "@/lib/notifications/line";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type LineWebhookBody = {
  destination?: string;
  events?: LineWebhookEvent[];
};

type LineWebhookEvent = {
  type: string;
  replyToken?: string;
  timestamp?: number;
  source?: {
    type?: string;
    userId?: string;
    groupId?: string;
    roomId?: string;
  };
  message?: {
    type?: string;
    text?: string;
  };
  webhookEventId?: string;
};

function extractLinkCode(text: string) {
  const normalized = text.trim().toUpperCase();

  const exact = normalized.match(/^[A-Z0-9]{6}$/);
  if (exact) return exact[0];

  const labeled = normalized.match(/(?:連携|リンク|LINK|CODE|コード)\s*[:：]?\s*([A-Z0-9]{6})/);
  if (labeled) return labeled[1];

  return null;
}

async function handleTextMessage(event: LineWebhookEvent) {
  const lineUserId = event.source?.userId;
  const text = event.message?.text ?? "";
  const replyToken = event.replyToken;

  if (!lineUserId || !replyToken) return;

  const code = extractLinkCode(text);

  if (!code) {
    await replyLineText(
      replyToken,
      "Trend Martです。\nLINE連携をする場合は、Trend Martの画面で発行した6桁の連携コードを送信してください。"
    );
    return;
  }

  const admin = supabaseAdmin as any;
  const now = new Date().toISOString();

  const { data: linkCode, error: codeError } = await admin
    .from("line_link_codes")
    .select("id, app_user_id, creator_id, code, expires_at, used_at")
    .eq("code", code)
    .is("used_at", null)
    .gt("expires_at", now)
    .maybeSingle();

  if (codeError) {
    console.error("line code lookup error:", codeError);

    await replyLineText(
      replyToken,
      "連携コードの確認中にエラーが発生しました。少し時間を置いてもう一度お試しください。"
    );
    return;
  }

  if (!linkCode) {
    await replyLineText(
      replyToken,
      "連携コードが見つからないか、有効期限が切れています。\nTrend Martの画面で新しいコードを発行してください。"
    );
    return;
  }

  const profile = await getLineProfile(lineUserId);

  const { error: upsertError } = await admin.from("line_user_links").upsert(
    {
      app_user_id: linkCode.app_user_id,
      creator_id: linkCode.creator_id,
      line_user_id: lineUserId,
      line_display_name: profile?.displayName ?? null,
      line_picture_url: profile?.pictureUrl ?? null,
      line_status_message: profile?.statusMessage ?? null,
      is_enabled: true,
      blocked_at: null,
      linked_at: now,
      last_event_at: now,
      updated_at: now,
    },
    {
      onConflict: "app_user_id",
    }
  );

  if (upsertError) {
    console.error("line link upsert error:", upsertError);

    await replyLineText(
      replyToken,
      "LINE連携の保存に失敗しました。もう一度お試しください。"
    );
    return;
  }

  await admin
    .from("line_link_codes")
    .update({
      used_at: now,
      used_line_user_id: lineUserId,
    })
    .eq("id", linkCode.id);

  await replyLineText(
    replyToken,
    "LINE連携が完了しました。\n新しい注文・メッセージ・修正依頼・完了通知をLINEで受け取れます。"
  );
}

async function handleFollowEvent(event: LineWebhookEvent) {
  if (!event.replyToken) return;

  await replyLineText(
    event.replyToken,
    "Trend Mart公式アカウントを追加ありがとうございます。\nTrend Martの画面でLINE連携コードを発行し、このトークに送信すると通知を受け取れるようになります。"
  );
}

async function handleUnfollowEvent(event: LineWebhookEvent) {
  const lineUserId = event.source?.userId;
  if (!lineUserId) return;

  const admin = supabaseAdmin as any;
  const now = new Date().toISOString();

  const { error } = await admin
    .from("line_user_links")
    .update({
      is_enabled: false,
      blocked_at: now,
      updated_at: now,
      last_event_at: now,
    })
    .eq("line_user_id", lineUserId);

  if (error) {
    console.error("line unfollow update error:", error);
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature");

  if (!verifyLineSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid LINE signature" }, { status: 401 });
  }

  let body: LineWebhookBody;

  try {
    body = JSON.parse(rawBody) as LineWebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const events = body.events ?? [];

    await Promise.all(
      events.map(async (event) => {
        if (event.type === "message" && event.message?.type === "text") {
          await handleTextMessage(event);
          return;
        }

        if (event.type === "follow") {
          await handleFollowEvent(event);
          return;
        }

        if (event.type === "unfollow") {
          await handleUnfollowEvent(event);
        }
      })
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("line webhook error:", error);

    // LINE retries non-2xx responses. Return 200 after logging to avoid retry loops
    // for unexpected app-side issues.
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "trendre-line-webhook" });
}
