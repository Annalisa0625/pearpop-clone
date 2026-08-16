export type QuoteCheckoutState =
  | "sent"
  | "accepted"
  | "declined"
  | "expired"
  | "cancelled";

export function getQuoteCheckoutRejection(args: {
  status: string | null | undefined;
  validUntil: string | null | undefined;
  now?: number;
}) {
  if (args.status !== "accepted") {
    return "承認済みの見積もりのみ支払いへ進めます。";
  }

  const validUntil = new Date(args.validUntil ?? "").getTime();
  if (!Number.isFinite(validUntil) || validUntil <= (args.now ?? Date.now())) {
    return "見積もりの有効期限が切れています。";
  }

  return null;
}

export function isOwnedQuoteCheckout(args: {
  userId: string;
  accessUserId: string | null | undefined;
  accessInquiryId: string | null | undefined;
  quoteCompanyUserId: string | null | undefined;
  quoteInquiryId: string | null | undefined;
}) {
  return Boolean(
    args.userId &&
      args.accessUserId === args.userId &&
      args.quoteCompanyUserId === args.userId &&
      args.accessInquiryId &&
      args.accessInquiryId === args.quoteInquiryId
  );
}

export function isSafeTrendreLinkCheckoutMetadata(
  metadata: Record<string, string> | null | undefined,
  expected: {
    quoteId: string;
    inquiryId: string;
    companyUserId: string;
    creatorUserId: string;
  }
) {
  return Boolean(
    metadata &&
      metadata.source === "trendre_link_quote" &&
      metadata.trendre_link_quote_id === expected.quoteId &&
      metadata.trendre_link_inquiry_id === expected.inquiryId &&
      metadata.supabase_user_id === expected.companyUserId &&
      metadata.b_user_id === expected.companyUserId &&
      metadata.creator_user_id === expected.creatorUserId
  );
}
