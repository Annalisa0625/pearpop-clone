// app/logout/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.signOut().then(() => {
      router.replace("/login");
    });
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      ログアウト中...
    </div>
  );
}
