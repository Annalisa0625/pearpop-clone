// lib/checkRole.ts
import { createSupabaseServerClient } from "./supabase/server";

export type Role = "creator" | "company" | "admin";

function isRole(v: unknown): v is Role {
  return v === "creator" || v === "company" || v === "admin";
}

export async function requireRole(roles: Role[]) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, reason: "not_logged_in" as const };
  }

  const { data: roleRow, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !roleRow) {
    return { ok: false, reason: "no_role" as const };
  }

  const role = isRole(roleRow.role) ? roleRow.role : null;

  if (!role) {
    return {
      ok: false,
      reason: "invalid_role" as const,
      role: roleRow.role as any,
    };
  }

  const ok = roles.includes(role);

  return {
    ok,
    role,
    reason: ok ? ("ok" as const) : ("forbidden" as const),
  };
}