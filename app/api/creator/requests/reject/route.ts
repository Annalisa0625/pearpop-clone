// app/api/creator/requests/reject/route.ts

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/types/database.types";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  // 1) 認証
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  // 2) 入力
  const body = (await req.json().catch(() => null)) as { requestId?: unknown } | null;
  const requestId =
    typeof body?.requestId === "string" ? body.requestId.trim() : "";

  if (!requestId) {
    return NextResponse.json(
      { error: "requestId が不正です。" },
      { status: 400 }
    );
  }

  // 3) 対象取得（🔥 修正）
  const { data: target, error: fetchErr } = await supabase
    .from("requests")
    .select("id, creator_user_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (fetchErr)
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!target)
    return NextResponse.json(
      { error: "リクエストが見つかりません。" },
      { status: 404 }
    );

  // 4) 権限チェック（🔥 修正）
  if (target.creator_user_id !== user.id) {
    return NextResponse.json(
      { error: "権限がありません。" },
      { status: 403 }
    );
  }

  // 5) ステータスチェック
  if (target.status !== "pending") {
    return NextResponse.json(
      {
        error: `このリクエストは拒否できません (status=${target.status})`,
      },
      { status: 400 }
    );
  }

  // 6) 更新
  const updateData: TablesUpdate<"requests"> = {
    status: "rejected",
    updated_at: new Date().toISOString(),
  };

  const { error: updateErr } = await supabase
    .from("requests")
    .update(updateData)
    .eq("id", requestId);

  if (updateErr)
    return NextResponse.json(
      { error: updateErr.message },
      { status: 500 }
    );

  return NextResponse.json({ success: true });
}