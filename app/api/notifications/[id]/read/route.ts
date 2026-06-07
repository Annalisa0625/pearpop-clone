// File: app/api/notifications/[id]/read/route.ts
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

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const { user, error: authError } = await getAuthenticatedUser(req);

    if (authError || !user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const admin = supabaseAdmin as any;
    const now = new Date().toISOString();

    const { data, error } = await admin
      .from("notifications")
      .update({
        read_at: now,
      })
      .eq("id", id)
      .eq("recipient_user_id", user.id)
      .select("id, read_at")
      .maybeSingle();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      ok: true,
      notification: data ?? null,
    });
  } catch (error) {
    console.error("notification read error:", error);

    return NextResponse.json(
      { error: "通知の既読処理に失敗しました" },
      { status: 500 }
    );
  }
}