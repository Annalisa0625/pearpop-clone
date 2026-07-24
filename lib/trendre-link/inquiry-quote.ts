export type CreatorInquiryQuoteStatus =
  | "sent"
  | "accepted"
  | "declined"
  | "expired"
  | "cancelled";

export type CreatorInquiryQuote = {
  id: string;
  inquiry_id: string;
  status: CreatorInquiryQuoteStatus;
  currency: string;
  quoted_amount: number;
  buyer_marketplace_fee_amount: number;
  buyer_total_amount: number;
  creator_transaction_fee_amount: number;
  creator_payout_amount: number;
  scope: string;
  delivery_text: string | null;
  note: string | null;
  valid_until: string;
  sent_at: string;
  created_at: string;
  updated_at: string;
};

export type CreatorInquiryQuoteResponse =
  | { ok: true; quote: CreatorInquiryQuote | null }
  | { ok: false; error: string; setupRequired?: boolean };
