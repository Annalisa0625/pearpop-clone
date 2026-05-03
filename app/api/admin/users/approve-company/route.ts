// app/api/admin/users/approve-company/route.ts
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
       1) companies 承認
    =============================== */
    const { error: companyErr } = await supabaseAdmin
      .from("companies")
      .update({ approval_status: "approved" })
      .eq("user_id", userId);

    if (companyErr) {
      console.error("company approve error:", companyErr);
      return NextResponse.json(
        { error: companyErr.message },
        { status: 500 }
      );
    }

    /* ===============================
       2) user_states 更新
    =============================== */
    const { error: stateErr } = await supabaseAdmin
      .from("user_states")
      .upsert(
        {
          user_id: userId,
          company_access_status: "approved",
        },
        {
          onConflict: "user_id",
        }
      );

    if (stateErr) {
      console.error("user_states upsert error:", stateErr);
      return NextResponse.json(
        { error: stateErr.message },
        { status: 500 }
      );
    }

    /* ===============================
       3) role を upsert で保証
       user_roles は user_id 一意想定
    =============================== */
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        {
          user_id: userId,
          role: "company",
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
       4) ユーザーの email 取得
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
       5) DEVメール出力（常に出す）
    =============================== */
    const loginUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    console.log("=======================================");
    console.log("✅ COMPANY APPROVAL MAIL (DEV MODE)");
    console.log("To:", email);
    console.log("Subject: 【審査完了】Company承認のお知らせ");
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
    console.error("approve company error:", err);
    return NextResponse.json(
      { error: "failed to approve company" },
      { status: 500 }
    );
  }
}