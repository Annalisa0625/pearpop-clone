// app/signup/creator/page.tsx
import { Suspense } from "react";
import SignupCreatorClient from "./SignupCreatorClient";

export const dynamic = "force-dynamic";

export default function SignupCreatorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <p className="text-sm text-gray-500">読み込み中...</p>
        </div>
      }
    >
      <SignupCreatorClient />
    </Suspense>
  );
}