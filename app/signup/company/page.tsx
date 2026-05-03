// app/signup/company/page.tsx
import { Suspense } from "react";
import SignupCompanyClient from "./SignupCompanyClient";

export default function SignupCompanyPage() {
  return (
    <Suspense fallback={<p className="p-6">確認中です...</p>}>
      <SignupCompanyClient />
    </Suspense>
  );
}