// File: lib/notifications/line.ts
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type LineTextMessage = {
  type: "text";
  text: string;
};

type LinePushPayload = {
  to: string;
  messages: LineTextMessage[];
};

type SendLineTextOptions = {
  notificationType?: string;
  recipientUserId?: string | null;
  creatorId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
};

const LINE_API_BASE_URL = "https://api.line.me/v2/bot";

function getLineChannelAccessToken() {
  return process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim() ?? "";
}

export function getLineChannelSecret() {
  return process.env.LINE_CHANNEL_SECRET?.trim() ?? "";
}

export function isLineConfigured() {
  return Boolean(getLineChannelAccessToken() && getLineChannelSecret());
}

export function verifyLineSignature(rawBody: string, signature: string | null) {
  const channelSecret = getLineChannelSecret();

  if (!channelSecret || !signature) return false;

  const expected = crypto
    .createHmac("sha256", channelSecret)
    .update(rawBody)
    .digest("base64");

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

async function writeNotificationLog(input: {
  status: "sent" | "failed" | "skipped";
  lineUserId?: string | null;
  message: string;
  responseJson?: unknown;
  errorMessage?: string | null;
  options?: SendLineTextOptions;
}) {
  try {
    const admin = supabaseAdmin as any;

    await admin.from("notification_logs").insert({
      channel: "line",
      recipient_user_id: input.options?.recipientUserId ?? null,
      creator_id: input.options?.creatorId ?? null,
      notification_type: input.options?.notificationType ?? null,
      entity_type: input.options?.entityType ?? null,
      entity_id: input.options?.entityId ?? null,
      line_user_id: input.lineUserId ?? null,
      status: input.status,
      message: input.message,
      response_json: input.responseJson ?? null,
      error_message: input.errorMessage ?? null,
    });
  } catch (error) {
    console.error("line notification log error:", error);
  }
}

export async function sendLineTextToLineUserId(
  lineUserId: string,
  message: string,
  options: SendLineTextOptions = {}
) {
  const channelAccessToken = getLineChannelAccessToken();

  if (!channelAccessToken) {
    await writeNotificationLog({
      status: "skipped",
      lineUserId,
      message,
      errorMessage: "LINE_CHANNEL_ACCESS_TOKEN is not configured",
      options,
    });

    return { ok: false, skipped: true, error: "LINE is not configured" };
  }

  const payload: LinePushPayload = {
    to: lineUserId,
    messages: [{ type: "text", text: message }],
  };

  try {
    const res = await fetch(`${LINE_API_BASE_URL}/message/push`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await res.text();
    const responseJson = responseText ? safeJsonParse(responseText) : null;

    if (!res.ok) {
      await writeNotificationLog({
        status: "failed",
        lineUserId,
        message,
        responseJson,
        errorMessage: `LINE push failed: ${res.status}`,
        options,
      });

      return {
        ok: false,
        skipped: false,
        error: `LINE push failed: ${res.status}`,
        response: responseJson,
      };
    }

    await writeNotificationLog({
      status: "sent",
      lineUserId,
      message,
      responseJson,
      options,
    });

    return { ok: true, skipped: false, response: responseJson };
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Unknown error";

    await writeNotificationLog({
      status: "failed",
      lineUserId,
      message,
      errorMessage: messageText,
      options,
    });

    return { ok: false, skipped: false, error: messageText };
  }
}

export async function sendLineTextToUserId(
  appUserId: string,
  message: string,
  options: Omit<SendLineTextOptions, "recipientUserId"> = {}
) {
  const admin = supabaseAdmin as any;

  const { data: link, error } = await admin
    .from("line_user_links")
    .select("line_user_id, creator_id, is_enabled, blocked_at")
    .eq("app_user_id", appUserId)
    .maybeSingle();

  if (error) {
    console.error("line link lookup error:", error);

    await writeNotificationLog({
      status: "failed",
      lineUserId: null,
      message,
      errorMessage: error.message,
      options: {
        ...options,
        recipientUserId: appUserId,
      },
    });

    return { ok: false, skipped: false, error: error.message };
  }

  if (!link?.line_user_id || link.is_enabled === false || link.blocked_at) {
    await writeNotificationLog({
      status: "skipped",
      lineUserId: link?.line_user_id ?? null,
      message,
      errorMessage: "LINE account is not linked or disabled",
      options: {
        ...options,
        recipientUserId: appUserId,
        creatorId: options.creatorId ?? link?.creator_id ?? null,
      },
    });

    return { ok: false, skipped: true, error: "LINE account is not linked" };
  }

  return sendLineTextToLineUserId(link.line_user_id, message, {
    ...options,
    recipientUserId: appUserId,
    creatorId: options.creatorId ?? link.creator_id ?? null,
  });
}

export async function replyLineText(replyToken: string, message: string) {
  const channelAccessToken = getLineChannelAccessToken();

  if (!channelAccessToken) {
    return { ok: false, error: "LINE_CHANNEL_ACCESS_TOKEN is not configured" };
  }

  const res = await fetch(`${LINE_API_BASE_URL}/message/reply`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${channelAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text: message }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();

    return {
      ok: false,
      error: `LINE reply failed: ${res.status}`,
      response: body ? safeJsonParse(body) : null,
    };
  }

  return { ok: true };
}

export async function getLineProfile(lineUserId: string) {
  const channelAccessToken = getLineChannelAccessToken();

  if (!channelAccessToken) {
    return null;
  }

  const res = await fetch(
    `${LINE_API_BASE_URL}/profile/${encodeURIComponent(lineUserId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
      },
    }
  );

  if (!res.ok) {
    return null;
  }

  const json = (await res.json()) as {
    displayName?: string;
    pictureUrl?: string;
    statusMessage?: string;
  };

  return {
    displayName: json.displayName ?? null,
    pictureUrl: json.pictureUrl ?? null,
    statusMessage: json.statusMessage ?? null,
  };
}

export function buildLineMessage(input: {
  title: string;
  body?: string | null;
  linkPath?: string | null;
}) {
  const lines = [`【Trendre】${input.title}`];

  if (input.body?.trim()) {
    lines.push("", input.body.trim());
  }

  if (input.linkPath?.trim()) {
    const appUrl = getAppBaseUrl();

    lines.push("", `${appUrl}${input.linkPath.trim()}`);
  }

  return lines.join("\n");
}

function getAppBaseUrl() {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL;

  if (!configured) return "";

  if (configured.startsWith("http://") || configured.startsWith("https://")) {
    return configured.replace(/\/$/, "");
  }

  return `https://${configured.replace(/\/$/, "")}`;
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
