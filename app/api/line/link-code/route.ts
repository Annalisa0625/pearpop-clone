// File: app/api/line/link-code/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CODE_TTL_MINUTES = 10;

async function getAuthenticatedUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    return { user: null, error: "認証トークンがありません" };
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return { user: null, error: "認証に失敗しました" };
  }

  return { user, error: null };
}

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
}

async function getCreatorIdForUser(userId: string) {
  const admin = supabaseAdmin as any;

  const { data, error } = await admin
    .from("creators")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return { creatorId: null, error: error?.message ?? "クリエイター情報が見つかりません" };
  }

  return { creatorId: data.id as string, error: null };
}

export async function GET(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(req);

    if (authError || !user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const admin = supabaseAdmin as any;

    const { data: link, error: linkError } = await admin
      .from("line_user_links")
      .select(
        "id, line_user_id, line_display_name, line_picture_url, is_enabled, linked_at, blocked_at"
      )
      .eq("app_user_id", user.id)
      .maybeSingle();

    if (linkError) {
      throw linkError;
    }

    return NextResponse.json({
      ok: true,
      linked: Boolean(link?.line_user_id && link?.is_enabled && !link?.blocked_at),
      link: link ?? null,
    });
  } catch (error) {
    console.error("line link status error:", error);

    return NextResponse.json(
      { error: "LINE連携状況の取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(req);

    if (authError || !user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const { creatorId, error: creatorError } = await getCreatorIdForUser(user.id);

    if (creatorError || !creatorId) {
      return NextResponse.json({ error: creatorError }, { status: 400 });
    }

    const admin = supabaseAdmin as any;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CODE_TTL_MINUTES * 60 * 1000);

    await admin
      .from("line_link_codes")
      .update({ used_at: now.toISOString() })
      .eq("app_user_id", user.id)
      .is("used_at", null);

    let inserted: { code: string; expires_at: string } | null = null;
    let lastError: string | null = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateCode();

      const { data, error } = await admin
        .from("line_link_codes")
        .insert({
          app_user_id: user.id,
          creator_id: creatorId,
          code,
          expires_at: expiresAt.toISOString(),
        })
        .select("code, expires_at")
        .single();

      if (!error && data) {
        inserted = data;
        break;
      }

      lastError = error?.message ?? "連携コードの作成に失敗しました";
    }

    if (!inserted) {
      return NextResponse.json(
        { error: lastError ?? "連携コードの作成に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      code: inserted.code,
      expires_at: inserted.expires_at,
      expires_in_minutes: CODE_TTL_MINUTES,
      instruction:
        "LINE公式アカウントを友だち追加し、このコードをそのまま送信してください。",
    });
  } catch (error) {
    console.error("line link code create error:", error);

    return NextResponse.json(
      { error: "LINE連携コードの作成に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(req);

    if (authError || !user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const admin = supabaseAdmin as any;
    const now = new Date().toISOString();

    const { error } = await admin
      .from("line_user_links")
      .update({
        is_enabled: false,
        unlinked_at: now,
        updated_at: now,
      })
      .eq("app_user_id", user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("line unlink error:", error);

    return NextResponse.json(
      { error: "LINE連携の解除に失敗しました" },
      { status: 500 }
    );
  }
}
