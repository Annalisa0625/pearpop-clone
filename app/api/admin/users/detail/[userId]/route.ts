// app/api/admin/users/detail/[userId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CreatorSocialRow = {
  id: string;
  creator_id: string;
  platform: string;
  url: string;
  follower_range: string;
  audience_country: string;
  created_at: string;
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const { data: company, error: companyErr } = await supabaseAdmin
      .from("companies")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (companyErr) {
      console.error("company fetch error:", companyErr);
    }

    let creator: any = null;

    if (!company) {
      const { data: creatorData, error: creatorErr } = await supabaseAdmin
        .from("creators")
        .select("id, user_id, display_name, bio, category, approval_status, created_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (creatorErr) {
        console.error("creator fetch error:", creatorErr);
      }

      if (creatorData) {
        const { data: socialRows, error: socialErr } = await supabaseAdmin
          .from("creator_social_accounts")
          .select("id, creator_id, platform, url, follower_range, audience_country, created_at")
          .eq("creator_id", creatorData.id)
          .order("created_at", { ascending: true });

        if (socialErr) {
          console.error("creator_social_accounts fetch error:", socialErr);
        }

        const socials = (socialRows ?? []) as CreatorSocialRow[];
        const first = socials[0] ?? null;

        creator = {
          ...creatorData,
          // 旧画面互換用
          sns_type: first?.platform ?? null,
          sns_url: first?.url ?? null,
          follower_range: first?.follower_range ?? null,
          audience_country: first?.audience_country ?? null,
          // 現行用
          social_accounts: socials,
        };
      }
    }

    const { data: dangerLogs, error: logsErr } = await supabaseAdmin
      .from("danger_message_flags")
      .select("id, matched_word, content, created_at")
      .eq("sender_id", userId)
      .order("created_at", { ascending: false });

    if (logsErr) {
      console.error("danger logs fetch error:", logsErr);
    }

    const { data: limit, error: limitErr } = await supabaseAdmin
      .from("user_suspensions")
      .select("id")
      .eq("user_id", userId)
      .eq("level", "limit")
      .eq("is_active", true)
      .maybeSingle();

    if (limitErr) {
      console.error("limit fetch error:", limitErr);
    }

    const type = company ? "company" : creator ? "creator" : null;

    return NextResponse.json(
      {
        type,
        company: company ?? null,
        creator: creator ?? null,
        dangerLogs: dangerLogs ?? [],
        isLimited: !!limit,
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
  } catch (err) {
    console.error("admin user detail error:", err);
    return NextResponse.json(
      { error: "failed to load detail" },
      { status: 500 }
    );
  }
}