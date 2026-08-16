function normalizeOrigin(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin.replace(/\/$/, "");
  } catch {
    return null;
  }
}

function normalizeVercelHost(value: string | null | undefined) {
  const trimmed = value?.trim().toLowerCase();
  if (!trimmed) return null;
  try {
    const url = trimmed.includes("://")
      ? new URL(trimmed)
      : new URL(`https://${trimmed}`);
    return url.host.toLowerCase();
  } catch {
    return null;
  }
}

export function getCheckoutBaseUrl(args: {
  requestOrigin: string;
  fallbackBaseUrl: string;
  vercelEnv?: string | null;
  vercelUrl?: string | null;
  vercelBranchUrl?: string | null;
}) {
  const fallback = args.fallbackBaseUrl.replace(/\/$/, "");
  const requestOrigin = normalizeOrigin(args.requestOrigin);
  if (!requestOrigin) return fallback;

  const requestUrl = new URL(requestOrigin);
  const vercelEnv = (args.vercelEnv ?? "").trim().toLowerCase();
  if (vercelEnv === "production") return fallback;
  if (vercelEnv === "preview") {
    const allowedPreviewHosts = new Set(
      [args.vercelUrl, args.vercelBranchUrl]
        .map(normalizeVercelHost)
        .filter((host): host is string => Boolean(host))
    );
    return requestUrl.protocol === "https:" &&
      allowedPreviewHosts.has(requestUrl.host.toLowerCase())
      ? requestOrigin
      : fallback;
  }

  const isLocalhost =
    requestUrl.hostname === "localhost" ||
    requestUrl.hostname === "127.0.0.1" ||
    requestUrl.hostname === "::1";
  return requestUrl.protocol === "http:" && isLocalhost
    ? requestOrigin
    : fallback;
}
