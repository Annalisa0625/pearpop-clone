import { CREATOR_LINK_BACKGROUND_PRESETS, type CreatorLinkBackgroundPreset } from "./background-presets";

const BACKGROUND_REFERENCE_PREFIX = "trendre-background:";

export function createCreatorLinkBackgroundReference(id: string): string {
  return `${BACKGROUND_REFERENCE_PREFIX}${id}`;
}

export function parseCreatorLinkBackgroundReference(value: string | null | undefined): CreatorLinkBackgroundPreset | null {
  if (!value?.startsWith(BACKGROUND_REFERENCE_PREFIX)) return null;
  const id = value.slice(BACKGROUND_REFERENCE_PREFIX.length);
  return CREATOR_LINK_BACKGROUND_PRESETS.find((preset) => preset.id === id) ?? null;
}

export function isCreatorLinkBackgroundReference(value: string): boolean {
  return parseCreatorLinkBackgroundReference(value) !== null;
}

export function withCreatorLinkBackground<T extends { coverUrl: string | null }>(value: T, coverUrl: string | null): T {
  return { ...value, coverUrl };
}
