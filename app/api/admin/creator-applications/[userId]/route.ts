// app/api/admin/creator-applications/[userId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params;

    const { data: creator, error: creatorError } = await supabaseAdmin
      .from("creators")
      .select(`
        id,
        user_id,
        display_name,
        category,
        approval_status,
        created_at
      `)
      .eq("user_id", userId)
      .maybeSingle();

    if (creatorError) {
      return NextResponse.json({ error: creatorError.message }, { status: 500 });
    }

    if (!creator) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const { data: socialAccounts, error: socialError } = await supabaseAdmin
      .from("creator_social_accounts")
      .select(`
        id,
        platform,
        url,
        follower_range,
        audience_country,
        created_at
      `)
      .eq("creator_id", creator.id)
      .order("created_at", { ascending: true });

    if (socialError) {
      return NextResponse.json({ error: socialError.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        creator,
        socialAccounts: socialAccounts ?? [],
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (e) {
    console.error("GET /api/admin/creator-applications/[userId] error:", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}