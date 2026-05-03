// app/api/admin/creator-applications/approve/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";


export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, action } = body;

    if (!userId || !action) {
      return NextResponse.json(
        { error: "userId and action are required" },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "invalid action" },
        { status: 400 }
      );
    }

    const approval_status = action === "approve" ? "approved" : "rejected";

    const { error: updateErr } = await supabaseAdmin
      .from("creators")
      .update({ approval_status })
      .eq("user_id", userId);

    if (updateErr) {
      console.error("update creator error:", updateErr);
      return NextResponse.json(
        { error: updateErr.message },
        { status: 500 }
      );
    }

    // 承認時のみ role を付与
    if (action === "approve") {
      const { error: roleErr } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role: "creator" });

      // 既に role がある場合は無視
      if (
        roleErr &&
        !String(roleErr.message).toLowerCase().includes("duplicate")
      ) {
        console.error("insert role error:", roleErr);
        return NextResponse.json(
          { error: roleErr.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { success: true, approval_status },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err) {
    console.error("approve creator error:", err);
    return NextResponse.json(
      { error: "failed to update creator status" },
      { status: 500 }
    );
  }
}
