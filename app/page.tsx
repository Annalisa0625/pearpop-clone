// app/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/home");
        return;
      }

      const { data: roles, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (roleError || !roles || roles.length === 0) {
        router.replace("/signup/creator-entry");
        return;
      }

      const role = roles[0]?.role;

      const { data: userState } = await supabase
        .from("user_states")
        .select(
          `
            creator_profile_completed,
            company_profile_completed,
            onboarding_completed
          `
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (role === "creator") {
        if (!userState) {
          router.replace("/creator/profile");
          return;
        }

        if (!userState.creator_profile_completed) {
          router.replace("/creator/profile");
          return;
        }

        if (!userState.onboarding_completed) {
          router.replace("/creator/onboarding");
          return;
        }

        router.replace("/creator/dashboard");
        return;
      }

      if (role === "company") {
        if (!userState) {
          router.replace("/b/onboarding");
          return;
        }

        if (!userState.company_profile_completed) {
          router.replace("/b/onboarding");
          return;
        }

        if (!userState.onboarding_completed) {
          router.replace("/b/onboarding");
          return;
        }

        router.replace("/b/dashboard");
        return;
      }

      if (role === "admin") {
        router.replace("/admin");
        return;
      }

      router.replace("/signup/creator-entry");
    };

    check();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
      Loading...
    </div>
  );
}