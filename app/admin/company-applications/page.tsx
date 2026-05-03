// app/admin/company-applications/page.tsx
import { Suspense } from "react";
import CompanyApplicationsClient from "./CompanyApplicationsClient";

export default function CompanyApplicationsPage() {
  return (
    <Suspense fallback={<div className="p-6">読み込み中...</div>}>
      <CompanyApplicationsClient />
    </Suspense>
  );
}