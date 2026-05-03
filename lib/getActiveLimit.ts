// lib/getActiveLimit.ts
import { supabase } from "@/lib/supabaseClient";

export async function getActiveTradingLimit(userId: string) {
  const { data, error } = await supabase
    .from("user_suspensions")
    .select("reason, created_at")
    .eq("user_id", userId)
    .eq("level", "limit")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch trading limit:", error);
    return null;
  }

  return data; // null or { reason, created_at }
}
