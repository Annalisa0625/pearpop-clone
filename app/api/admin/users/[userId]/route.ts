// app/api/admin/users/[userId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CreatorSocialAccount = {
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
  const { userId } = await context.params;

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  try {
    const { data: company, error: companyErr } = await supabaseAdmin
      .from("companies")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (companyErr) {
      console.error("company error:", companyErr);
    }

    if (company) {
      return NextResponse.json({
        type: "company",
        company,
        creator: null,
        creatorSocialAccounts: [],
      });
    }

    const { data: creator, error: creatorErr } = await supabaseAdmin
      .from("creators")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (creatorErr) {
      console.error("creator error:", creatorErr);
    }

    if (creator) {
      const { data: creatorSocialAccounts, error: socialErr } =
        await supabaseAdmin
          .from("creator_social_accounts")
          .select("*")
          .eq("creator_id", creator.id)
          .order("created_at", { ascending: true });

      if (socialErr) {
        console.error("creator_social_accounts error:", socialErr);
      }

      return NextResponse.json({
        type: "creator",
        company: null,
        creator,
        creatorSocialAccounts:
          (creatorSocialAccounts as CreatorSocialAccount[] | null) ?? [],
      });
    }

    return NextResponse.json({ error: "not found" }, { status: 404 });
  } catch (err) {
    console.error("admin user detail error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}