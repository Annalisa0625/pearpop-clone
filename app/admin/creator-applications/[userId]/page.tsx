// app/admin/creator-applications/[userId]/page.tsx
import CreatorApplicationDetailClient from "./CreatorApplicationDetailClient";

export const dynamic = "force-dynamic";

export default async function CreatorApplicationDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  return <CreatorApplicationDetailClient userId={userId} />;
}