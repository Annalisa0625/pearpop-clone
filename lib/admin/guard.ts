// lib/admin/guard.ts
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type AdminCheckResult =
  | {
      ok: true;
      userId: string;
    }
  | {
      ok: false;
      status: 401 | 403 | 500;
      message: string;
      reason: "not_logged_in" | "forbidden" | "role_check_failed";
    };

export async function checkAdminUser(): Promise<AdminCheckResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      status: 401,
      message: "ログインが必要です",
      reason: "not_logged_in",
    };
  }

  const { data: roleRow, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError) {
    console.error("admin role check error:", roleError);
    return {
      ok: false,
      status: 500,
      message: "管理者権限の確認に失敗しました",
      reason: "role_check_failed",
    };
  }

  if (!roleRow) {
    return {
      ok: false,
      status: 403,
      message: "admin権限が必要です",
      reason: "forbidden",
    };
  }

  return {
    ok: true,
    userId: user.id,
  };
}

export async function requireAdminPage() {
  const result = await checkAdminUser();

  if (result.ok) {
    return result;
  }

  if (result.reason === "not_logged_in") {
    redirect("/login");
  }

  redirect("/");
}

export async function requireAdminApi() {
  const result = await checkAdminUser();

  if (result.ok) {
    return {
      ok: true as const,
      userId: result.userId,
      response: null,
    };
  }

  return {
    ok: false as const,
    userId: null,
    response: NextResponse.json(
      {
        error: result.message,
        reason: result.reason,
      },
      { status: result.status }
    ),
  };
}