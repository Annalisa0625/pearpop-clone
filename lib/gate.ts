// lib/gate.ts
import type { SupabaseClient } from "@supabase/supabase-js";

type GateRole = "company" | "creator" | "unknown";

type GateResult = {
  role: GateRole;
  nextPath: string;
  reason:
    | "not_logged_in"
    | "not_found"
    | "pending_approval"
    | "need_onboarding"
    | "need_public_profile"
    | "ok";
};

type UserRoleRow = {
  role: string;
};

type ApprovalRow = {
  approval_status: "pending" | "approved" | "rejected" | null;
};

type UserStateRow = {
  onboarding_completed: boolean | null;
  company_profile_completed: boolean | null;
  creator_profile_completed: boolean | null;
};

async function ensureUserState(
  supabase: SupabaseClient,
  userId: string
): Promise<UserStateRow> {
  const { data: existing } = await supabase
    .from("user_states")
    .select(
      "onboarding_completed, company_profile_completed, creator_profile_completed"
    )
    .eq("user_id", userId)
    .maybeSingle<UserStateRow>();

  if (existing) {
    return {
      onboarding_completed: existing.onboarding_completed ?? false,
      company_profile_completed: existing.company_profile_completed ?? false,
      creator_profile_completed: existing.creator_profile_completed ?? false,
    };
  }

  await supabase.from("user_states").insert({ user_id: userId });

  return {
    onboarding_completed: false,
    company_profile_completed: false,
    creator_profile_completed: false,
  };
}

export async function getNextPathForUser(
  supabase: SupabaseClient
): Promise<GateResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      role: "unknown",
      nextPath: "/login",
      reason: "not_logged_in",
    };
  }

  const userId = user.id;

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  const roleList = (roleRows ?? []).map((row: UserRoleRow) => row.role);

  // app/page.tsx と合わせて creator を優先
  const role: GateRole = roleList.includes("creator")
    ? "creator"
    : roleList.includes("company")
    ? "company"
    : "unknown";

  if (role === "unknown") {
    return {
      role,
      nextPath: "/signup/select",
      reason: "not_found",
    };
  }

  if (role === "creator") {
    const { data: creator } = await supabase
      .from("creators")
      .select("approval_status")
      .eq("user_id", userId)
      .maybeSingle<ApprovalRow>();

    if (!creator) {
      return {
        role,
        nextPath: "/signup/select",
        reason: "not_found",
      };
    }

    if (creator.approval_status !== "approved") {
      return {
        role,
        nextPath: "/signup/pending",
        reason: "pending_approval",
      };
    }

    const state = await ensureUserState(supabase, userId);

    if (!state.creator_profile_completed) {
      return {
        role,
        nextPath: "/creator/profile",
        reason: "need_public_profile",
      };
    }

    if (!state.onboarding_completed) {
      return {
        role,
        nextPath: "/creator/onboarding",
        reason: "need_onboarding",
      };
    }

    return {
      role,
      nextPath: "/creator/dashboard",
      reason: "ok",
    };
  }

  const { data: company } = await supabase
    .from("companies")
    .select("approval_status")
    .eq("user_id", userId)
    .maybeSingle<ApprovalRow>();

  if (!company) {
    return {
      role,
      nextPath: "/signup/select",
      reason: "not_found",
    };
  }

  if (company.approval_status !== "approved") {
    return {
      role,
      nextPath: "/signup/pending",
      reason: "pending_approval",
    };
  }

  const state = await ensureUserState(supabase, userId);

  if (!state.company_profile_completed) {
    return {
      role,
      nextPath: "/b/onboarding",
      reason: "need_public_profile",
    };
  }

  return {
    role,
    nextPath: "/b/dashboard",
    reason: "ok",
  };
}