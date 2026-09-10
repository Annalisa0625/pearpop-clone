import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { normalizeNextPath } from "@/lib/auth/next-path";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const callbackUrl = new URL("/signup/company", request.url);
  const safeNext = normalizeNextPath(request.nextUrl.searchParams.get("next"));
  if (safeNext) callbackUrl.searchParams.set("next", safeNext);

  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (!tokenHash || type !== "email") {
    callbackUrl.searchParams.set("auth_error", "invalid_or_expired");
    return NextResponse.redirect(callbackUrl);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as EmailOtpType,
  });
  if (error) callbackUrl.searchParams.set("auth_error", "invalid_or_expired");

  return NextResponse.redirect(callbackUrl);
}
