import { redirect } from "next/navigation";

import { isCreatorOnlyRelease } from "@/lib/release-mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function RootPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(isCreatorOnlyRelease() ? "/for-creators" : "/home");

  const { data: roles, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (roleError || !roles || roles.length === 0) redirect("/signup/creator-entry");

  const roleList = roles.map((row) => row.role);
  if (roleList.includes("creator")) redirect("/creator/dashboard");
  if (roleList.includes("admin")) redirect("/admin");

  if (roleList.includes("company")) {
    if (isCreatorOnlyRelease()) redirect("/for-creators");

    const { data: userState } = await supabase
      .from("user_states")
      .select("company_profile_completed, onboarding_completed")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!userState?.company_profile_completed || !userState.onboarding_completed) {
      redirect("/b/onboarding");
    }
    redirect("/b/dashboard");
  }

  redirect("/signup/creator-entry");
}
