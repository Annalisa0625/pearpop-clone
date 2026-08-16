const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isInquirySubmissionId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function matchesInquirySubmissionTarget(
  existing: { link_page_id: string | null; inquiry_type_id: string | null },
  expected: { pageId: string; formId: string }
) {
  return (
    existing.link_page_id === expected.pageId &&
    existing.inquiry_type_id === expected.formId
  );
}

export function isPublicInquiryFormTarget(args: {
  pageStatus: string;
  isAcceptingInquiries: boolean;
  pageId: string;
  formPageId: string;
  formEnabled: boolean;
  requestedKind: "simple" | "pr";
  templateKey: string | null;
  isCustom: boolean;
}) {
  const kindMatches =
    args.requestedKind === "pr"
      ? args.templateKey === "pr_post"
      : args.templateKey === null;
  return (
    args.pageStatus === "published" &&
    args.isAcceptingInquiries &&
    args.pageId === args.formPageId &&
    args.formEnabled &&
    kindMatches
  );
}
