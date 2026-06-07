// File: app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function getSafeLimit(req: NextRequest) {
  const raw = Number(req.nextUrl.searchParams.get("limit") ?? "30");

  if (!Number.isFinite(raw)) return 30;
  if (raw < 1) return 1;
  if (raw > 80) return 80;

  return Math.floor(raw);
}

export async function GET(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(req);

    if (authError || !user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const admin = supabaseAdmin as any;
    const limit = getSafeLimit(req);
    const unreadOnly = req.nextUrl.searchParams.get("unread") === "1";

    let query = admin
      .from("notifications")
      .select(
        `
        id,
        recipient_user_id,
        actor_user_id,
        notification_type,
        title,
        body,
        link_path,
        entity_type,
        entity_id,
        order_id,
        chat_id,
        message_id,
        importance,
        read_at,
        archived_at,
        metadata,
        created_at
      `
      )
      .eq("recipient_user_id", user.id)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.is("read_at", null);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      ok: true,
      notifications: data ?? [],
    });
  } catch (error) {
    console.error("notifications list error:", error);

    return NextResponse.json(
      { error: "通知の取得に失敗しました" },
      { status: 500 }
    );
  }
}