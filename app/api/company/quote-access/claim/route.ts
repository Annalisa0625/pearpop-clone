import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { allowQuoteAccessRequest } from "@/lib/trendre-link/request-rate-limit";
import {
  claimQuoteAccess,
  hashClaimToken,
  isTrustedRequestOrigin,
  normalizeEmail,
} from "@/lib/trendre-link/quote-access";

export const dynamic = "force-dynamic";

const CLAIM_PATTERN = /^[A-Za-z0-9_-]{40,100}$/;
const AUTH_TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,500}$/;

function errorResult(status = 400) {
  return NextResponse.json(
    { ok: false, error: "見積もりを確認できませんでした。" },
    { status, headers: { "cache-control": "no-store" } }
  );
}

export async function POST(request: NextRequest) {
  if (
    !allowQuoteAccessRequest({
      request,
      scope: "quote-claim",
      limit: 20,
      windowMs: 10 * 60 * 1000,
    })
  ) {
    return errorResult(429);
  }
  if (!isTrustedRequestOrigin(request)) {
    return errorResult(403);
  }

  let payload: { claim?: unknown; tokenHash?: unknown };
  try {
    payload = await request.json() as { claim?: unknown; tokenHash?: unknown };
  } catch {
    return errorResult();
  }
  const rawClaimToken = typeof payload.claim === "string" ? payload.claim : "";
  const authTokenHash = typeof payload.tokenHash === "string" ? payload.tokenHash : "";
  if (!CLAIM_PATTERN.test(rawClaimToken) || !AUTH_TOKEN_PATTERN.test(authTokenHash)) {
    return errorResult();
  }

  try {
    const supabase = await createSupabaseServerClient();
    let {
      data: { user },
    } = await supabase.auth.getUser();

    // A repeated visit by the already-claimed user is idempotent. Otherwise,
    // verification only occurs now, after the explicit button press.
    if (!user?.email) {
      const { data, error } = await supabase.auth.verifyOtp({
        type: "email",
        token_hash: authTokenHash,
      });
      if (error || !data.user?.email) {
        return errorResult();
      }
      user = data.user;
    } else {
      const existingEmail = normalizeEmail(user.email);
      const { data: access, error: accessError } = await (supabaseAdmin as any)
        .from("creator_inquiry_quote_access")
        .select("contact_email")
        .eq("claim_token_hash", hashClaimToken(rawClaimToken))
        .eq("user_id", user.id)
        .maybeSingle();
      if (accessError) throw new Error("quote_access_session_check_failed");
      if (!access || access.contact_email !== existingEmail) {
        const { data, error } = await supabase.auth.verifyOtp({
          type: "email",
          token_hash: authTokenHash,
        });
        if (error || !data.user?.email) {
          return errorResult();
        }
        user = data.user;
      }
    }

    const claimed = await claimQuoteAccess({ rawClaimToken, user });
    if (!claimed) {
      return errorResult();
    }
    return NextResponse.json(
      { ok: true, redirectTo: `/b/quotes/${claimed.quoteId}` },
      { headers: { "cache-control": "no-store", "referrer-policy": "no-referrer" } }
    );
  } catch {
    console.error("quote access claim failed");
    return errorResult();
  }
}
