import type { User } from "@supabase/supabase-js";

export type TrendreLinkAuthResult = {
  user: User | null;
  error: string | null;
};

export const SESSION_IDENTITY_ERROR =
  "セッション情報を確認できませんでした。もう一度ログインしてください。";

/**
 * A bearer token is authoritative for private browser API calls, but it must
 * never be allowed to silently disagree with an already-present SSR cookie.
 */
export function reconcileBearerAndCookieUser(
  bearerUser: User | null,
  cookieUser: User | null
): TrendreLinkAuthResult {
  if (!bearerUser) {
    return { user: null, error: SESSION_IDENTITY_ERROR };
  }

  if (cookieUser && cookieUser.id !== bearerUser.id) {
    return { user: null, error: SESSION_IDENTITY_ERROR };
  }

  return { user: bearerUser, error: null };
}

export function resolveCookieAuthenticatedUser(
  cookieUser: User | null
): TrendreLinkAuthResult {
  return cookieUser
    ? { user: cookieUser, error: null }
    : { user: null, error: "ログインが必要です。" };
}
