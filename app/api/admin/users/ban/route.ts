// app/api/admin/users/ban/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const { userId, reason, level, adminNote } = await req.json();

    if (!userId || !reason || !level) {
      return NextResponse.json(
        { error: "userId, reason, level are required" },
        { status: 400 }
      );
    }

    // ① Auth 制御（BAN）
    if (level === "temporary" || level === "permanent") {
      const { error } =
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: "876000h", // 約100年
        });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    // ② profiles フラグ
    const isSuspended = level !== "limit";

    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .update({ is_suspended: isSuspended })
      .eq("id", userId);

    if (profileErr) {
      return NextResponse.json(
        { error: profileErr.message },
        { status: 500 }
      );
    }

    // ③ 履歴保存
    const { error: insertErr } = await supabaseAdmin
      .from("user_suspensions")
      .insert({
        user_id: userId,
        reason,
        level,
        admin_note: adminNote ?? null,
      });

    if (insertErr) {
      return NextResponse.json(
        { error: insertErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("ban error:", e);
    return NextResponse.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}
