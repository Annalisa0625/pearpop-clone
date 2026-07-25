import type { Metadata } from "next";
import { Suspense } from "react";

import QuoteAccessConfirmation from "./QuoteAccessConfirmation";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "見積もりの確認｜TrendMart",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function QuoteAccessConfirmPage() {
  return (
    <Suspense fallback={null}>
      <QuoteAccessConfirmation initiallyInvalid />
    </Suspense>
  );
}
