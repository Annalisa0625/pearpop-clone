// File: app/api/line/login/callback/route.ts
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { LineAlreadyLinkedError, assertLineUserOwnership } from "@/lib/line/link-ownership";
import {
  isSafeLineOAuthReturnPath,
  resolveLineOAuthCallbackUrl,
  resolveLineOAuthReturnUrl,
} from "@/lib/line/oauth-origin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const LINE_TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";
const LINE_PROFILE_URL = "https://api.line.me/v2/profile";
const LINE_FRIENDSHIP_URL = "https://api.line.me/friendship/v1/status";
const STATE_COOKIE = "trendre_line_oauth_nonce";

type LineLoginState = {
  app_user_id: string;
  creator_id: string | null;
  return_to: string;
  nonce: string;
  exp: number;
};

type LineTokenResponse = { access_token?: string };
type LineProfileResponse = {
  userId?: string;
  displayName?: string;
  pictureUrl?: string;
  statusMessage?: string;
};
type LineFriendshipResponse = { friendFlag?: boolean };

function getLineLoginChannelId() {
  return process.env.LINE_LOGIN_CHANNEL_ID?.trim() ?? "";
}

function getLineLoginChannelSecret() {
  return process.env.LINE_LOGIN_CHANNEL_SECRET?.trim() ?? "";
}

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(resolveLineOAuthReturnUrl(request, path));
}

function withLineResult(path: string, result: string) {
  const url = new URL(path, "https://trendre.invalid");
  url.searchParams.set("line", result);
  return `${url.pathname}${url.search}${url.hash}`;
}

function clearStateCookie(response: NextResponse) {
  response.cookies.set(STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/api/line/login/callback",
  });
  return response;
}

function redirectWithClearedState(request: NextRequest, path: string) {
  return clearStateCookie(redirectTo(request, path));
}

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );
  return Buffer.from(padded, "base64").toString("utf8");
}

function verifyState(value: string | null): LineLoginState | null {
  if (!value) return null;

  const secret = getLineLoginChannelSecret();
  if (!secret) return null;

  const [body, signature] = value.split(".");
  if (!body || !signature) return null;

  const expectedSignature = base64UrlEncode(
    crypto.createHmac("sha256", secret).update(body).digest()
  );
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(body)) as Partial<LineLoginState>;

    if (
      typeof parsed.app_user_id !== "string" ||
      typeof parsed.return_to !== "string" ||
      typeof parsed.nonce !== "string" ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }

    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    if (!isSafeLineOAuthReturnPath(parsed.return_to)) {
      return null;
    }

    return {
      app_user_id: parsed.app_user_id,
      creator_id: typeof parsed.creator_id === "string" ? parsed.creator_id : null,
      return_to: parsed.return_to,
      nonce: parsed.nonce,
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}

async function exchangeCodeForToken(request: NextRequest, code: string) {
  const res = await fetch(LINE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: resolveLineOAuthCallbackUrl(request),
      client_id: getLineLoginChannelId(),
      client_secret: getLineLoginChannelSecret(),
    }),
  });

  const json = (await res.json().catch(() => null)) as LineTokenResponse | null;
  if (!res.ok || !json?.access_token) {
    throw new Error(`LINE token exchange failed: ${res.status}`);
  }

  return json.access_token;
}

async function getLineLoginProfile(accessToken: string) {
  const res = await fetch(LINE_PROFILE_URL, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const json = (await res.json().catch(() => null)) as LineProfileResponse | null;
  if (!res.ok || !json?.userId) {
    throw new Error(`LINE profile fetch failed: ${res.status}`);
  }

  return json;
}

async function getLineFriendshipStatus(accessToken: string) {
  try {
    const res = await fetch(LINE_FRIENDSHIP_URL, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const json = (await res.json().catch(() => null)) as LineFriendshipResponse | null;
    if (!res.ok) return null;
    return json;
  } catch {
    return null;
  }
}

async function saveLineLink(args: {
  state: LineLoginState;
  profile: LineProfileResponse;
  isFriend: boolean;
}) {
  if (!args.profile.userId) {
    throw new Error("LINE userId is missing");
  }

  const admin = supabaseAdmin as any;
  const now = new Date().toISOString();

  await assertLineUserOwnership(admin, args.profile.userId, args.state.app_user_id);

  const { error } = await admin.from("line_user_links").upsert(
    {
      app_user_id: args.state.app_user_id,
      creator_id: args.state.creator_id,
      line_user_id: args.profile.userId,
      line_display_name: args.profile.displayName ?? null,
      line_picture_url: args.profile.pictureUrl ?? null,
      line_status_message: args.profile.statusMessage ?? null,
      is_enabled: true,
      blocked_at: null,
      linked_at: now,
      last_event_at: now,
      updated_at: now,
    },
    { onConflict: "app_user_id" }
  );

  if (error) throw error;
}

function nonceMatches(expected: string, actual: string | undefined) {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual ?? "");
  return (
    expectedBuffer.length === actualBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

async function getCurrentCreatorId(userId: string) {
  const admin = supabaseAdmin as any;
  const { data, error } = await admin
    .from("creators")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return typeof data?.id === "string" ? data.id : null;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateValue = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");

  if (providerError) {
    console.warn("LINE Login provider error:", {
      error: providerError,
      description: url.searchParams.get("error_description"),
    });
    const errorState = verifyState(stateValue);
    const validErrorState =
      errorState && nonceMatches(errorState.nonce, request.cookies.get(STATE_COOKIE)?.value)
        ? errorState
        : null;
    return redirectWithClearedState(
      request,
      validErrorState
        ? withLineResult(validErrorState.return_to, "cancelled")
        : "/creator/payouts?from=signup&line=cancelled"
    );
  }

  const state = verifyState(stateValue);
  if (!state || !code) {
    return redirectWithClearedState(request, "/creator/payouts?from=signup&line=invalid");
  }

  try {
    if (!nonceMatches(state.nonce, request.cookies.get(STATE_COOKIE)?.value)) {
      return redirectWithClearedState(request, withLineResult(state.return_to, "invalid"));
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const currentCreatorId = user ? await getCurrentCreatorId(user.id) : null;
    if (!user || user.id !== state.app_user_id || !state.creator_id || currentCreatorId !== state.creator_id) {
      return redirectWithClearedState(request, withLineResult(state.return_to, "error"));
    }

    const accessToken = await exchangeCodeForToken(request, code);
    const profile = await getLineLoginProfile(accessToken);
    const friendship = await getLineFriendshipStatus(accessToken);
    const isFriend =
      typeof friendship?.friendFlag === "boolean" ? friendship.friendFlag : true;

    await saveLineLink({ state, profile, isFriend });

    return redirectWithClearedState(request, withLineResult(state.return_to, "linked"));
  } catch (error) {
    if (error instanceof LineAlreadyLinkedError) {
      return redirectWithClearedState(request, withLineResult(state.return_to, "already_linked"));
    }

    console.error("LINE Login callback error:", error);
    return redirectWithClearedState(request, withLineResult(state.return_to, "error"));
  }
}
