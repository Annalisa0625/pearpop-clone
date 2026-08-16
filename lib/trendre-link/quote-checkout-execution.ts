export async function createStripeSessionForClaim<T>(args: {
  verifyClaim: () => Promise<boolean>;
  createSession: () => Promise<T>;
}) {
  if (!(await args.verifyClaim())) {
    throw new Error("quote_checkout_claim_lost");
  }
  return args.createSession();
}
