// File: app/api/line/test/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  buildLineMessage,
  isLineConfigured,
  sendLineTextToUserId,
} from "@/lib/notifications/line";

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

async function getCreatorForUser(userId: string) {
  const admin = supabaseAdmin as any;

  const { data, error } = await admin
    .from("creators")
    .select("id, display_name")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return {
      creator: null,
      error: error?.message ?? "クリエイター情報が見つかりません",
    };
  }

  return {
    creator: data as { id: string; display_name: string | null },
    error: null,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(req);

    if (authError || !user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    if (!isLineConfigured()) {
      return NextResponse.json(
        { error: "LINE通知の環境変数が設定されていません" },
        { status: 500 }
      );
    }

    const { creator, error: creatorError } = await getCreatorForUser(user.id);

    if (creatorError || !creator) {
      return NextResponse.json({ error: creatorError }, { status: 400 });
    }

    const message = buildLineMessage({
  title: "LINEテスト通知",
  body: "このメッセージが届いていれば、LINE通知は正常に動作しています。",
  linkPath: "/creator/profile",
});

    const result = await sendLineTextToUserId(user.id, message, {
      notificationType: "line_test",
      creatorId: creator.id,
      entityType: "creator",
      entityId: creator.id,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "LINEテスト通知の送信に失敗しました" },
        { status: result.skipped ? 400 : 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("line test notification error:", error);

    return NextResponse.json(
      { error: "LINEテスト通知の送信に失敗しました" },
      { status: 500 }
    );
  }
}
