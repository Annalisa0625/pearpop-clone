// app/signup/company-entry/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CompanySignupEntryPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/signup/company");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="rounded-3xl border bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-semibold text-gray-900">
          企業登録ページへ移動しています...
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Moving to the company sign-up page...
        </p>
      </div>
    </div>
  );
}