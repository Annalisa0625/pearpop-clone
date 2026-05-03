// app/api/admin/company-applications/approve/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: roleRow, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleError || !roleRow || roleRow.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { companyId, action } = body;

    if (!companyId || !action) {
      return NextResponse.json(
        { error: "companyId and action are required" },
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
    const company_access_status =
      action === "approve" ? "approved" : "rejected";

    const { data: company, error: companyFetchError } = await supabaseAdmin
      .from("companies")
      .select("id, user_id")
      .eq("id", companyId)
      .maybeSingle();

    if (companyFetchError || !company) {
      return NextResponse.json(
        { error: companyFetchError?.message ?? "company not found" },
        { status: 404 }
      );
    }

    const { error: updateCompanyError } = await supabaseAdmin
      .from("companies")
      .update({ approval_status })
      .eq("id", companyId);

    if (updateCompanyError) {
      console.error("update company error:", updateCompanyError);
      return NextResponse.json(
        { error: updateCompanyError.message },
        { status: 500 }
      );
    }

    const statePayload =
      action === "approve"
        ? {
            company_access_status: "approved",
            company_subscription_status: "inactive",
          }
        : {
            company_access_status: "rejected",
          };

    const { error: updateStateError } = await supabaseAdmin
      .from("user_states")
      .update(statePayload)
      .eq("user_id", company.user_id);

    if (updateStateError) {
      console.error("update user_states error:", updateStateError);
      return NextResponse.json(
        { error: updateStateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      approval_status,
      company_access_status,
    });
  } catch (err) {
    console.error("approve company error:", err);
    return NextResponse.json(
      { error: "failed to update company status" },
      { status: 500 }
    );
  }
}