import { supabase } from "@/lib/supabaseClient";

export function signInWithGoogle(redirectTo: string | undefined) {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: redirectTo ? { redirectTo } : undefined,
  });
}
