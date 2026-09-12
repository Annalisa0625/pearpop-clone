const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeCheckoutAttemptId(value: unknown) {
  const attemptId = typeof value === "string" ? value.trim() : "";
  return UUID_PATTERN.test(attemptId) ? attemptId : null;
}

export function getCheckoutSessionIdempotencyKey(
  orderId: string,
  expiredSessionId: string | null
) {
  return expiredSessionId
    ? `trendmart_checkout:${orderId}:after:${expiredSessionId}`
    : `trendmart_checkout:${orderId}:initial`;
}

export function getExistingCheckoutSessionAction(session: {
  status?: string | null;
  url?: string | null;
}) {
  if (session.status === "open" && session.url) return "reuse_open" as const;
  if (session.status === "complete") return "already_completed" as const;
  if (session.status === "expired") return "replace_expired" as const;
  return "unavailable" as const;
}

export function isCheckoutAttemptUniqueViolation(error: unknown) {
  return (error as { code?: unknown } | null)?.code === "23505";
}

export function checkoutAttemptMatchesOrder(
  order: { creator_id?: string | null; creator_menu_id?: string | null },
  creatorId: string,
  creatorMenuId: string
) {
  return (
    order.creator_id === creatorId && order.creator_menu_id === creatorMenuId
  );
}

export function buildCheckoutPayloadFingerprint(input: {
  creatorId: string;
  creatorMenuId: string;
  projectType: string;
  productName: string;
  freeOfferDetail: string | null;
  productUrl: string | null;
  deadline: string | null;
  requirements: string;
  hasFreeOffer: boolean;
  wantsSecondaryUse: boolean;
  prAccount: string | null;
  prHashtags: string[];
  postNotes: string | null;
  referenceAssets: Array<{
    storage_path: string;
    file_name: string;
    file_type: string;
    mime_type: string;
    size_bytes: number;
    sort_order: number;
  }>;
}) {
  const canonicalPayload = {
    creator_id: input.creatorId,
    creator_menu_id: input.creatorMenuId,
    project_type: input.projectType,
    product_name: input.productName,
    free_offer_detail: input.freeOfferDetail,
    product_url: input.productUrl,
    deadline: input.deadline,
    requirements: input.requirements,
    has_free_offer: input.hasFreeOffer,
    wants_secondary_use: input.wantsSecondaryUse,
    pr_account: input.prAccount,
    pr_hashtags: input.prHashtags,
    post_notes: input.postNotes,
    reference_assets: [...input.referenceAssets]
      .sort(
        (left, right) =>
          left.sort_order - right.sort_order ||
          left.storage_path.localeCompare(right.storage_path)
      )
      .map((asset) => ({
        storage_path: asset.storage_path,
        file_name: asset.file_name,
        file_type: asset.file_type,
        mime_type: asset.mime_type,
        size_bytes: asset.size_bytes,
        sort_order: asset.sort_order,
      })),
  };

  return createHash("sha256")
    .update(JSON.stringify(canonicalPayload))
    .digest("hex");
}
import { createHash } from "node:crypto";
