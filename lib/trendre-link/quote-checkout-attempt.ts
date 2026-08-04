export const CHECKOUT_CREATING_LOCK_MS = 2 * 60 * 1000;
export const CHECKOUT_AMBIGUOUS_RECOVERY_MS = 12 * 60 * 60 * 1000;

export type CheckoutAttemptDecision =
  | { action: "new" }
  | { action: "recover" }
  | { action: "busy" }
  | { action: "recovery_required"; reason: "missing_identity" | "recovery_window_elapsed" };

export function decideCheckoutAttempt(args: {
  checkoutStatus: string;
  hasSessionId: boolean;
  attemptCount: number;
  attemptToken: string | null;
  checkoutStartedAt: string | null;
  lockUpdatedAt: string | null;
  now?: number;
}): CheckoutAttemptDecision {
  if (args.checkoutStatus === "recovery_required") {
    return { action: "recovery_required", reason: "recovery_window_elapsed" };
  }
  const recovering =
    args.checkoutStatus === "creating" ||
    (args.checkoutStatus === "open" && !args.hasSessionId);
  if (!recovering) return { action: "new" };

  if (!args.attemptToken || args.attemptCount < 1) {
    return { action: "recovery_required", reason: "missing_identity" };
  }

  const now = args.now ?? Date.now();
  const attemptStartedAt = new Date(args.checkoutStartedAt ?? "").getTime();
  if (
    !Number.isFinite(attemptStartedAt) ||
    now - attemptStartedAt >= CHECKOUT_AMBIGUOUS_RECOVERY_MS
  ) {
    return { action: "recovery_required", reason: "recovery_window_elapsed" };
  }

  const lockUpdatedAt = new Date(args.lockUpdatedAt ?? "").getTime();
  if (
    Number.isFinite(lockUpdatedAt) &&
    now - lockUpdatedAt < CHECKOUT_CREATING_LOCK_MS
  ) {
    return { action: "busy" };
  }

  return { action: "recover" };
}
