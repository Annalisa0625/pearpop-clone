import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { UUID_PATTERN } from "@/lib/trendre-link/items-server";
import { isTrustedRequestOrigin } from "@/lib/trendre-link/quote-access";
import { allowQuoteAccessRequest } from "@/lib/trendre-link/request-rate-limit";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };
type QuoteDecision = "accepted" | "declined";

type DecisionQuote = {
  id: string;
  inquiry_id: string;
  status: QuoteDecision;
  accepted_at: string | null;
  declined_at: string | null;
  updated_at: string;
};

type DecisionResponse =
  | { ok: true; quote: DecisionQuote; duplicate?: boolean }
  | { ok: false; error: string; setupRequired?: boolean };

function errorResponse(error: string, status: number, setupRequired = false) {
  return NextResponse.json<DecisionResponse>(
    { ok: false, error, ...(setupRequired ? { setupRequired: true } : {}) },
    { status, headers: { "cache-control": "no-store" } }
  );
}

function isDecision(value: unknown): value is QuoteDecision {
  return value === "accepted" || value === "declined";
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (
    !allowQuoteAccessRequest({
      request,
      scope: "company-quote-decision",
      limit: 20,
      windowMs: 10 * 60 * 1000,
    })
  ) {
    return errorResponse("操作が集中しています。時間を置いてもう一度お試しください。", 429);
  }

  if (!isTrustedRequestOrigin(request)) {
    return errorResponse("この操作を実行できませんでした。", 403);
  }

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) {
    return errorResponse("見積もりが見つかりません。", 404);
  }

  let payload: { decision?: unknown };
  try {
    payload = (await request.json()) as { decision?: unknown };
  } catch {
    return errorResponse("入力内容を確認してください。", 400);
  }

  if (!isDecision(payload.decision)) {
    return errorResponse("回答内容を確認してください。", 400);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return errorResponse("ログインが必要です。", 401);

    const admin = supabaseAdmin as any;
    const { data: access, error: accessError } = await admin
      .from("creator_inquiry_quote_access")
      .select("quote_id")
      .eq("quote_id", id)
      .eq("user_id", user.id)
      .not("claimed_at", "is", null)
      .maybeSingle();

    if (accessError) throw new Error("quote_decision_access_load_failed");
    if (!access) return errorResponse("見積もりが見つかりません。", 404);

    const { data, error } = await admin.rpc("decide_creator_inquiry_quote", {
      p_quote_id: id,
      p_user_id: user.id,
      p_decision: payload.decision,
    });

    if (error) {
      const message = typeof error.message === "string" ? error.message : "";
      if (error.code === "42883" || message.includes("decide_creator_inquiry_quote")) {
        return errorResponse("見積もり回答機能の準備が完了していません。", 503, true);
      }
      throw new Error("quote_decision_rpc_failed");
    }

    const decided = Array.isArray(data) ? data[0] : data;
    if (decided?.id && decided.status === payload.decision) {
      return NextResponse.json<DecisionResponse>(
        { ok: true, quote: decided as DecisionQuote },
        { headers: { "cache-control": "no-store" } }
      );
    }

    const { data: current, error: currentError } = await admin
      .from("creator_inquiry_quotes")
      .select("id,inquiry_id,status,valid_until,accepted_at,declined_at,updated_at,company_user_id")
      .eq("id", id)
      .eq("company_user_id", user.id)
      .maybeSingle();

    if (currentError) throw new Error("quote_decision_current_load_failed");
    if (!current) return errorResponse("見積もりが見つかりません。", 404);

    if (current.status === payload.decision) {
      return NextResponse.json<DecisionResponse>(
        {
          ok: true,
          quote: {
            id: current.id,
            inquiry_id: current.inquiry_id,
            status: current.status,
            accepted_at: current.accepted_at,
            declined_at: current.declined_at,
            updated_at: current.updated_at,
          },
          duplicate: true,
        },
        { headers: { "cache-control": "no-store" } }
      );
    }

    if (current.status === "accepted" || current.status === "declined") {
      return errorResponse("この見積もりにはすでに回答済みです。", 409);
    }

    const validUntil = new Date(current.valid_until).getTime();
    if (current.status === "expired" || (!Number.isNaN(validUntil) && validUntil <= Date.now())) {
      if (current.status === "sent") {
        await admin
          .from("creator_inquiry_quotes")
          .update({ status: "expired", updated_at: new Date().toISOString() })
          .eq("id", id)
          .eq("company_user_id", user.id)
          .eq("status", "sent");
      }
      return errorResponse("見積もりの有効期限が切れています。", 409);
    }

    return errorResponse("この見積もりには回答できません。", 409);
  } catch (cause) {
    console.error("company quote decision failed", {
      cause: cause instanceof Error ? cause.message : "unknown",
    });
    return errorResponse("回答を保存できませんでした。時間を置いてもう一度お試しください。", 500);
  }
}
