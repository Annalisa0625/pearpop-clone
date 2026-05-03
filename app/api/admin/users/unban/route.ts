// app/api/admin/users/unban/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId required" },
        { status: 400 }
      );
    }

    // ① Auth BAN 解除
    const { error: authErr } =
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: "none",
      });

    if (authErr) {
      return NextResponse.json(
        { error: authErr.message },
        { status: 500 }
      );
    }

    // ② profiles フラグ解除
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .update({ is_suspended: false })
      .eq("id", userId);

    if (profileErr) {
      return NextResponse.json(
        { error: profileErr.message },
        { status: 500 }
      );
    }

    // ③ suspension 履歴を解除
    const { error: releaseErr } = await supabaseAdmin
      .from("user_suspensions")
      .update({ released_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("released_at", null);

    if (releaseErr) {
      return NextResponse.json(
        { error: releaseErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (e) {
    console.error("unban error:", e);
    return NextResponse.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}
