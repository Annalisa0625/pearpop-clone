export type QuoteOrderRepairSteps = {
  repairOrder: () => Promise<void>;
  updateQuote: () => Promise<void>;
  updateInquiry: () => Promise<void>;
  upsertEvent: () => Promise<void>;
  ensureNotifications: () => Promise<void>;
};

// Every step is idempotent in its caller. Keeping the sequence explicit makes
// a failed webhook retry resume from any partially completed state.
export async function repairQuoteOrderState(steps: QuoteOrderRepairSteps) {
  await steps.repairOrder();
  await steps.updateQuote();
  await steps.updateInquiry();
  await steps.upsertEvent();
  await steps.ensureNotifications();
}
