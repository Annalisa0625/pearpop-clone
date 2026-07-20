const STORAGE_PUBLIC_PREFIX = "/storage/v1/object/public/";

export function getCreatorImageBucket() {
  return process.env.NEXT_PUBLIC_CREATOR_IMAGE_BUCKET || "creator-assets";
}

export function getOwnedCreatorLinkStoragePath(urlValue: string, userId: string): string | null {
  try {
    const baseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    const url = new URL(urlValue);
    if (url.origin !== baseUrl.origin || !url.pathname.startsWith(STORAGE_PUBLIC_PREFIX)) return null;
    const remainder = decodeURIComponent(url.pathname.slice(STORAGE_PUBLIC_PREFIX.length));
    const slash = remainder.indexOf("/");
    if (slash < 1) return null;
    const bucket = remainder.slice(0, slash);
    const path = remainder.slice(slash + 1);
    if (bucket !== getCreatorImageBucket()) return null;
    return path.startsWith(`trendre-link/${userId}/`) ? path : null;
  } catch {
    return null;
  }
}
