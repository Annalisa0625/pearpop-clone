import { Suspense } from "react";
import SignupLinkClient from "./SignupLinkClient";

export const dynamic = "force-dynamic";

function LoadingScreen() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#fbfaf8] px-6">
      <div className="text-center" aria-busy="true">
        <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-[#ed5964]" />
        <p className="mt-4 text-sm font-medium text-slate-500">確認しています…</p>
      </div>
    </main>
  );
}

export default function SignupLinkPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SignupLinkClient />
    </Suspense>
  );
}
