// app/admin/company-applications/[companyId]/page.tsx
import CompanyApplicationDetailClient from "./CompanyApplicationDetailClient";

export const dynamic = "force-dynamic";

export default async function CompanyApplicationDetailPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;

  return <CompanyApplicationDetailClient companyId={companyId} />;
}