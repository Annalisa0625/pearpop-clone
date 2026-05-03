// app/api/creator/onboarding/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "認証エラー" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "ユーザー取得失敗" }, { status: 401 });
    }

    const userId = user.id;

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (roleError) {
      console.error("role fetch error:", roleError);
      return NextResponse.json({ error: "権限確認失敗" }, { status: 500 });
    }

    if (!roleData || roleData.role !== "creator") {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const { data: existingState, error: stateFetchError } = await supabaseAdmin
      .from("user_states")
      .select("user_id, creator_profile_completed, company_profile_completed")
      .eq("user_id", userId)
      .maybeSingle();

    if (stateFetchError) {
      console.error("user_states fetch error:", stateFetchError);
      return NextResponse.json({ error: "状態取得失敗" }, { status: 500 });
    }

    if (!existingState) {
      const { error: insertError } = await supabaseAdmin.from("user_states").insert({
        user_id: userId,
        creator_profile_completed: true,
        company_profile_completed: false,
        onboarding_completed: true,
      });

      if (insertError) {
        console.error("user_states insert error:", insertError);
        return NextResponse.json({ error: "状態更新失敗" }, { status: 500 });
      }
    } else {
      const { error: updateError } = await supabaseAdmin
        .from("user_states")
        .update({
          onboarding_completed: true,
        })
        .eq("user_id", userId);

      if (updateError) {
        console.error("user_states update error:", updateError);
        return NextResponse.json({ error: "状態更新失敗" }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: "onboarding completed",
    });
  } catch (error) {
    console.error("Onboarding Error:", error);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}