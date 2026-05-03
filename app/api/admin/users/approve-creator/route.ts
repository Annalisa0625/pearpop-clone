// app/api/admin/users/approve-creator/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    /* ===============================
       1) creators 承認
    =============================== */
    const { error: creatorErr } = await supabaseAdmin
      .from("creators")
      .update({ approval_status: "approved" })
      .eq("user_id", userId);

    if (creatorErr) {
      console.error("creator approve error:", creatorErr);
      return NextResponse.json(
        { error: creatorErr.message },
        { status: 500 }
      );
    }

    /* ===============================
       2) role を upsert で保証
       user_roles は user_id 一意想定
    =============================== */
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        {
          user_id: userId,
          role: "creator",
        },
        {
          onConflict: "user_id",
        }
      );

    if (roleErr) {
      console.error("role upsert error:", roleErr);
      return NextResponse.json(
        { error: roleErr.message },
        { status: 500 }
      );
    }

    /* ===============================
       3) ユーザーの email 取得
    =============================== */
    const { data: authUser, error: authErr } =
      await supabaseAdmin.auth.admin.getUserById(userId);

    if (authErr || !authUser?.user?.email) {
      console.error("getUser error:", authErr);
      return NextResponse.json(
        { error: "failed to get user email" },
        { status: 500 }
      );
    }

    const email = authUser.user.email;

    /* ===============================
       4) DEVメール出力（常に出す）
    =============================== */
    const loginUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    console.log("=======================================");
    console.log("✅ CREATOR APPROVAL MAIL (DEV MODE)");
    console.log("To:", email);
    console.log("Subject: 【審査完了】Creator承認のお知らせ");
    console.log("");
    console.log("審査が完了しました。");
    console.log("以下よりログインしてください。");
    console.log(`${loginUrl}/login`);
    console.log("=======================================");

    return NextResponse.json(
      { success: true },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err) {
    console.error("approve creator error:", err);
    return NextResponse.json(
      { error: "failed to approve creator" },
      { status: 500 }
    );
  }
}