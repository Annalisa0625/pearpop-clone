// app/api/admin/users/list/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false as const,
      status: 401,
      message: "ログインが必要です",
      userId: null,
    };
  }

  const { data: roleRows, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (roleError) {
    console.error("admin role check error:", roleError);
    return {
      ok: false as const,
      status: 500,
      message: "権限確認に失敗しました",
      userId: user.id,
    };
  }

  const isAdmin = (roleRows ?? []).some((row) => row.role === "admin");

  if (!isAdmin) {
    return {
      ok: false as const,
      status: 403,
      message: "admin権限が必要です",
      userId: user.id,
    };
  }

  return {
    ok: true as const,
    userId: user.id,
  };
}

export async function GET() {
  try {
    const admin = await requireAdmin();

    if (!admin.ok) {
      return NextResponse.json(
        { error: admin.message },
        { status: admin.status }
      );
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