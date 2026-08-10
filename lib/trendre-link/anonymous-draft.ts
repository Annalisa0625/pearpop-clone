import type { CreatorLinkButtonStyle, CreatorLinkFontStyle, CreatorLinkTheme } from "./constants";
import type { CreatorLinkItemAppearance, CreatorLinkSocialPlatform } from "./item-validation";

export const ANONYMOUS_LINK_DRAFT_KEY = "trendre-link:anonymous-draft:v1";
export const ANONYMOUS_LINK_DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export type AnonymousLinkDraft = {
  version: 1;
  draftId: string;
  createdAt: string;
  updatedAt: string;
  step: number;
  migration: { phase: "idle" | "auth" | "bootstrapped" | "uploading" | "hydrating" | "publishing"; pageId?: string; userId?: string };
  page: { slug: string; displayName: string; displayNameColor: string | null; bio: string; themeKey: CreatorLinkTheme; accentColor: string | null; buttonStyle: CreatorLinkButtonStyle; fontStyle: CreatorLinkFontStyle; isAcceptingInquiries: boolean; avatarAssetId: string | null; coverAssetId: string | null };
  socials: Array<{ clientId: string; platform: CreatorLinkSocialPlatform; url: string; metadata: CreatorLinkItemAppearance; isVisible: boolean }>;
  links: Array<{ clientId: string; title: string; url: string; metadata: CreatorLinkItemAppearance; isVisible: boolean; sortOrder: number }>;
};

const uid = () => typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function createAnonymousLinkDraft(): AnonymousLinkDraft {
  const now = new Date().toISOString();
  return { version: 1, draftId: uid(), createdAt: now, updatedAt: now, step: 0, migration: { phase: "idle" }, page: { slug: "", displayName: "", displayNameColor: null, bio: "", themeKey: "soft-ivory", accentColor: "#F4F5F7", buttonStyle: "rounded", fontStyle: "modern", isAcceptingInquiries: true, avatarAssetId: null, coverAssetId: null }, socials: [], links: [] };
}

export function isCurrentAnonymousLinkMigration(
  migration: AnonymousLinkDraft["migration"],
  userId: string,
  pageId: string
) {
  return migration.userId === userId && migration.pageId === pageId;
}

export function loadAnonymousLinkDraft(): AnonymousLinkDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ANONYMOUS_LINK_DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as AnonymousLinkDraft;
    if (draft?.version !== 1 || !draft.draftId || !draft.updatedAt || Date.now() - new Date(draft.updatedAt).getTime() > ANONYMOUS_LINK_DRAFT_MAX_AGE_MS) {
      window.localStorage.removeItem(ANONYMOUS_LINK_DRAFT_KEY);
      return null;
    }
    return draft;
  } catch { return null; }
}

export function saveAnonymousLinkDraft(draft: AnonymousLinkDraft) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ANONYMOUS_LINK_DRAFT_KEY, JSON.stringify({ ...draft, updatedAt: new Date().toISOString() }));
}

export function clearAnonymousLinkDraft() {
  if (typeof window !== "undefined") window.localStorage.removeItem(ANONYMOUS_LINK_DRAFT_KEY);
}

export const createDraftClientId = uid;
