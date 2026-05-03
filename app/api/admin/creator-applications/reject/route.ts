// app/api/admin/creator-applications/reject/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("creators")
      .update({ approval_status: "rejected" })
      .eq("user_id", userId);

    if (error) {
      console.error("reject creator error:", error);
      return NextResponse.json(
        { error: error.message },
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
  } catch (err) {
    console.error("reject creator error:", err);
    return NextResponse.json(
      { error: "failed to reject creator" },
      { status: 500 }
    );
  }
}
