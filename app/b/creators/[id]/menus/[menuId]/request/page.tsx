//app/b/creators/[id]/menus/[menuId]/request/page.tsx
"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function LegacyMenuRequestPage() {
  const router = useRouter();
  const params = useParams();

  const creatorId = params.id as string;
  const menuId = params.menuId as string;

  useEffect(() => {
    router.replace(`/b/creators/${creatorId}/request?menuId=${menuId}`);
  }, [creatorId, menuId, router]);

  return <p className="p-6">新しい依頼フォームへ移動しています...</p>;
}