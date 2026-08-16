/**
 * Returns the configured public application URL only when it is safe to use
 * in a server-generated link. This helper deliberately has no quote or
 * checkout dependency so Creator Link notifications remain C-only.
 */
export function getTrustedAppUrl() {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!configured) return null;

  try {
    const url = new URL(configured);
    const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && isLocal)) {
      return null;
    }
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}
