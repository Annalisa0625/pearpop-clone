import { NextRequest, NextResponse } from "next/server";

import { resendQuoteNotification } from "@/lib/trendre-link/quote-access";
import { allowQuoteAccessRequest } from "@/lib/trendre-link/request-rate-limit";

export const dynamic = "force-dynamic";

const GENERIC_RESPONSE = {
  ok: true,
  message: "再送リクエストを受け付けました。",
};

function isSameOriginRequest(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (
    !allowQuoteAccessRequest({
      request,
      scope: "quote-resend",
      limit: 5,
      windowMs: 10 * 60 * 1000,
    })
  ) {
    return NextResponse.json(GENERIC_RESPONSE, {
      headers: { "cache-control": "no-store" },
    });
  }
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(GENERIC_RESPONSE, {
      headers: { "cache-control": "no-store" },
    });
  }

  let payload: { claim?: unknown };
  try {
    payload = await request.json() as { claim?: unknown };
  } catch {
    payload = {};
  }
  const currentClaim = typeof payload.claim === "string" ? payload.claim : "";
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(currentClaim)) {
    return NextResponse.json(GENERIC_RESPONSE, {
      headers: { "cache-control": "no-store" },
    });
  }

  try {
    await resendQuoteNotification(currentClaim);
    return NextResponse.json(GENERIC_RESPONSE, {
      headers: { "cache-control": "no-store" },
    });
  } catch {
    console.error("quote notification resend failed");
    return NextResponse.json(GENERIC_RESPONSE, {
      headers: { "cache-control": "no-store" },
    });
  }
}
