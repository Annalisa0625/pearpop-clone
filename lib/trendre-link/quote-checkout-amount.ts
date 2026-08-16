export function getQuoteCheckoutAmounts(input: {
  quotedAmount: unknown;
  marketplaceFeeAmount: unknown;
  buyerTotalAmount: unknown;
  currency: unknown;
}) {
  const currency =
    typeof input.currency === "string" ? input.currency.trim().toUpperCase() : "";
  if (currency !== "JPY") return { ok: false as const, reason: "currency" as const };

  const quoteAmount = Number(input.quotedAmount);
  const marketplaceFeeAmount =
    input.marketplaceFeeAmount === null || input.marketplaceFeeAmount === undefined
      ? 0
      : Number(input.marketplaceFeeAmount);
  const totalAmount = Number(input.buyerTotalAmount);
  if (
    !Number.isSafeInteger(quoteAmount) ||
    quoteAmount <= 0 ||
    !Number.isSafeInteger(marketplaceFeeAmount) ||
    marketplaceFeeAmount < 0 ||
    !Number.isSafeInteger(totalAmount) ||
    totalAmount <= 0
  ) {
    return { ok: false as const, reason: "amount" as const };
  }
  if (quoteAmount + marketplaceFeeAmount !== totalAmount) {
    return { ok: false as const, reason: "total" as const };
  }
  return {
    ok: true as const,
    currency,
    quoteAmount,
    marketplaceFeeAmount,
    totalAmount,
    quoteStripeAmount: quoteAmount,
    feeStripeAmount: marketplaceFeeAmount || null,
    totalStripeAmount: totalAmount,
  };
}
