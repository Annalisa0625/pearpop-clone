export function trendreLinkOrderOrigin(inquiryId: string, quoteId: string) {
  return {
    creator_menu_id: null,
    trendre_link_inquiry_id: inquiryId,
    trendre_link_quote_id: quoteId,
  } as const;
}
