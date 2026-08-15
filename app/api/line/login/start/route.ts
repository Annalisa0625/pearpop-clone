// File: app/api/line/login/start/route.ts
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { isSafeLineOAuthReturnPath, resolveLineOAuthCallbackUrl } from "@/lib/line/oauth-origin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const LINE_AUTHORIZE_URL = "https://access.line.me/oauth2/v2.1/authorize";
const STATE_TTL_SECONDS = 10 * 60;
const STATE_COOKIE = "trendre_line_oauth_nonce";

type LineLoginState = {
  app_user_id: string;
  creator_id: string | null;
  return_to: string;
  nonce: string;
  exp: number;
};

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  return token || null;
}

function getLineLoginChannelId() {
  return process.env.LINE_LOGIN_CHANNEL_ID?.trim() ?? "";
}

function getLineLoginChannelSecret() {
  return process.env.LINE_LOGIN_CHANNEL_SECRET?.trim() ?? "";
}

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signState(payload: LineLoginState) {
  const secret = getLineLoginChannelSecret();
  if (!secret) throw new Error("LINE_LOGIN_CHANNEL_SECRET is not configured");

  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = base64UrlEncode(
    crypto.createHmac("sha256", secret).update(body).digest()
  );

  return `${body}.${signature}`;
}

function normalizeReturnTo(value: unknown) {
  if (typeof value !== "string") return "/creator/payouts?from=signup&line=linked";

  const trimmed = value.trim();
  if (!isSafeLineOAuthReturnPath(trimmed)) {
    return "/creator/payouts?from=signup&line=linked";
  }

  return trimmed;
}

async function getAuthenticatedUser(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) return { user: null, error: "認証トークンがありません。" };

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) return { user: null, error: "認証に失敗しました。" };
  return { user, error: null };
}

async function getCreatorIdForUser(userId: string) {
  const admin = supabaseAdmin as any;
  const { data, error } = await admin
    .from("creators")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return typeof data?.id === "string" ? data.id : null;
}

export async function POST(request: NextRequest) {
  try {
    const channelId = getLineLoginChannelId();
    if (!channelId || !getLineLoginChannelSecret()) {
      return NextResponse.json(
        { error: "LINE Loginの環境変数が未設定です。" },
        { status: 500 }
      );
    }

    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const creatorId = await getCreatorIdForUser(user.id);
    if (!creatorId) {
      return NextResponse.json({ error: "Creator情報が見つかりません。" }, { status: 403 });
    }
    const returnTo = normalizeReturnTo(body?.return_to);
    const nonce = crypto.randomBytes(16).toString("hex");

    const state = signState({
      app_user_id: user.id,
      creator_id: creatorId,
      return_to: returnTo,
      nonce,
      exp: Math.floor(Date.now() / 1000) + STATE_TTL_SECONDS,
    });

    const authorizeUrl = new URL(LINE_AUTHORIZE_URL);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("client_id", channelId);
    authorizeUrl.searchParams.set("redirect_uri", resolveLineOAuthCallbackUrl(request));
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("scope", "profile openid");
    authorizeUrl.searchParams.set("bot_prompt", "aggressive");

    const response = NextResponse.json({ ok: true, url: authorizeUrl.toString() });
    response.cookies.set(STATE_COOKIE, nonce, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: STATE_TTL_SECONDS,
      path: "/api/line/login/callback",
    });
    return response;
  } catch (error) {
    console.error("LINE Login start error:", error);
    return NextResponse.json(
      { error: "LINE連携の開始に失敗しました。" },
      { status: 500 }
    );
  }
}
