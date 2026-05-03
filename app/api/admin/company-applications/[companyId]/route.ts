// app/api/admin/company-applications/[companyId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await context.params;

    const { data, error } = await supabaseAdmin
      .from("companies")
      .select(`
        id,
        company_name,
        description,
        contact_email,
        approval_status,
        created_at,
        website_url,
        phone_number,
        usage_purpose
      `)
      .eq("id", companyId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    return NextResponse.json({ company: data });
  } catch (e) {
    console.error("GET company detail error:", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}