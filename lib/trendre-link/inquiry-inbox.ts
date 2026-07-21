export const CREATOR_LINK_INQUIRY_STATUSES = [
  "new",
  "read",
  "considering",
  "replied",
  "quoted",
  "accepted",
  "declined",
  "closed",
] as const;

export type CreatorLinkInquiryStatus =
  (typeof CREATOR_LINK_INQUIRY_STATUSES)[number];

export type CreatorLinkInquiryListItem = {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
  inquiry_type: string;
  inquiry_type_title_snapshot: string | null;
  company_name: string | null;
  contact_name: string | null;
  contact_email: string;
  product_name: string | null;
  desired_timing: string | null;
  budget_text: string | null;
  requested_platform: string | null;
  offer_type: string | null;
  purpose: string | null;
  message: string | null;
  source: string;
  company_user_id: string | null;
  converted_order_id: string | null;
  converted_request_id: string | null;
};

export type CreatorLinkInquiryInboxResponse =
  | {
      ok: true;
      inquiries: CreatorLinkInquiryListItem[];
      counts: {
        all: number;
        new: number;
        active: number;
        closed: number;
      };
    }
  | { ok: false; error: string };

export type CreatorLinkInquiryDetailResponse =
  | { ok: true; inquiry: CreatorLinkInquiryListItem }
  | { ok: false; error: string };

export const CREATOR_LINK_ACTIVE_INQUIRY_STATUSES = [
  "read",
  "considering",
  "replied",
  "quoted",
] as const;

export const CREATOR_LINK_CLOSED_INQUIRY_STATUSES = [
  "accepted",
  "declined",
  "closed",
] as const;

export function isCreatorLinkInquiryStatus(
  value: unknown
): value is CreatorLinkInquiryStatus {
  return (
    typeof value === "string" &&
    (CREATOR_LINK_INQUIRY_STATUSES as readonly string[]).includes(value)
  );
}
