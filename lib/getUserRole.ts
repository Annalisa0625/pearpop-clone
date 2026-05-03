// file: lib/getUserRole.ts

import { supabase } from "@/lib/supabaseClient";

export async function getUserRole() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  return data.role;
}
