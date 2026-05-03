// app/signup/complete/page.tsx
import { Suspense } from "react";
import CompleteClient from "./CompleteClient";

export default function SignupCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-500">確認中です...</p>
        </div>
      }
    >
      <CompleteClient />
    </Suspense>
  );
}