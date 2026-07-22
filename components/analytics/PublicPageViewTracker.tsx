"use client";

import { useEffect } from "react";

export default function PublicPageViewTracker({
  pageType = "auto",
  slug,
}: {
  pageType?: "link" | "profile" | "auto";
  slug: string;
}) {
  useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/public/page-view", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pageType, slug }),
      keepalive: true,
      signal: controller.signal,
    }).catch(() => undefined);

    return () => controller.abort();
  }, [pageType, slug]);

  return null;
}
