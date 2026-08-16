import { NextRequest } from "next/server";

const CALLBACK_PATH = "/api/line/login/callback";

export class LineOAuthOriginMismatchError extends Error {
  constructor() {
    super("LINE OAuth origin does not match this deployment.");
    this.name = "LineOAuthOriginMismatchError";
  }
}

function parseConfiguredUrl(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    throw new LineOAuthOriginMismatchError();
  }
}

/**
 * Keeps the authorize request, token exchange, and post-callback navigation on
 * the deployment that initiated the OAuth flow. Configured public URLs are
 * guards only: a mismatched value fails safely instead of switching hosts.
 */
export function resolveLineOAuthOrigin(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const requestOrigin = requestUrl.origin;
  const configuredCallback = parseConfiguredUrl(process.env.LINE_LOGIN_CALLBACK_URL);
  const configuredAppUrl = parseConfiguredUrl(
    process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim()
  );

  if (
    (configuredCallback &&
      (configuredCallback.origin !== requestOrigin ||
        configuredCallback.pathname !== CALLBACK_PATH)) ||
    (configuredAppUrl && configuredAppUrl.origin !== requestOrigin)
  ) {
    throw new LineOAuthOriginMismatchError();
  }

  return requestOrigin;
}

export function resolveLineOAuthCallbackUrl(request: NextRequest) {
  return new URL(CALLBACK_PATH, resolveLineOAuthOrigin(request)).toString();
}

export function isSafeLineOAuthReturnPath(value: string) {
  if (!value.startsWith("/")) return false;

  try {
    return new URL(value, "https://trendre.invalid").origin === "https://trendre.invalid";
  } catch {
    return false;
  }
}

export function resolveLineOAuthReturnUrl(request: NextRequest, path: string) {
  if (!isSafeLineOAuthReturnPath(path)) throw new LineOAuthOriginMismatchError();
  return new URL(path, resolveLineOAuthOrigin(request));
}
