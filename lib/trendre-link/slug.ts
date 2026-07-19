import { RESERVED_CREATOR_LINK_SLUGS } from "./constants";

export type CreatorLinkSlugValidationReason =
  | null
  | "required"
  | "too_short"
  | "too_long"
  | "invalid_format"
  | "reserved";

export type CreatorLinkSlugValidationResult = {
  valid: boolean;
  normalizedSlug: string;
  reason: CreatorLinkSlugValidationReason;
};

const RESERVED_SLUG_SET = new Set<string>(RESERVED_CREATOR_LINK_SLUGS);
const VALID_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/;

export function normalizeCreatorLinkSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/g, "");
}

export function isReservedCreatorLinkSlug(slug: string): boolean {
  return RESERVED_SLUG_SET.has(slug.trim().toLowerCase());
}

export function validateCreatorLinkSlug(
  input: string
): CreatorLinkSlugValidationResult {
  const trimmed = input.trim();
  const normalizedSlug = normalizeCreatorLinkSlug(input);

  if (!trimmed || !normalizedSlug) {
    return { valid: false, normalizedSlug, reason: "required" };
  }

  if (normalizedSlug.length < 3) {
    return { valid: false, normalizedSlug, reason: "too_short" };
  }

  if (trimmed.length > 30) {
    return { valid: false, normalizedSlug, reason: "too_long" };
  }

  if (!VALID_SLUG_PATTERN.test(normalizedSlug)) {
    return { valid: false, normalizedSlug, reason: "invalid_format" };
  }

  if (isReservedCreatorLinkSlug(normalizedSlug)) {
    return { valid: false, normalizedSlug, reason: "reserved" };
  }

  return { valid: true, normalizedSlug, reason: null };
}

