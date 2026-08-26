import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  const { data: auth, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !auth.user) return NextResponse.json({ error: "ログイン状態を確認できません。" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("user_states")
    .select("creator_profile_completed")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "登録状態を確認できませんでした。" }, { status: 500 });
  return NextResponse.json({ completed: data?.creator_profile_completed === true });
}
