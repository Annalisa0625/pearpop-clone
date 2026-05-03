// File: app/api/requests/create/route.ts

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/types/database.types";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  // ① ログイン確認
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json(
      { error: "ログインが必要です。" },
      { status: 401 }
    );
  }

  // ② 入力取得
  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json(
      { error: "リクエストデータが不正です。" },
      { status: 400 }
    );
  }

  const {
    creatorId,
    menuId,
    product_name,
    product_url,
    note,
    deadline,
    has_free_offer,
  } = body;

  if (!creatorId || !menuId) {
    return NextResponse.json(
      { error: "creatorId または menuId が不足しています。" },
      { status: 400 }
    );
  }

  // 🔥 正しいカラム名に修正
  const insertData: TablesInsert<"requests"> = {
    b_user_id: user.id,
    creator_user_id: creatorId, // ← ここが最重要
    creator_menu_id: menuId,
    product_name: product_name ?? null,
    product_url: product_url ?? null,
    note: note ?? null,
    deadline: deadline ?? null,
    has_free_offer: !!has_free_offer,
    status: "pending",
  };

  const { data, error } = await supabase
    .from("requests")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, request: data });
}