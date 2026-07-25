import type { Metadata } from "next";

import QuoteAccessConfirmation from "../confirm/QuoteAccessConfirmation";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "見積もりの確認｜TrendMart",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const CLAIM_PATTERN = /^[A-Za-z0-9_-]{40,100}$/;
const AUTH_TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,500}$/;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function QuoteAccessActivatePage({ searchParams }: PageProps) {
  const query = await searchParams;
  const claim = single(query.claim);
  const tokenHash = single(query.token_hash);
  const valid = CLAIM_PATTERN.test(claim) && AUTH_TOKEN_PATTERN.test(tokenHash);

  // GET only renders this confirmation. No Cookie, session, Auth, or DB write
  // occurs until the user explicitly submits the confirmation in the client.
  return (
    <QuoteAccessConfirmation
      claim={valid ? claim : null}
      tokenHash={valid ? tokenHash : null}
      initiallyInvalid={!valid}
    />
  );
}
