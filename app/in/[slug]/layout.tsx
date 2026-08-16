import type { ReactNode } from "react";

import PublicPageViewTracker from "@/components/analytics/PublicPageViewTracker";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function PublicCreatorPageLayout({
  children,
  params,
}: LayoutProps) {
  const { slug } = await params;

  return (
    <>
      {children}
      <PublicPageViewTracker slug={slug} />
    </>
  );
}
