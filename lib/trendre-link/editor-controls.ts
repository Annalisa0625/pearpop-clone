export const CREATOR_LINK_ADD_ACTIONS = [
  { id: "link", label: "Link", sheet: "link" },
  { id: "social", label: "Social", sheet: "social" },
] as const;

export type CreatorLinkAddAction = (typeof CREATOR_LINK_ADD_ACTIONS)[number];

export type CreatorLinkEditorCtaIntent = "save" | "add" | "saveChanges";

const CREATOR_LINK_EDITOR_CTA_COPY = {
  ja: { save: "保存", add: "追加", saveChanges: "変更を保存" },
  en: { save: "Save", add: "Add", saveChanges: "Save changes" },
} as const;

export function getCreatorLinkEditorCtaCopy(locale: "ja" | "en", intent: CreatorLinkEditorCtaIntent): string {
  return CREATOR_LINK_EDITOR_CTA_COPY[locale][intent];
}

export function getCreatorLinkItemCtaCopy(locale: "ja" | "en", isExisting: boolean): string {
  return getCreatorLinkEditorCtaCopy(locale, isExisting ? "save" : "add");
}

export type CreatorLinkSocialColorControl = "icon" | "surface" | "border";

export function getCreatorLinkSocialColorControls(shape: "icons" | "circle" | "pill"): readonly CreatorLinkSocialColorControl[] {
  return shape === "icons" ? ["icon"] : ["icon", "surface", "border"];
}

export type CreatorLinkPreviewEditTarget =
  | { sheet: "profile" }
  | { sheet: "social"; itemId?: string; platform?: string }
  | { sheet: "link"; itemId?: string }
  | { sheet: "inquiry" };

export function resolveCreatorLinkPreviewEditTarget(value: { kind: "profile" | "social" | "link" | "work"; itemId?: string; platform?: string }): CreatorLinkPreviewEditTarget {
  if (value.kind === "profile") return { sheet: "profile" };
  if (value.kind === "work") return { sheet: "inquiry" };
  if (value.kind === "social") return { sheet: "social", ...(value.itemId ? { itemId: value.itemId } : {}), ...(value.platform ? { platform: value.platform } : {}) };
  return { sheet: "link", ...(value.itemId ? { itemId: value.itemId } : {}) };
}
