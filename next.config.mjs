// @ts-check

import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

function normalizeAppUrl(value, { allowLocal = false } = {}) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(candidate);
    const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";

    if (url.protocol !== "https:" && !(allowLocal && isLocal && url.protocol === "http:")) {
      return null;
    }

    url.pathname = "/";
    url.search = "";
    url.hash = "";
    return url.origin;
  } catch {
    return null;
  }
}

function resolveAppUrl() {
  const explicitUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (process.env.VERCEL_ENV === "preview") {
    return (
      normalizeAppUrl(process.env.VERCEL_BRANCH_URL) ||
      normalizeAppUrl(process.env.VERCEL_URL) ||
      normalizeAppUrl(explicitUrl)
    );
  }

  if (process.env.VERCEL_ENV === "production") {
    return (
      normalizeAppUrl(explicitUrl) ||
      normalizeAppUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL)
    );
  }

  return normalizeAppUrl(explicitUrl, { allowLocal: true }) || "http://localhost:3000";
}

const appUrl = resolveAppUrl();

/** @type {import("next").NextConfig} */
const nextConfig = {
  turbopack: {
    root: projectRoot,
  },
  env: appUrl
    ? {
        NEXT_PUBLIC_APP_URL: appUrl,
      }
    : {},
};

export default nextConfig;
