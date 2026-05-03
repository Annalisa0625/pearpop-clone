// app/api/admin/users/list/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    /* ===============================
       Companies
    =============================== */
    const { data: companies, error: companiesErr } = await supabaseAdmin
      .from("companies")
      .select("user_id, company_name, approval_status, created_at")
      .order("created_at", { ascending: false });

    if (companiesErr) {
      console.error("companies error:", companiesErr);
      throw companiesErr;
    }

    /* ===============================
       Creators
    =============================== */
    const { data: creators, error: creatorsErr } = await supabaseAdmin
      .from("creators")
      .select("user_id, display_name, approval_status, created_at")
      .order("created_at", { ascending: false });

    if (creatorsErr) {
      console.error("creators error:", creatorsErr);
      throw creatorsErr;
    }

    return NextResponse.json({
      companies: companies ?? [],
      creators: creators ?? [],
    });
  } catch (err) {
    console.error("admin users list error:", err);
    return NextResponse.json(
      { error: "failed to load admin users" },
      { status: 500 }
    );
  }
}
