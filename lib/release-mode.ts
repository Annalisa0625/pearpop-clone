type ReleaseEnvironment = { TRENDRE_RELEASE_MODE?: string };

const BLOCKED_PAGE_PREFIXES = [
  "/home",
  "/for-companies",
  "/signup/company",
  "/signup/company-entry",
  "/b",
  "/company",
] as const;

const BLOCKED_API_PREFIXES = ["/api/b", "/api/company"] as const;

const BLOCKED_API_PATHS = new Set([
  "/api/orders/checkout",
  "/api/orders/sync-checkout-session",
  "/api/requests/create",
  "/api/public/inquiries",
  "/api/stripe/checkout",
  "/api/stripe/portal",
  "/api/stripe/sync-checkout-session",
  "/api/stripe/sync-current-subscription",
  "/api/stripe/webhook",
  "/api/signup/complete-company",
]);

function matchesPathPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Server-only release switch. An unset value preserves normal B/C behavior. */
export function isCreatorOnlyRelease(
  environment: ReleaseEnvironment = process.env as ReleaseEnvironment
) {
  return environment.TRENDRE_RELEASE_MODE === "c_only";
}

export function isCreatorOnlyBlockedPagePath(pathname: string) {
  return BLOCKED_PAGE_PREFIXES.some((prefix) => matchesPathPrefix(pathname, prefix));
}

export function isCreatorOnlyBlockedApiPath(pathname: string) {
  return (
    BLOCKED_API_PREFIXES.some((prefix) => matchesPathPrefix(pathname, prefix)) ||
    BLOCKED_API_PATHS.has(pathname) ||
    /^\/api\/creator\/orders\/inquiries\/[^/]+\/quote\/?$/.test(pathname)
  );
}

/**
 * Shared chat/order endpoints keep their normal authorization rules. During a
 * C-only release, however, an existing Company participant must not be able
 * to use the Company side through a crafted request. Resource participant IDs
 * are used instead of user_roles ordering, so multi-role accounts are only
 * allowed when they are the Creator participant for that specific resource.
 */
export function isCreatorOnlyCompanyResourceActor(args: {
  actorUserId: string;
  creatorUserId: string | null | undefined;
  companyUserId: string | null | undefined;
}, environment: ReleaseEnvironment = process.env as ReleaseEnvironment) {
  return (
    isCreatorOnlyRelease(environment) &&
    args.companyUserId === args.actorUserId &&
    args.creatorUserId !== args.actorUserId
  );
}

export function isCreatorOnlyBlockedPath(pathname: string) {
  return pathname.startsWith("/api/")
    ? isCreatorOnlyBlockedApiPath(pathname)
    : isCreatorOnlyBlockedPagePath(pathname);
}
