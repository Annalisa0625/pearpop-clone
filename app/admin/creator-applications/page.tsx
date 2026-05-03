// app/admin/creator-applications/page.tsx
import { Suspense } from "react";
import CreatorApplicationsClient from "./CreatorApplicationsClient";

export default function CreatorApplicationsPage() {
  return (
    <Suspense fallback={<div className="p-6">読み込み中...</div>}>
      <CreatorApplicationsClient />
    </Suspense>
  );
}