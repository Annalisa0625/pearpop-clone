// app/api/admin/users/list/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminApi } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const admin = await requireAdminApi();

    if (!admin.ok) {
      return admin.response;
    }

    const { data: companies, error: companiesErr } = await supabaseAdmin
      .from("companies")
      .select("user_id, company_name, approval_status, created_at")
      .order("created_at", { ascending: false });

    if (companiesErr) {
      console.error("companies error:", companiesErr);
      throw companiesErr;
    }

    const { data: creators, error: creatorsErr } = await supabaseAdmin
      .from("creators")
      .select("user_id, display_name, approval_status, created_at")
      .order("created_at", { ascending: false });

    if (creatorsErr) {
      console.error("creators error:", creatorsErr);
      throw creatorsErr;
    }

    const userIds = [
      ...(companies ?? []).map((c) => c.user_id),
      ...(creators ?? []).map((c) => c.user_id),
    ];

    const uniqueUserIds = Array.from(new Set(userIds));

    const { data: profiles, error: profilesErr } = uniqueUserIds.length
      ? await supabaseAdmin
          .from("profiles")
          .select("id, username, is_suspended")
          .in("id", uniqueUserIds)
      : { data: [], error: null };

    if (profilesErr) {
      console.error("profiles error:", profilesErr);
      throw profilesErr;
    }

    return NextResponse.json({
      companies: companies ?? [],
      creators: creators ?? [],
      profiles: profiles ?? [],
    });
  } catch (err) {
    console.error("admin users list error:", err);
    return NextResponse.json(
      { error: "failed to load admin users" },
      { status: 500 }
    );
  }
}