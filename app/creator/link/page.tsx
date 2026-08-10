"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Link2, MessageSquareText, Palette, Share2, Sparkles, UserRound } from "lucide-react";
import TrendreLinkCanvas, {
  type TrendreLinkCanvasData,
  type TrendreLinkEditableField,
  type TrendreLinkCanvasItem,
  type TrendreLinkCanvasInquiryType,
} from "@/components/trendre-link/TrendreLinkCanvas";
import StylePresetGallery from "@/components/trendre-link/StylePresetGallery";
import SocialBrandIcon from "@/components/trendre-link/SocialBrandIcon";
import InquiryFormModal from "@/components/trendre-link/InquiryFormModal";
import CardDesignSelector from "./_components/CardDesignSelector";
import EditorBottomSheet from "./_components/EditorBottomSheet";
import ProfileImageCropModal from "./_components/ProfileImageCropModal";
import CreatorLinkOnboarding, { type OnboardingLinkForm } from "./_components/CreatorLinkOnboarding";
import CreatorLinkItemsEditor from "./_components/CreatorLinkItemsEditor";
import { CREATOR_LINK_BACKGROUND_PRESETS } from "@/lib/trendre-link/background-presets";
import { applyLinkDesignPreset, findMatchingLinkDesignPreset, getAvailableLinkDesignPresetCategories, type LinkDesignPresetCategory } from "@/lib/trendre-link/link-design-presets";
import type { CreatorLinkOnboardingPreset } from "@/lib/trendre-link/onboarding-presets";
import { useAppLocale } from "@/lib/i18n/locale";
import {
  isCreatorLinkStatus,
  isCreatorLinkTheme,
  isCreatorLinkButtonStyle,
  isCreatorLinkFontStyle,
  type CreatorLinkStatus,
  type CreatorLinkTheme,
  type CreatorLinkButtonStyle,
  type CreatorLinkFontStyle,
} from "@/lib/trendre-link/constants";
import { validateCreatorLinkSlug } from "@/lib/trendre-link/slug";
import {
  CREATOR_LINK_SOCIAL_PLATFORMS,
  isCreatorLinkSocialPlatform,
  normalizeSocialProfile,
  validateGeneralLink,
  DEFAULT_CREATOR_LINK_ITEM_APPEARANCE,
  normalizeCreatorLinkItemAppearance,
  type CreatorLinkItemAppearance,
  type CreatorLinkSocialPlatform,
} from "@/lib/trendre-link/item-validation";
import { INQUIRY_FORM_DEFAULTS, type CreatorLinkInquiryFormKind } from "@/lib/trendre-link/inquiry-forms";
import type {
  CreatorLinkBootstrapResponse,
  CreatorLinkInquiryType,
  CreatorLinkItem,
  CreatorLinkItemDeleteResponse,
  CreatorLinkItemMutationResponse,
  CreatorLinkItemsReorderResponse,
  CreatorLinkInquiryFormsUpdateResponse,
  CreatorLinkPage,
  CreatorLinkPageUpdateResponse,
  CreatorLinkSlugAvailabilityResponse,
} from "@/lib/trendre-link/types";

type LinkFormState = {
  displayName: string;
  displayNameColor: string | null;
  bio: string;
  slug: string;
  themeKey: CreatorLinkTheme;
  isAcceptingInquiries: boolean;
  status: CreatorLinkStatus;
  accentColor: string | null;
  buttonStyle: CreatorLinkButtonStyle;
  fontStyle: CreatorLinkFontStyle;
  avatarUrl: string | null;
  coverUrl: string | null;
};

type SlugCheckState = "idle" | "checking" | "available" | "unavailable" | "invalid";
type Sheet = "links" | "profile" | "preset" | "theme" | "wallpaper" | "text" | "buttons" | "colors" | "social" | "social-design" | "link" | "inquiry" | null;
type Toast = { tone: "success" | "error" | "info"; message: string } | null;
type SocialInputs = Record<CreatorLinkSocialPlatform, string>;
type SocialAppearances = Record<CreatorLinkSocialPlatform, CreatorLinkItemAppearance>;
type LinkEditorState = { id: string | null; title: string; url: string; appearance: CreatorLinkItemAppearance };
type InquiryFormEditor = Record<CreatorLinkInquiryFormKind, { title: string; isEnabled: boolean }>;

const INITIAL_LOAD_ERROR = "Linkページを読み込めませんでした。";
const SLUG_CHECK_ERROR = "slugの利用可否を確認できませんでした。";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCreatorLinkPage(value: unknown): value is CreatorLinkPage {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.creatorId === "string" &&
    typeof value.ownerUserId === "string" &&
    typeof value.slug === "string" &&
    typeof value.displayName === "string" &&
    (value.displayNameColor === null || (typeof value.displayNameColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(value.displayNameColor))) &&
    (typeof value.bio === "string" || value.bio === null) &&
    isCreatorLinkTheme(typeof value.themeKey === "string" ? value.themeKey : "") &&
    isCreatorLinkStatus(typeof value.status === "string" ? value.status : "") &&
    (value.accentColor === null || (typeof value.accentColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(value.accentColor))) &&
    isCreatorLinkButtonStyle(typeof value.buttonStyle === "string" ? value.buttonStyle : "") &&
    isCreatorLinkFontStyle(typeof value.fontStyle === "string" ? value.fontStyle : "") &&
    typeof value.isAcceptingInquiries === "boolean"
  );
}

function isBootstrapSuccess(value: unknown): value is Extract<CreatorLinkBootstrapResponse, { ok: true }> {
  return isRecord(value) && value.ok === true && typeof value.isNewLink === "boolean" && isCreatorLinkPage(value.page) && Array.isArray(value.items) && Array.isArray(value.inquiryTypes);
}

function isUpdateSuccess(value: unknown): value is Extract<CreatorLinkPageUpdateResponse, { ok: true }> {
  return isRecord(value) && value.ok === true && isCreatorLinkPage(value.page);
}

function isSlugResponse(value: unknown): value is Extract<CreatorLinkSlugAvailabilityResponse, { ok: true }> {
  return isRecord(value) && value.ok === true && typeof value.normalizedSlug === "string" && typeof value.available === "boolean";
}

function isItemMutationSuccess(value: unknown): value is Extract<CreatorLinkItemMutationResponse, { ok: true }> {
  return isRecord(value) && value.ok === true && isRecord(value.item) && typeof value.item.id === "string";
}

function isItemDeleteSuccess(value: unknown): value is Extract<CreatorLinkItemDeleteResponse, { ok: true }> {
  return isRecord(value) && value.ok === true && typeof value.deletedItemId === "string";
}

function isReorderSuccess(value: unknown): value is Extract<CreatorLinkItemsReorderResponse, { ok: true }> {
  return isRecord(value) && value.ok === true && Array.isArray(value.items);
}

function isInquiryFormsUpdateSuccess(value: unknown): value is Extract<CreatorLinkInquiryFormsUpdateResponse, { ok: true }> {
  return isRecord(value) && value.ok === true && Array.isArray(value.inquiryTypes) && typeof value.isAcceptingInquiries === "boolean";
}

function isImageUploadSuccess(value: unknown): value is { ok: true; url: string } {
  return isRecord(value) && value.ok === true && typeof value.url === "string";
}

const EMPTY_SOCIAL_INPUTS: SocialInputs = { instagram: "", tiktok: "", x: "", youtube: "" };
const EMPTY_LINK_EDITOR: LinkEditorState = { id: null, title: "", url: "", appearance: DEFAULT_CREATOR_LINK_ITEM_APPEARANCE };
const EMPTY_SOCIAL_APPEARANCES: SocialAppearances = {
  instagram: DEFAULT_CREATOR_LINK_ITEM_APPEARANCE,
  tiktok: DEFAULT_CREATOR_LINK_ITEM_APPEARANCE,
  x: DEFAULT_CREATOR_LINK_ITEM_APPEARANCE,
  youtube: DEFAULT_CREATOR_LINK_ITEM_APPEARANCE,
};

const EMPTY_INQUIRY_FORMS: InquiryFormEditor = {
  simple: { title: INQUIRY_FORM_DEFAULTS.simple.title, isEnabled: false },
  pr: { title: INQUIRY_FORM_DEFAULTS.pr.title, isEnabled: false },
};

function getApiError(value: unknown, fallback: string): string {
  return isRecord(value) && typeof value.error === "string" ? value.error : fallback;
}

function toFormState(page: CreatorLinkPage): LinkFormState {
  return {
    displayName: page.displayName,
    displayNameColor: page.displayNameColor,
    bio: page.bio ?? "",
    slug: page.slug,
    themeKey: page.themeKey,
    isAcceptingInquiries: page.isAcceptingInquiries,
    status: page.status,
    accentColor: page.accentColor,
    buttonStyle: page.buttonStyle,
    fontStyle: page.fontStyle,
    avatarUrl: page.avatarUrl,
    coverUrl: page.coverUrl,
  };
}

function toInquiryFormEditor(types: CreatorLinkInquiryType[]): InquiryFormEditor {
  const simple = types.find((item) => item.templateKey === null);
  const pr = types.find((item) => item.templateKey === "pr_post");
  return {
    simple: { title: simple?.title ?? INQUIRY_FORM_DEFAULTS.simple.title, isEnabled: simple?.isEnabled ?? false },
    pr: { title: !pr || (pr.title === "PR投稿" && !pr.isCustom) ? INQUIRY_FORM_DEFAULTS.pr.title : pr.title, isEnabled: pr?.isEnabled ?? false },
  };
}

function BackIcon() {
  return <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true"><path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function CameraIcon() {
  return <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true"><path d="M8.5 6.5 10 4.75h4l1.5 1.75H18A2.5 2.5 0 0 1 20.5 9v7A2.5 2.5 0 0 1 18 18.5H6A2.5 2.5 0 0 1 3.5 16V9A2.5 2.5 0 0 1 6 6.5h2.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><circle cx="12" cy="12.5" r="3.25" stroke="currentColor" strokeWidth="1.7" /></svg>;
}

function UserIcon() {
  return <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true"><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" /><path d="M5 20c.7-3.7 3-5.5 7-5.5s6.3 1.8 7 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}

function CheckIcon() {
  return <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true"><path d="m5 12.5 4.2 4.2L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function TrashIcon() {
  return <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" aria-hidden="true"><path d="M5 7h14M9 7V4h6v3m2 0-1 13H8L7 7m3 4v5m4-5v5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function CreatorLinkBuilderPage() {
  const router = useRouter();
  const routerRef = useRef(router);
  const { locale } = useAppLocale();
  const [page, setPage] = useState<CreatorLinkPage | null>(null);
  const [form, setForm] = useState<LinkFormState | null>(null);
  const [items, setItems] = useState<CreatorLinkItem[]>([]);
  const [inquiryTypes, setInquiryTypes] = useState<CreatorLinkInquiryType[]>([]);
  const [inquiryFormEditor, setInquiryFormEditor] = useState<InquiryFormEditor>(EMPTY_INQUIRY_FORMS);
  const [inquirySaving, setInquirySaving] = useState(false);
  const [previewInquiry, setPreviewInquiry] = useState<{ kind: CreatorLinkInquiryFormKind; title: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slugCheck, setSlugCheck] = useState<SlugCheckState>("idle");
  const [slugError, setSlugError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [presetCategory, setPresetCategory] = useState<LinkDesignPresetCategory>("normal");
  const [editingField, setEditingField] = useState<TrendreLinkEditableField>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [itemSaving, setItemSaving] = useState<string | null>(null);
  const [socialInputs, setSocialInputs] = useState<SocialInputs>(EMPTY_SOCIAL_INPUTS);
  const [socialAppearances, setSocialAppearances] = useState<SocialAppearances>(EMPTY_SOCIAL_APPEARANCES);
  const [activeSocial, setActiveSocial] = useState<CreatorLinkSocialPlatform>("instagram");
  const [linkEditor, setLinkEditor] = useState<LinkEditorState>(EMPTY_LINK_EDITOR);
  const [uploadingImage, setUploadingImage] = useState<"avatar" | "background" | null>(null);
  const [avatarCropFile, setAvatarCropFile] = useState<File | null>(null);
  const [showFirstRun, setShowFirstRun] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingCompletionReady, setOnboardingCompletionReady] = useState(false);
  const firstRunHandledRef = useRef(false);
  const publicUrlRef = useRef<HTMLInputElement>(null);

  const copy = useMemo(() => locale === "ja" ? {
    edit: "編集", preview: "プレビュー", draft: "下書き", published: "公開中", private: "非公開",
    back: "戻る", accountProfile: "アカウントプロフィール",
    copyUrl: "URLをコピー", copied: "URLをコピーしました", openPage: "公開ページを開く", profile: "名前", theme: "背景", link: "リンク", sns: "SNS", inquiry: "フォーム",
    urlSettings: "プロフィール", urlHelp: "名前・自己紹介・公開URLを編集します", checking: "確認中", available: "利用可能", unavailable: "使用されています", invalid: "形式が正しくありません", checkFailed: "確認に失敗しました",
    close: "閉じる", done: "完了", themeTitle: "背景を選ぶ", themeHelp: "選択するとページへすぐ反映されます", inquiryTitle: "フォーム設定", inquiryHelp: "仕事相談フォームの公開状態を設定します", accepting: "仕事相談フォームを公開する", paused: "仕事相談フォームを非公開にする",
    socialTitle: "SNSを編集", socialHelp: "ユーザー名または公式プロフィールURLを入力してください", linkTitle: "リンクを追加", editLinkTitle: "リンクを編集", linkName: "リンク名", url: "URL", saveItem: "保存", deleteItem: "削除", itemSaved: "保存しました", itemDeleted: "削除しました", reorderError: "並び順を保存できませんでした。", itemError: "アイテムを保存できませんでした。", formName: "表示名", bio: "自己紹介",
    saveDraft: "下書き保存", saveChanges: "変更を保存", backToDraft: "下書きに戻す", publish: "公開する", unpublish: "非公開にする", saving: "保存中...", saved: "保存しました", publishedMessage: "公開しました", saveError: "Linkページを保存できませんでした。", loadError: "Linkページを読み込めませんでした。",
    themes: {
      "night-purple": "ミッドナイト", "soft-ivory": "アイボリー", "minimal-black": "ミニマル", "natural-beige": "ナチュラル",
    },
  } : {
    edit: "Edit", preview: "Preview", draft: "Draft", published: "Published", private: "Private",
    back: "Back", accountProfile: "Account profile",
    copyUrl: "Copy URL", copied: "URL copied", openPage: "Open public page", profile: "Name", theme: "Background", link: "Link", sns: "Social", inquiry: "Form",
    urlSettings: "Profile", urlHelp: "Edit your name, bio, and public URL", checking: "Checking", available: "Available", unavailable: "Already in use", invalid: "Invalid format", checkFailed: "Check failed",
    close: "Close", done: "Done", themeTitle: "Choose a background", themeHelp: "Your selection appears on the page immediately", inquiryTitle: "Form settings", inquiryHelp: "Control whether your work inquiry form is public", accepting: "Publish work inquiry form", paused: "Hide work inquiry form",
    socialTitle: "Edit social links", socialHelp: "Enter a username or official profile URL", linkTitle: "Add link", editLinkTitle: "Edit link", linkName: "Link name", url: "URL", saveItem: "Save", deleteItem: "Delete", itemSaved: "Saved", itemDeleted: "Deleted", reorderError: "Could not save the new order.", itemError: "Could not save the item.", formName: "Display name", bio: "Bio",
    saveDraft: "Save draft", saveChanges: "Save changes", backToDraft: "Move to draft", publish: "Publish", unpublish: "Make private", saving: "Saving...", saved: "Saved", publishedMessage: "Published", saveError: "Could not save your Link page.", loadError: "Could not load your Link page.",
    themes: {
      "night-purple": "Midnight", "soft-ivory": "Ivory", "minimal-black": "Minimal", "natural-beige": "Natural",
    },
  }, [locale]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (firstRunHandledRef.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("firstRun") !== "1") return;
    firstRunHandledRef.current = true;
    setShowFirstRun(true);
    params.delete("firstRun");
    const query = params.toString();
    routerRef.current.replace(`/creator/link${query ? `?${query}` : ""}`, { scroll: false });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/creator/link/bootstrap", { method: "POST", credentials: "include", signal: controller.signal });
        if (response.status === 401) {
          routerRef.current.replace("/login");
          return;
        }
        const data: unknown = await response.json().catch(() => null);
        if (!response.ok || !isBootstrapSuccess(data)) throw new Error(getApiError(data, INITIAL_LOAD_ERROR));
        setPage(data.page);
        setForm(toFormState(data.page));
        setItems(data.items.sort((a, b) => a.sortOrder - b.sortOrder));
        setInquiryTypes(data.inquiryTypes);
        setInquiryFormEditor(toInquiryFormEditor(data.inquiryTypes));
        if (data.isNewLink && !firstRunHandledRef.current) {
          firstRunHandledRef.current = true;
          setShowFirstRun(true);
        }
      } catch (loadError) {
        if (!controller.signal.aborted) setToast({ tone: "error", message: loadError instanceof Error ? loadError.message : INITIAL_LOAD_ERROR });
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!form || !page) return;
    setSlugError(null);
    const validation = validateCreatorLinkSlug(form.slug);
    if (!validation.valid) {
      setSlugCheck("invalid");
      return;
    }
    setSlugCheck("checking");
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ slug: form.slug, excludePageId: page.id });
        const response = await fetch(`/api/creator/link/slug-availability?${params.toString()}`, { credentials: "include", signal: controller.signal });
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        const data: unknown = await response.json().catch(() => null);
        if (!response.ok || !isSlugResponse(data)) {
          setSlugCheck("unavailable");
          setSlugError(getApiError(data, SLUG_CHECK_ERROR));
          return;
        }
        setSlugError(null);
        setSlugCheck(data.available ? "available" : "unavailable");
      } catch {
        if (!controller.signal.aborted) {
          setSlugCheck("unavailable");
          setSlugError(SLUG_CHECK_ERROR);
        }
      }
    }, 500);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [form?.slug, page?.id, router]);

  const save = async (nextStatus: CreatorLinkStatus): Promise<boolean> => {
    if (!form || !page || saving) return false;
    if (nextStatus === "published" && !form.displayName.trim()) {
      setToast({ tone: "error", message: locale === "ja" ? "公開する前に表示名を設定してください。" : "Set a display name before publishing." });
      setSheet("profile");
      return false;
    }
    if (nextStatus === "published" && (slugCheck !== "available" || slugError)) {
      setToast({ tone: "error", message: locale === "ja" ? "公開URLを確認してください。" : "Check your public URL." });
      setSheet("profile");
      return false;
    }
    if (slugCheck !== "available" || slugError) return false;
    setSaving(true);
    setToast(null);
    try {
      const response = await fetch("/api/creator/link/page", {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: page.id, displayName: form.displayName, displayNameColor: form.displayNameColor, bio: form.bio, slug: form.slug, themeKey: form.themeKey, accentColor: form.accentColor, buttonStyle: form.buttonStyle, fontStyle: form.fontStyle, avatarUrl: form.avatarUrl, coverUrl: form.coverUrl, isAcceptingInquiries: form.isAcceptingInquiries, status: nextStatus }),
      });
      if (response.status === 401) {
        router.replace("/login");
        return false;
      }
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok || !isUpdateSuccess(data)) throw new Error(getApiError(data, copy.saveError));
      setPage(data.page);
      setForm(toFormState(data.page));
      setSlugCheck("available");
      setToast({ tone: "success", message: nextStatus === "published" ? copy.publishedMessage : copy.saved });
      return true;
    } catch (saveError) {
      setToast({ tone: "error", message: saveError instanceof Error ? saveError.message : copy.saveError });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const openSocialSheet = () => {
    const next = { ...EMPTY_SOCIAL_INPUTS };
    const nextAppearances = { ...EMPTY_SOCIAL_APPEARANCES };
    for (const item of items) {
      if (item.itemType === "social" && item.platform && isCreatorLinkSocialPlatform(item.platform)) {
        next[item.platform] = item.url ?? "";
        nextAppearances[item.platform] = normalizeCreatorLinkItemAppearance(item.metadata);
      }
    }
    setSocialInputs(next);
    setSocialAppearances(nextAppearances);
    setSheet("social");
  };

  const openLinkSheet = (item?: CreatorLinkItem | TrendreLinkCanvasItem) => {
    setLinkEditor(item && item.itemType === "link" ? {
      id: item.id ?? null,
      title: item.title ?? "",
      url: item.url ?? "",
      appearance: normalizeCreatorLinkItemAppearance(item.metadata),
    } : EMPTY_LINK_EDITOR);
    setSheet("link");
  };

  const saveSocial = async (platform: CreatorLinkSocialPlatform): Promise<boolean> => {
    if (!page || itemSaving) return false;
    const normalized = normalizeSocialProfile(platform, socialInputs[platform]);
    if (!normalized.ok) {
      setToast({ tone: "error", message: normalized.error });
      return false;
    }
    const existing = items.find((item) => item.itemType === "social" && item.platform === platform);
    setItemSaving(`social:${platform}`);
    try {
      const response = await fetch(existing ? `/api/creator/link/items/${existing.id}` : "/api/creator/link/items", {
        method: existing ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: page.id, itemType: "social", platform, url: socialInputs[platform], metadata: socialAppearances[platform] }),
      });
      if (response.status === 401) { router.replace("/login"); return false; }
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok || !isItemMutationSuccess(data)) throw new Error(getApiError(data, copy.itemError));
      setItems((current) => existing ? current.map((item) => item.id === data.item.id ? data.item : item) : [...current, data.item]);
      setSocialInputs((current) => ({ ...current, [platform]: data.item.url ?? normalized.value.url }));
      setToast({ tone: "success", message: copy.itemSaved });
      return true;
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : copy.itemError });
      return false;
    } finally {
      setItemSaving(null);
    }
  };

  const deleteItem = async (id: string) => {
    if (itemSaving) return;
    setItemSaving(id);
    try {
      const response = await fetch(`/api/creator/link/items/${id}`, { method: "DELETE", credentials: "include" });
      if (response.status === 401) { router.replace("/login"); return; }
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok || !isItemDeleteSuccess(data)) throw new Error(getApiError(data, copy.itemError));
      const deleted = items.find((item) => item.id === id);
      setItems((current) => current.filter((item) => item.id !== id));
      if (deleted?.itemType === "social" && deleted.platform && isCreatorLinkSocialPlatform(deleted.platform)) {
        setSocialInputs((current) => ({ ...current, [deleted.platform as CreatorLinkSocialPlatform]: "" }));
        setSocialAppearances((current) => ({ ...current, [deleted.platform as CreatorLinkSocialPlatform]: DEFAULT_CREATOR_LINK_ITEM_APPEARANCE }));
      }
      if (linkEditor.id === id) setLinkEditor(EMPTY_LINK_EDITOR);
      setToast({ tone: "success", message: copy.itemDeleted });
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : copy.itemError });
    } finally {
      setItemSaving(null);
    }
  };

  const saveLink = async () => {
    if (!page || itemSaving) return;
    const validated = validateGeneralLink(linkEditor);
    if (!validated.ok) {
      setToast({ tone: "error", message: validated.error });
      return;
    }
    setItemSaving(linkEditor.id ?? "new-link");
    try {
      const response = await fetch(linkEditor.id ? `/api/creator/link/items/${linkEditor.id}` : "/api/creator/link/items", {
        method: linkEditor.id ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: page.id, itemType: "link", title: linkEditor.title, url: linkEditor.url, metadata: linkEditor.appearance }),
      });
      if (response.status === 401) { router.replace("/login"); return; }
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok || !isItemMutationSuccess(data)) throw new Error(getApiError(data, copy.itemError));
      setItems((current) => linkEditor.id ? current.map((item) => item.id === data.item.id ? data.item : item) : [...current, data.item]);
      setLinkEditor({ id: data.item.id, title: data.item.title ?? "", url: data.item.url ?? "", appearance: data.item.metadata });
      setToast({ tone: "success", message: copy.itemSaved });
      if (showFirstRun && onboardingStep === 4) {
        setSheet(null);
        setOnboardingStep(5);
      }
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : copy.itemError });
    } finally {
      setItemSaving(null);
    }
  };

  const applyOnboardingPreset = async (preset: CreatorLinkOnboardingPreset): Promise<boolean> => {
    if (!page || !form || itemSaving || saving) return false;
    const previousForm = form;
    const previousItems = items;
    const applied = applyLinkDesignPreset(preset, {
      page: form,
      socials: items.filter((item) => item.itemType === "social"),
      links: items.filter((item) => item.itemType === "link"),
    });
    const nextForm = { ...applied.page, coverUrl: null };
    const updatedItems = new Map([...applied.socials, ...applied.links].map((item) => [item.id, item]));
    const nextItems = items.map((item) => updatedItems.get(item.id) ?? item);
    setForm(nextForm);
    setItems(nextItems);
    setItemSaving("style-preset");
    try {
      const pageRequest = fetch("/api/creator/link/page", {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: page.id, displayName: nextForm.displayName, displayNameColor: nextForm.displayNameColor, bio: nextForm.bio, slug: nextForm.slug, themeKey: nextForm.themeKey, accentColor: nextForm.accentColor, buttonStyle: nextForm.buttonStyle, fontStyle: nextForm.fontStyle, avatarUrl: nextForm.avatarUrl, coverUrl: nextForm.coverUrl, isAcceptingInquiries: nextForm.isAcceptingInquiries, status: nextForm.status }),
      }).then(async (response) => ({ response, data: await response.json().catch(() => null) as unknown }));
      const itemRequests = nextItems.filter((item) => item.itemType === "social" || item.itemType === "link").map(async (item) => {
        const response = await fetch(`/api/creator/link/items/${item.id}`, {
          method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...(item.itemType === "social" ? { platform: item.platform, url: item.url } : { title: item.title, url: item.url }), metadata: item.metadata }),
        });
        const data: unknown = await response.json().catch(() => null);
        if (!response.ok || !isItemMutationSuccess(data)) throw new Error(getApiError(data, copy.itemError));
        return data.item;
      });
      const [{ response, data }, savedItems] = await Promise.all([pageRequest, Promise.all(itemRequests)]);
      if (!response.ok || !isUpdateSuccess(data)) throw new Error(getApiError(data, copy.saveError));
      setPage(data.page);
      setForm(toFormState(data.page));
      const savedById = new Map(savedItems.map((item) => [item.id, item]));
      setItems((current) => current.map((item) => savedById.get(item.id) ?? item));
      return true;
    } catch (error) {
      setForm(previousForm);
      setItems(previousItems);
      setToast({ tone: "error", message: error instanceof Error ? error.message : copy.saveError });
      return false;
    } finally {
      setItemSaving(null);
    }
  };

  const toggleItemVisibility = async (item: CreatorLinkItem) => {
    if (itemSaving || (item.itemType !== "social" && item.itemType !== "link")) return;
    setItemSaving(item.id);
    try {
      const response = await fetch(`/api/creator/link/items/${item.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(item.itemType === "social"
            ? { platform: item.platform, url: item.url }
            : { title: item.title, url: item.url }),
          metadata: item.metadata,
          isVisible: !item.isVisible,
        }),
      });
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok || !isItemMutationSuccess(data)) throw new Error(getApiError(data, copy.itemError));
      setItems((current) => current.map((candidate) => candidate.id === data.item.id ? data.item : candidate));
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : copy.itemError });
    } finally {
      setItemSaving(null);
    }
  };

  const saveInquiryForms = async () => {
    if (!page || inquirySaving) return;
    setInquirySaving(true);
    try {
      const response = await fetch("/api/creator/link/inquiry-types", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: page.id,
          forms: (["simple", "pr"] as const).map((kind, sortOrder) => ({ kind, title: inquiryFormEditor[kind].title, isEnabled: inquiryFormEditor[kind].isEnabled, sortOrder })),
        }),
      });
      if (response.status === 401) { router.replace("/login"); return; }
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok || !isInquiryFormsUpdateSuccess(data)) throw new Error(getApiError(data, "フォーム設定を保存できませんでした。"));
      setInquiryTypes((current) => {
        const managedIds = new Set(data.inquiryTypes.map((item) => item.id));
        return [...current.filter((item) => !managedIds.has(item.id) && item.templateKey !== "pr_post" && item.templateKey !== null), ...data.inquiryTypes];
      });
      setInquiryFormEditor(toInquiryFormEditor(data.inquiryTypes));
      setForm((current) => current ? { ...current, isAcceptingInquiries: data.isAcceptingInquiries } : current);
      setPage((current) => current ? { ...current, isAcceptingInquiries: data.isAcceptingInquiries } : current);
      setToast({ tone: "success", message: "フォーム設定を保存しました" });
      setSheet(null);
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "フォーム設定を保存できませんでした。" });
    } finally { setInquirySaving(false); }
  };

  const reorderInquiryTypes = async (nextTypes: TrendreLinkCanvasInquiryType[]) => {
    if (!page || inquirySaving) return;
    const orderedKinds = nextTypes.map((type) => type.templateKey === "pr_post" ? "pr" as const : "simple" as const);
    if (orderedKinds.length !== 2 || new Set(orderedKinds).size !== 2) return;
    const previous = inquiryTypes;
    setInquiryTypes((current) => current.map((item) => { const kind = item.templateKey === "pr_post" ? "pr" : item.templateKey === null ? "simple" : null; return kind ? { ...item, sortOrder: orderedKinds.indexOf(kind) } : item; }));
    setInquirySaving(true);
    try {
      const response = await fetch("/api/creator/link/inquiry-types", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pageId: page.id, forms: orderedKinds.map((kind, sortOrder) => ({ kind, title: inquiryFormEditor[kind].title, isEnabled: inquiryFormEditor[kind].isEnabled, sortOrder })) }) });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok || !isInquiryFormsUpdateSuccess(data)) throw new Error(getApiError(data, "フォームの並び順を保存できませんでした。"));
      setInquiryTypes((current) => [...current.filter((item) => item.templateKey !== "pr_post" && item.templateKey !== null), ...data.inquiryTypes]);
    } catch (error) {
      setInquiryTypes(previous);
      setToast({ tone: "error", message: error instanceof Error ? error.message : "フォームの並び順を保存できませんでした。" });
    } finally { setInquirySaving(false); }
  };

  const reorderItems = async (canvasItems: TrendreLinkCanvasItem[]) => {
    if (!page || itemSaving) return;
    const previous = items;
    const visibleIds = canvasItems.map((item) => item.id).filter((id): id is string => Boolean(id));
    const reorderedVisible = visibleIds.map((id, index) => {
      const item = items.find((candidate) => candidate.id === id);
      return item ? { ...item, sortOrder: index } : null;
    }).filter((item): item is CreatorLinkItem => item !== null);
    const hidden = items.filter((item) => !visibleIds.includes(item.id));
    const next = [...reorderedVisible, ...hidden];
    setItems(next);
    setItemSaving("reorder");
    try {
      const response = await fetch("/api/creator/link/items/reorder", {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: page.id, items: reorderedVisible.map((item) => ({ id: item.id, sortOrder: item.sortOrder })) }),
      });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok || !isReorderSuccess(data)) throw new Error(getApiError(data, copy.reorderError));
      setItems([...data.items, ...hidden]);
    } catch (error) {
      setItems(previous);
      setToast({ tone: "error", message: error instanceof Error ? error.message : copy.reorderError });
    } finally {
      setItemSaving(null);
    }
  };

  const selectAvatarForCrop = (file: File) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type) || file.size <= 0 || file.size > 5 * 1024 * 1024) {
      setToast({
        tone: "error",
        message:
          locale === "ja"
            ? "JPEG、PNG、WebPの5MB以内の画像を選択してください。"
            : "Choose a JPEG, PNG, or WebP image up to 5 MB.",
      });
      return;
    }
    setAvatarCropFile(file);
  };

  const uploadImage = async (file: File, kind: "avatar" | "background"): Promise<boolean> => {
    if (uploadingImage) return false;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    const limit = kind === "avatar" ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    if (!allowed.includes(file.type) || file.size <= 0 || file.size > limit) {
      setToast({ tone: "error", message: kind === "avatar" ? "JPEG、PNG、WebPの5MB以内の画像を選択してください。" : "JPEG、PNG、WebPの10MB以内の画像を選択してください。" });
      return false;
    }
    setUploadingImage(kind);
    try {
      const payload = new FormData();
      payload.append("file", file);
      payload.append("kind", kind);
      const response = await fetch("/api/creator/link/images", { method: "POST", credentials: "include", body: payload });
      if (response.status === 401) { router.replace("/login"); return false; }
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok || !isImageUploadSuccess(data)) throw new Error(getApiError(data, "画像を保存できませんでした。"));
      setForm((current) => current ? { ...current, [kind === "avatar" ? "avatarUrl" : "coverUrl"]: data.url } : current);
      setToast({ tone: "success", message: "画像をアップロードしました。変更を保存してください。" });
      return true;
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "画像を保存できませんでした。" });
      return false;
    } finally {
      setUploadingImage(null);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100"><div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-rose-500" /></div>;
  }
  if (!form || !page) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6"><p className="rounded-xl bg-white px-4 py-3 text-sm text-rose-600 shadow-sm">{toast?.message ?? copy.loadError}</p></div>;
  }

  const isDirty =
    form.displayName !== page.displayName ||
    form.displayNameColor !== page.displayNameColor ||
    form.bio !== (page.bio ?? "") ||
    form.slug !== page.slug ||
    form.themeKey !== page.themeKey ||
    form.accentColor !== page.accentColor ||
    form.buttonStyle !== page.buttonStyle ||
    form.fontStyle !== page.fontStyle ||
    form.avatarUrl !== page.avatarUrl ||
    form.coverUrl !== page.coverUrl ||
    form.isAcceptingInquiries !== page.isAcceptingInquiries;
  const publicUrl = `https://trendre.jp/in/${form.slug}`;
  const slugMessage = slugError ? copy.checkFailed : slugCheck === "checking" ? copy.checking : slugCheck === "available" ? copy.available : slugCheck === "unavailable" ? copy.unavailable : copy.invalid;
  const slugTone = !slugError && slugCheck === "available" ? "text-emerald-600" : slugCheck === "checking" ? "text-amber-600" : "text-rose-600";
  const canSave = !saving && !slugError && slugCheck === "available" && form.displayName.trim().length > 0 && form.displayName.length <= 80 && form.bio.length <= 500;
  const optimisticItems: TrendreLinkCanvasItem[] = items
    .filter((item) => item.isVisible)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => {
      if (sheet === "social" && item.itemType === "social" && item.platform && isCreatorLinkSocialPlatform(item.platform)) {
        const normalized = normalizeSocialProfile(item.platform, socialInputs[item.platform]);
        return { id: item.id, sortOrder: item.sortOrder, itemType: item.itemType, platform: item.platform, title: item.title, description: item.description, url: normalized.ok ? normalized.value.url : item.url, imageUrl: item.imageUrl, metadata: item.metadata };
      }
      if (sheet === "link" && item.itemType === "link" && item.id === linkEditor.id) {
        return { id: item.id, sortOrder: item.sortOrder, itemType: item.itemType, platform: item.platform, title: linkEditor.title || item.title, description: item.description, url: linkEditor.url || item.url, imageUrl: item.imageUrl, metadata: linkEditor.appearance };
      }
      return { id: item.id, sortOrder: item.sortOrder, itemType: item.itemType, platform: item.platform, title: item.title, description: item.description, url: item.url, imageUrl: item.imageUrl, metadata: sheet === "social-design" && item.platform && isCreatorLinkSocialPlatform(item.platform) ? socialAppearances[item.platform] : item.metadata };
    });
  if (sheet === "social") {
    for (const platform of CREATOR_LINK_SOCIAL_PLATFORMS) {
      if (optimisticItems.some((item) => item.itemType === "social" && item.platform === platform)) continue;
      const normalized = normalizeSocialProfile(platform, socialInputs[platform]);
      if (normalized.ok) optimisticItems.push({ itemType: "social", platform, title: null, description: null, url: normalized.value.url, imageUrl: null, metadata: socialAppearances[platform] });
    }
  }
  const draftLink = validateGeneralLink(linkEditor);
  if (sheet === "link" && !linkEditor.id && draftLink.ok) {
    optimisticItems.push({ itemType: "link", platform: null, title: linkEditor.title, description: null, url: draftLink.value.url, imageUrl: null, metadata: linkEditor.appearance });
  }
  const viewData: TrendreLinkCanvasData = {
    page: { slug: form.slug, displayName: form.displayName, displayNameColor: form.displayNameColor, bio: form.bio, avatarUrl: form.avatarUrl, coverUrl: form.coverUrl, themeKey: form.themeKey, accentColor: form.accentColor, buttonStyle: form.buttonStyle, fontStyle: form.fontStyle, isAcceptingInquiries: form.isAcceptingInquiries },
    items: optimisticItems,
    inquiryTypes: inquiryTypes.filter((item) => item.isEnabled).map((item) => ({ id: item.id, sortOrder: item.sortOrder, templateKey: item.templateKey, title: item.title, description: item.description, isCustom: item.isCustom })),
  };

  const copyPublicUrl = async () => {
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(publicUrl); copied = true; }
    } catch { copied = false; }
    if (!copied) {
      const textarea = document.createElement("textarea");
      textarea.value = publicUrl;
      textarea.readOnly = true;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.fontSize = "16px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try { copied = document.execCommand("copy"); } catch { copied = false; }
      textarea.remove();
    }
    if (copied) setToast({ tone: "success", message: copy.copied });
    else { publicUrlRef.current?.focus(); publicUrlRef.current?.select(); setToast({ tone: "error", message: locale === "ja" ? "URLを選択してください" : "Select the URL to copy" }); }
  };

  const sheetTitle = sheet === "links" ? (locale === "ja" ? "リンク" : "Links")
    : sheet === "preset" ? (locale === "ja" ? "スタイル" : "Style")
    : sheet === "theme" ? (locale === "ja" ? "デザイン" : "Design")
    : sheet === "wallpaper" ? (locale === "ja" ? "壁紙・背景" : "Wallpaper")
    : sheet === "text" ? (locale === "ja" ? "テキスト" : "Text")
    : sheet === "buttons" ? (locale === "ja" ? "ボタン" : "Buttons")
    : sheet === "colors" ? (locale === "ja" ? "カラー" : "Colors")
    : sheet === "profile" ? copy.urlSettings
    : sheet === "social" ? copy.socialTitle
    : sheet === "social-design" ? `${activeSocial === "instagram" ? "Instagram" : activeSocial === "tiktok" ? "TikTok" : activeSocial === "x" ? "X" : "YouTube"}${locale === "ja" ? "のデザイン" : " design"}`
    : sheet === "link" ? (linkEditor.id ? copy.editLinkTitle : copy.linkTitle)
    : (locale === "ja" ? "仕事の依頼・相談" : "Work inquiries");
  const sheetDescription = sheet === "profile" ? copy.urlHelp
    : sheet === "social" ? copy.socialHelp
    : sheet === "social-design" ? (locale === "ja" ? "形・見た目・カラーを選択します" : "Choose shape, surface and color")
    : sheet === "inquiry" ? (locale === "ja" ? "公開ページから受け付ける相談内容を設定します" : "Choose the inquiries shown on your public page")
    : undefined;
  const designCategories = [
    { key: "preset" as const, label: locale === "ja" ? "スタイル" : "Style", icon: Sparkles },
    { key: "theme" as const, label: "Theme", icon: Palette },
    { key: "profile" as const, label: "Header", icon: UserIcon },
    { key: "wallpaper" as const, label: "Wallpaper", icon: CameraIcon },
    { key: "text" as const, label: "Text", icon: MessageSquareText },
    { key: "buttons" as const, label: "Buttons", icon: Link2 },
    { key: "colors" as const, label: "Colors", icon: Palette },
  ];
  const isDesignSheet = sheet === "preset" || sheet === "theme" || sheet === "wallpaper" || sheet === "text" || sheet === "buttons" || sheet === "colors";
  const matchingPreset = findMatchingLinkDesignPreset({
    page: form,
    socials: items.filter((item) => item.itemType === "social"),
    links: items.filter((item) => item.itemType === "link"),
  });
  const selectedPresetId = matchingPreset?.id ?? null;
  const availablePresetCategories = getAvailableLinkDesignPresetCategories();
  const openPresetGallery = () => {
    setPresetCategory(matchingPreset?.category ?? "normal");
    setSheet("preset");
  };
  const editorNavigation = [
    { key: "links" as const, label: "Links", icon: Link2, action: () => setSheet("links") },
    { key: "preset" as const, label: "Design", icon: Sparkles, action: openPresetGallery },
    { key: "profile" as const, label: "Profile", icon: UserRound, action: () => setSheet("profile") },
    { key: "social" as const, label: "Social", icon: Share2, action: openSocialSheet },
    { key: "inquiry" as const, label: locale === "ja" ? "仕事相談" : "Work", icon: MessageSquareText, action: () => setSheet("inquiry") },
  ];

  return (
    <div className="h-[100dvh] min-h-0 overflow-hidden bg-[#f3f1ed] pb-[calc(68px+env(safe-area-inset-bottom))] text-slate-950">
      <style jsx global>{`
        .trendre-editor-preview { width: 286px; height: 555px; transition: width 320ms ease, height 320ms ease, transform 320ms ease; }
        .trendre-editor-preview > div { width: 480px; transform: scale(.5958333); }
        .trendre-editor-preview.is-editing { width: 196px; height: 350px; transform: translateY(-2px); }
        .trendre-editor-preview.is-editing > div { transform: scale(.4083333); }
        @keyframes trendre-sheet-in { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        .trendre-inline-editor-panel { animation: trendre-sheet-in 300ms ease both; }
        @media (max-width: 360px), (max-height: 720px) {
          .trendre-editor-preview { width: 238px; height: 430px; }
          .trendre-editor-preview > div { transform: scale(.4958333); }
          .trendre-editor-preview.is-editing { width: 146px; height: 246px; }
          .trendre-editor-preview.is-editing > div { transform: scale(.3041667); }
        }
        @media (max-height: 620px) {
          .trendre-editor-preview { width: 190px; height: 330px; }
          .trendre-editor-preview > div { transform: scale(.3958333); }
          .trendre-editor-preview.is-editing { width: 100px; height: 170px; }
          .trendre-editor-preview.is-editing > div { transform: scale(.2083333); }
        }
        @media (min-height: 900px) and (min-width: 390px) {
          .trendre-editor-preview { width: 310px; height: 604px; }
          .trendre-editor-preview > div { transform: scale(.6458333); }
          .trendre-editor-preview.is-editing { width: 212px; height: 400px; }
          .trendre-editor-preview.is-editing > div { transform: scale(.4416667); }
        }
        @media (prefers-reduced-motion: reduce) {
          .trendre-editor-preview, .trendre-editor-preview > div { transition: none !important; }
          .trendre-inline-editor-panel { animation: none !important; }
        }
      `}</style>
      <header className="relative z-50 border-b border-black/[0.055] bg-[#fffdfa]/95 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto grid h-[60px] max-w-3xl grid-cols-[48px_1fr_auto] items-center px-2">
          <Link href="/creator/dashboard" aria-label={copy.back} className="flex h-11 w-11 items-center justify-center rounded-full text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"><BackIcon /></Link>
          <h1 className="text-center text-[16px] font-semibold tracking-[-0.025em]">Link</h1>
          <div className="flex min-w-[92px] justify-end gap-0.5">
            <button type="button" onClick={() => void copyPublicUrl()} aria-label={copy.copyUrl} className="flex h-11 w-11 items-center justify-center rounded-full text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500"><Share2 className="h-[19px] w-[19px]" /></button>
            {isDirty ? <button type="button" disabled={!canSave} onClick={() => void save(form.status)} className="onboarding-press min-h-10 rounded-full bg-[#242326] px-4 text-[13px] font-semibold text-white disabled:opacity-35">{saving ? copy.saving : copy.saveChanges}</button> : <Link href={`/in/${form.slug}`} target="_blank" rel="noopener noreferrer" aria-label={copy.openPage} className="flex h-11 w-11 items-center justify-center rounded-full text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500"><ExternalLink className="h-[19px] w-[19px]" /></Link>}
          </div>
        </div>
      </header>

      {toast ? <div role="status" className={`fixed left-1/2 top-[calc(68px+env(safe-area-inset-top))] z-[120] max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-full px-4 py-2 text-center text-xs font-medium shadow-md ${toast.tone === "error" ? "bg-rose-600 text-white" : toast.tone === "success" ? "bg-[#29272a] text-white" : "bg-[#fffdfa] text-slate-700 ring-1 ring-slate-200"}`}>{toast.message}</div> : null}

      <main className={`relative mx-auto flex h-[calc(100%_-_60px_-_env(safe-area-inset-top))] min-h-0 w-full max-w-[720px] items-center justify-center overflow-hidden transition-[padding] duration-300 motion-reduce:transition-none ${sheet && !showFirstRun ? "pb-[min(48dvh,380px)]" : "pb-[74px]"}`}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-6 h-24 rounded-full bg-white/65 blur-3xl" />
        <div className={`trendre-editor-preview relative overflow-hidden rounded-[32px] border-[5px] border-[#242326] bg-[#242326] shadow-[0_22px_60px_rgba(34,31,38,.17)] ${sheet && !showFirstRun ? "is-editing" : ""}`} aria-label="公開ページのライブプレビュー">
          <div className="pointer-events-none origin-top-left transition-transform duration-300 motion-reduce:transition-none"><TrendreLinkCanvas data={viewData} mode="preview" locale={locale} /></div>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[27px] ring-1 ring-inset ring-white/20" />
        </div>
        {!sheet ? <div className="absolute bottom-[86px] left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm backdrop-blur"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Live Preview</div> : null}
        <input ref={publicUrlRef} readOnly value={publicUrl} className="sr-only" tabIndex={-1} aria-label={locale === "ja" ? "公開URL" : "Public URL"} />

        {!sheet ? <nav aria-label={locale === "ja" ? "Link編集" : "Link editor"} className="absolute inset-x-3 bottom-2 z-30 mx-auto max-w-[560px] rounded-[22px] bg-[#fffdfa]/94 p-1.5 shadow-[0_8px_30px_rgba(31,28,35,.10)] ring-1 ring-black/[0.055] backdrop-blur-xl">
          <div className="grid grid-cols-5 gap-0.5">
            {editorNavigation.map((item) => { const Icon = item.icon; return <button key={item.key} type="button" onClick={item.action} className="onboarding-press flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-[17px] px-0.5 text-[10px] font-semibold text-slate-500 outline-none hover:bg-black/[0.035] focus-visible:ring-4 focus-visible:ring-rose-200"><Icon className="h-[19px] w-[19px]" aria-hidden="true" /><span className="max-w-full truncate">{item.label}</span></button>; })}
          </div>
        </nav> : null}
      </main>

      {sheet ? (
        <div className={`${showFirstRun ? "" : "fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-[55] mx-auto h-[min(48dvh,380px)] max-w-[720px]"}`}>
        <EditorBottomSheet inline={!showFirstRun} title={sheetTitle} description={sheetDescription} closeLabel={copy.close} onClose={() => setSheet(null)}>

            {sheet === "links" ? <CreatorLinkItemsEditor items={items} busyItemId={itemSaving} onAdd={() => openLinkSheet()} onEdit={openLinkSheet} onToggle={(item) => void toggleItemVisibility(item)} onReorder={(nextItems) => void reorderItems(nextItems)} /> : null}

            {isDesignSheet ? <div role="tablist" aria-label="Design categories" className="sticky top-0 z-10 -mx-4 flex gap-1.5 overflow-x-auto border-b border-black/[0.05] bg-[#fffdfa]/96 px-4 py-2 [scrollbar-width:none]">
              {designCategories.map((category) => { const Icon = category.icon; const selected = sheet === category.key; return <button key={category.key} type="button" role="tab" aria-selected={selected} onClick={() => category.key === "preset" ? openPresetGallery() : setSheet(category.key)} className={`onboarding-press flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold outline-none focus-visible:ring-4 focus-visible:ring-rose-200 ${selected ? "bg-[#242326] text-white" : "bg-slate-100 text-slate-600"}`}><Icon className="h-4 w-4" aria-hidden="true" />{category.label}</button>; })}
            </div> : null}

            {sheet === "preset" ? <div className="mt-3 pb-3"><div role="tablist" aria-label={locale === "ja" ? "スタイルカテゴリ" : "Style categories"} className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">{availablePresetCategories.map((category) => <button key={category} type="button" role="tab" aria-selected={presetCategory === category} onClick={() => setPresetCategory(category)} className={`min-h-11 shrink-0 rounded-full px-4 text-xs font-semibold capitalize outline-none focus-visible:ring-4 focus-visible:ring-rose-200 ${presetCategory === category ? "bg-[#242326] text-white" : "bg-slate-100 text-slate-600"}`}>{category}</button>)}</div><StylePresetGallery data={viewData} selectedPresetId={selectedPresetId} category={presetCategory} onSelect={(preset) => void applyOnboardingPreset(preset)} /></div> : null}

            {sheet === "theme" ? (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {([
                  { key: "soft-ivory", name: "Classic", background: "linear-gradient(145deg,#fffaf0,#f4e7d4)", foreground: "#29272a" },
                  { key: "night-purple", name: "Hero", background: "linear-gradient(145deg,#14101d,#34234a)", foreground: "#fff" },
                  { key: "minimal-black", name: "Burst", background: "#18171b", foreground: "#fff" },
                ] as const).map((theme) => { const selected = form.themeKey === theme.key; return <button key={theme.key} type="button" aria-pressed={selected} onClick={() => setForm({ ...form, themeKey: theme.key })} className={`overflow-hidden rounded-xl border bg-white text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 ${selected ? "border-slate-950 ring-1 ring-slate-950" : "border-slate-200"}`}><div className="h-32 p-4" style={{ background: theme.background, color: theme.foreground }}><div className="mx-auto h-9 w-9 rounded-full border border-current/20 bg-current/10" /><div className="mx-auto mt-3 h-2 w-16 rounded-full bg-current opacity-30" /><div className="mt-4 h-8 rounded-lg border border-current/25" /></div><div className="flex h-11 items-center justify-between px-3 text-sm font-semibold"><span>{theme.name}</span>{selected ? <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-white"><CheckIcon /></span> : null}</div></button>; })}
              </div>
            ) : null}

            {sheet === "text" ? (
              <div className="mt-5 grid grid-cols-2 gap-3">
                {(["modern", "soft", "serif", "bold"] as CreatorLinkFontStyle[]).map((font) => <button key={font} type="button" aria-pressed={form.fontStyle === font} onClick={() => setForm({ ...form, fontStyle: font })} className={`flex min-h-28 flex-col items-start justify-between rounded-xl border bg-white p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 ${form.fontStyle === font ? "border-slate-950 ring-1 ring-slate-950" : "border-slate-200"}`}><span className={`text-2xl ${font === "serif" ? "font-serif" : font === "bold" ? "font-black" : font === "soft" ? "font-medium tracking-wide" : "font-semibold"}`}>Aa</span><span className="text-sm font-medium capitalize">{font}</span></button>)}
              </div>
            ) : null}

            {sheet === "buttons" ? (
              <div className="mt-5 space-y-3">
                {(["rounded", "pill", "square", "glass"] as CreatorLinkButtonStyle[]).map((style) => <button key={style} type="button" aria-pressed={form.buttonStyle === style} onClick={() => setForm({ ...form, buttonStyle: style })} className={`flex min-h-16 w-full items-center justify-between border px-5 text-left text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 ${style === "pill" ? "rounded-full" : style === "square" ? "rounded-none" : "rounded-xl"} ${style === "glass" ? "bg-white/50 backdrop-blur ring-1 ring-white/70" : "bg-white"} ${form.buttonStyle === style ? "border-slate-950" : "border-slate-200"}`}><span className="capitalize">{style}</span>{form.buttonStyle === style ? <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-white"><CheckIcon /></span> : null}</button>)}
                <p className="pt-2 text-xs leading-5 text-slate-500">{locale === "ja" ? "リンクごとの色やレイアウトは、Linksタブから各リンクを編集すると変更できます。" : "Edit an individual link from the Links tab to change its color and layout."}</p>
              </div>
            ) : null}

            {sheet === "colors" ? (
              <div className="mt-5 grid grid-cols-5 gap-x-3 gap-y-5">
                {["#ED5964", "#F97316", "#EAB308", "#22C55E", "#14B8A6", "#3B82F6", "#6366F1", "#A855F7", "#EC4899", "#29272A"].map((color) => <button key={color} type="button" aria-label={color} aria-pressed={form.accentColor === color} onClick={() => setForm({ ...form, accentColor: color })} className={`relative aspect-square min-h-11 rounded-full border-4 border-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 ${form.accentColor === color ? "ring-2 ring-slate-950 ring-offset-2" : "ring-1 ring-black/10"}`} style={{ backgroundColor: color }}>{form.accentColor === color ? <span className="absolute inset-0 flex items-center justify-center text-white"><CheckIcon /></span> : null}</button>)}
              </div>
            ) : null}

            {sheet === "wallpaper" ? (
              <div className="mt-5">
                <div className="mb-5 min-h-[104px] rounded-2xl bg-slate-50/75 p-3"><div className="flex items-center gap-3">{form.coverUrl ? <img src={form.coverUrl} alt="" className="h-20 w-24 rounded-xl object-cover" /> : <div className="flex h-20 w-24 items-center justify-center rounded-xl bg-slate-200 text-xs text-slate-400">Photo</div>}<div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-800">{locale === "ja" ? "背景写真" : "Background photo"}</p><p className="mt-0.5 text-xs text-slate-500">JPEG / PNG / WebP・10MBまで</p><div className="mt-2 flex flex-wrap gap-1"><label className="flex h-10 cursor-pointer items-center rounded-xl bg-[#29272a] px-3 text-xs font-medium text-white"><input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={Boolean(uploadingImage)} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file, "background"); event.currentTarget.value = ""; }} />{uploadingImage === "background" ? copy.saving : form.coverUrl ? (locale === "ja" ? "差し替え" : "Replace") : (locale === "ja" ? "写真を選択" : "Choose")}</label>{form.coverUrl ? <button type="button" onClick={() => setForm({ ...form, coverUrl: null })} className="h-10 px-2 text-xs text-slate-600">{locale === "ja" ? "テンプレート" : "Template"}</button> : null}</div></div></div></div>
                {(["solid", "gradient", "pattern", "texture", "metallic"] as const).map((group) => <div key={group} className="mt-5"><p className="mb-3 text-sm font-medium text-slate-700">{group === "solid" ? "Solid" : group === "gradient" ? "Gradient" : group === "pattern" ? "Pattern" : group === "texture" ? "Texture" : "Metallic"}</p><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{CREATOR_LINK_BACKGROUND_PRESETS.filter((preset) => preset.group === group).map((preset) => { const selected = form.accentColor === preset.accentColor && !form.coverUrl; return <button key={preset.name} type="button" aria-pressed={selected} onClick={() => setForm({ ...form, accentColor: preset.accentColor, coverUrl: null })} className={`relative overflow-hidden rounded-xl border bg-white text-left transition ${selected ? "border-slate-950 ring-1 ring-slate-950" : "border-slate-200/80"}`}><div style={{ background: preset.background, color: preset.foreground === "light" ? "#FAF9F7" : "#29272A" }} className="h-[116px] p-3"><div className="mx-auto mt-1 h-6 w-6 rounded-full border border-current/20 bg-white/20" /><div className="mx-auto mt-2.5 h-1.5 w-12 rounded bg-current opacity-25" /><div className="mt-3 h-5 rounded-lg border border-current/20 bg-white/20" /></div><div className="flex h-8 items-center justify-between px-3"><span className="truncate text-xs font-medium text-slate-800">{preset.name}</span>{selected ? <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-950 text-white"><CheckIcon /></span> : null}</div></button>; })}</div></div>)}
              </div>
            ) : null}

            {sheet === "profile" ? (
              <div className="mt-5 space-y-4">
                <div className="flex min-h-[104px] items-center gap-4 rounded-2xl bg-slate-50/75 p-4">
                  <label
                    aria-label={locale === "ja" ? "プロフィール写真を変更" : "Change profile photo"}
                    className="group flex cursor-pointer items-center gap-3"
                  >
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={Boolean(uploadingImage)}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) selectAvatarForCrop(file);
                        event.currentTarget.value = "";
                      }}
                    />
                    <span className="relative block h-[72px] w-[72px] shrink-0">
                      {form.avatarUrl ? (
                        <img src={form.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center rounded-full bg-slate-200 text-xl text-slate-500">
                          {form.displayName.trim().slice(0, 1) || "T"}
                        </span>
                      )}
                      <span className="absolute -bottom-1 -right-1 flex h-11 w-11 items-center justify-center rounded-full">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/80 bg-[#fffdfa]/95 text-slate-600 shadow-sm transition group-active:scale-95">
                          <CameraIcon />
                        </span>
                      </span>
                    </span>
                    {!form.avatarUrl ? (
                      <span className="text-sm font-medium text-slate-700">
                        {locale === "ja" ? "写真を追加" : "Add photo"}
                      </span>
                    ) : null}
                  </label>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">
                      {locale === "ja" ? "プロフィール写真" : "Profile photo"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">JPEG / PNG / WebP・5MBまで</p>
                    {form.avatarUrl ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(locale === "ja" ? "プロフィール写真を削除しますか？" : "Remove the profile photo?")) {
                            setForm({ ...form, avatarUrl: null });
                          }
                        }}
                        className="mt-2 min-h-11 px-1 text-xs font-medium text-slate-500 hover:text-slate-700"
                      >
                        {locale === "ja" ? "写真を削除" : "Remove photo"}
                      </button>
                    ) : null}
                  </div>
                </div>
                <label className="block text-sm font-medium text-slate-600">{copy.formName}<input value={form.displayName} maxLength={80} onChange={(event) => setForm({ ...form, displayName: event.target.value })} className="mt-1.5 h-12 w-full select-text rounded-xl border border-slate-200 bg-white/80 px-3 text-base outline-none focus:border-rose-400" /></label>
                <label className="block text-sm font-medium text-slate-600">{copy.bio}<textarea value={form.bio} maxLength={500} rows={4} onChange={(event) => setForm({ ...form, bio: event.target.value })} className="mt-1.5 h-32 w-full resize-none select-text rounded-xl border border-slate-200 bg-white/80 px-3 py-3 text-base outline-none focus:border-rose-400" /><span className="mt-1 block text-right text-xs text-slate-400">{form.bio.length}/500</span></label>
                <label className="block text-sm font-medium text-slate-600">slug<div className="mt-1.5 flex h-12 overflow-hidden rounded-xl border border-slate-200 bg-white/80 focus-within:border-rose-400"><span className="flex shrink-0 items-center border-r border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-500">trendre.jp/in/</span><input value={form.slug} maxLength={50} autoCapitalize="none" autoCorrect="off" spellCheck={false} onChange={(event) => { setForm({ ...form, slug: event.target.value }); setSlugError(null); }} className="min-w-0 flex-1 select-text bg-transparent px-3 text-base outline-none" /></div></label>
                <p className={`flex items-center gap-1.5 text-xs font-medium ${slugTone}`}>{!slugError && slugCheck === "available" ? <CheckIcon /> : null}{slugMessage}</p>
                <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-black/[0.06] bg-[#fffdfa]/95 px-4 pb-2 pt-3 backdrop-blur"><button type="button" onClick={() => setSheet(null)} className="min-h-11 flex-1 rounded-full bg-slate-100 px-4 text-sm font-semibold text-slate-700">{copy.done}</button><button type="button" disabled={!canSave || saving} onClick={() => void save(form.status === "published" ? "private" : "published")} className="min-h-11 flex-1 rounded-full bg-[#242326] px-4 text-sm font-semibold text-white disabled:opacity-35">{form.status === "published" ? copy.unpublish : copy.publish}</button></div>
              </div>
            ) : null}

            {sheet === "social" ? (
              <div className="pt-4">
                <div role="tablist" aria-label="SNS" className="flex items-center justify-center gap-2">
                  {CREATOR_LINK_SOCIAL_PLATFORMS.map((platform) => { const connected = items.some((item) => item.itemType === "social" && item.platform === platform); return <button key={platform} type="button" role="tab" aria-selected={activeSocial === platform} onClick={() => setActiveSocial(platform)} aria-label={platform === "x" ? "X" : platform} className={`onboarding-press relative flex h-12 w-12 items-center justify-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-rose-200 ${activeSocial === platform ? "bg-[#242326] text-white" : "bg-slate-100 text-slate-700"}`}><SocialBrandIcon platform={platform} className="h-5 w-5" />{connected ? <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#fffdfa] bg-emerald-500" /> : null}</button>; })}
                </div>
                {(() => { const existing = items.find((item) => item.itemType === "social" && item.platform === activeSocial); const label = activeSocial === "instagram" ? "Instagram" : activeSocial === "tiktok" ? "TikTok" : activeSocial === "x" ? "X" : "YouTube"; return <div className="mx-auto mt-5 max-w-lg"><div className="mb-2 flex items-center justify-between"><label htmlFor="social-editor-input" className="text-sm font-semibold text-slate-800">{label}</label>{existing ? <span className="text-xs font-medium text-emerald-600">公開中</span> : <span className="text-xs text-slate-400">未設定</span>}</div><div className="flex gap-2"><input id="social-editor-input" type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={socialInputs[activeSocial]} onChange={(event) => setSocialInputs({ ...socialInputs, [activeSocial]: event.target.value })} placeholder={activeSocial === "youtube" ? "@handle / youtube.com/..." : "@username / URL"} className="h-12 min-w-0 flex-1 select-text rounded-2xl border border-slate-200 bg-white px-3 text-base outline-none focus:border-slate-500 focus:ring-4 focus:ring-slate-100" /><button type="button" disabled={Boolean(itemSaving) || !socialInputs[activeSocial].trim()} onClick={() => void saveSocial(activeSocial)} className="onboarding-press h-12 min-w-[72px] shrink-0 rounded-2xl bg-[#242326] px-4 text-sm font-semibold text-white disabled:bg-slate-200 disabled:text-slate-400">{existing ? "更新" : "追加"}</button></div>{existing ? <div className="mt-2 flex items-center justify-between"><button type="button" onClick={() => setSheet("social-design")} className="min-h-11 px-2 text-xs font-semibold text-slate-600">{locale === "ja" ? "アイコンの見た目" : "Icon design"}</button><button type="button" disabled={Boolean(itemSaving)} onClick={() => void deleteItem(existing.id)} className="flex min-h-11 items-center gap-1 px-2 text-xs font-medium text-slate-400 hover:text-rose-600"><TrashIcon />{copy.deleteItem}</button></div> : null}</div>; })()}
              </div>
            ) : null}

            {sheet === "social-design" ? <div className="mt-5"><div className="flex items-center gap-3 rounded-2xl bg-slate-50/80 p-3"><SocialBrandIcon platform={activeSocial} brand className="h-7 w-7" /><div><p className="text-[15px] font-semibold text-slate-900">{activeSocial === "instagram" ? "Instagram" : activeSocial === "tiktok" ? "TikTok" : activeSocial === "x" ? "X" : "YouTube"}</p><p className="text-xs text-slate-500">{locale === "ja" ? "現在のカードプレビュー" : "Current card preview"}</p></div></div><CardDesignSelector value={socialAppearances[activeSocial]} onChange={(appearance) => setSocialAppearances({ ...socialAppearances, [activeSocial]: appearance })} locale={locale} /><div className="sticky bottom-0 -mx-4 mt-5 border-t border-slate-200 bg-[#fffdfa]/95 px-4 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-3"><button type="button" disabled={Boolean(itemSaving)} onClick={() => void saveSocial(activeSocial)} className="h-12 w-full rounded-xl bg-[#29272A] text-sm font-semibold text-white disabled:opacity-40">{itemSaving ? copy.saving : copy.saveItem}</button></div></div> : null}

            {sheet === "link" ? (
              <div className="mt-5 space-y-4">
                <label className="block text-sm font-medium text-slate-600">{copy.linkName}<input value={linkEditor.title} maxLength={80} onChange={(event) => setLinkEditor({ ...linkEditor, title: event.target.value })} className="mt-1.5 h-12 w-full select-text rounded-xl border border-slate-200 bg-white/80 px-3 text-base outline-none focus:border-rose-400" /></label>
                <label className="block text-sm font-medium text-slate-600">{copy.url}<input type="url" value={linkEditor.url} maxLength={500} inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} onChange={(event) => setLinkEditor({ ...linkEditor, url: event.target.value })} placeholder="https://" className="mt-1.5 h-12 w-full select-text rounded-xl border border-slate-200 bg-white/80 px-3 text-base outline-none focus:border-rose-400" /></label>
                <details open={Boolean(linkEditor.id)} className="rounded-xl border border-slate-200 bg-white/70 px-4 py-3">
                  <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500">{locale === "ja" ? "詳細デザイン" : "Advanced design"}</summary>
                  <CardDesignSelector value={linkEditor.appearance} onChange={(appearance) => setLinkEditor({ ...linkEditor, appearance })} locale={locale} />
                </details>
                <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-slate-200/70 bg-[#fffdfa]/95 px-4 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">{linkEditor.id ? <button type="button" disabled={Boolean(itemSaving)} onClick={() => void deleteItem(linkEditor.id!)} aria-label={copy.deleteItem} className="flex min-h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:text-rose-600 disabled:opacity-40"><TrashIcon /></button> : null}<button type="button" disabled={Boolean(itemSaving)} onClick={() => void saveLink()} className="min-h-11 flex-1 rounded-xl bg-[#29272a] text-sm font-medium text-white transition enabled:hover:bg-[#ed5964] disabled:opacity-40">{itemSaving ? copy.saving : copy.saveItem}</button></div>
              </div>
            ) : null}

            {sheet === "inquiry" ? (
              <div className="mt-5 space-y-3">{(["simple", "pr"] as const).map((kind) => { const values = inquiryFormEditor[kind]; const defaults = INQUIRY_FORM_DEFAULTS[kind]; return <article key={kind} className="rounded-2xl border border-slate-200/80 bg-white/70 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-base font-semibold text-slate-900">{kind === "simple" ? "シンプル問い合わせ" : "PR案件依頼"}</p><p className="mt-1 text-[13px] leading-5 text-slate-500">{defaults.description}</p></div><button type="button" role="switch" aria-checked={values.isEnabled} aria-label={`${kind === "simple" ? "シンプル問い合わせ" : "PR案件依頼"} ${values.isEnabled ? "ON" : "OFF"}`} onClick={() => setInquiryFormEditor({ ...inquiryFormEditor, [kind]: { ...values, isEnabled: !values.isEnabled } })} className={`relative h-6 w-11 shrink-0 rounded-full transition ${values.isEnabled ? "bg-emerald-500" : "bg-slate-300"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${values.isEnabled ? "left-[22px]" : "left-0.5"}`} /></button></div><label className="mt-3 block text-sm font-medium text-slate-600">{locale === "ja" ? "公開ページでのタイトル" : "Public title"}<input value={values.title} maxLength={80} onChange={(event) => setInquiryFormEditor({ ...inquiryFormEditor, [kind]: { ...values, title: event.target.value } })} className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 px-3 text-base outline-none focus:border-rose-400" /></label><button type="button" onClick={() => setPreviewInquiry({ kind, title: values.title.trim() || defaults.title })} className="mt-3 h-10 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-600">{locale === "ja" ? "プレビュー" : "Preview"}</button></article>; })}<button type="button" disabled={inquirySaving || !inquiryFormEditor.simple.title.trim() || !inquiryFormEditor.pr.title.trim()} onClick={() => void saveInquiryForms()} className="h-12 w-full rounded-xl bg-[#29272A] text-sm font-semibold text-white disabled:opacity-40">{inquirySaving ? copy.saving : copy.saveItem}</button></div>
            ) : null}
        </EditorBottomSheet>
        </div>
      ) : null}

      {showFirstRun ? <div className="fixed inset-0 z-[60] overflow-hidden bg-[#141414]"><CreatorLinkOnboarding step={onboardingStep} form={form as OnboardingLinkForm} previewData={viewData} slugState={slugCheck} slugMessage={slugMessage} slugError={slugError} uploadingImage={uploadingImage === "avatar"} completing={saving} completionReady={onboardingCompletionReady} publicUrl={publicUrl} socialInputs={socialInputs} savedSocials={items.filter((item) => item.itemType === "social" && item.platform && isCreatorLinkSocialPlatform(item.platform)).map((item) => item.platform as CreatorLinkSocialPlatform)} socialSaving={Boolean(itemSaving)} onStepChange={setOnboardingStep} onChange={(updates) => setForm({ ...form, ...updates })} onSelectAvatar={selectAvatarForCrop} onSocialChange={(platform, value) => setSocialInputs((current) => ({ ...current, [platform]: value }))} onSaveSocial={saveSocial} onAddLink={() => openLinkSheet()} onApplyPreset={applyOnboardingPreset} onComplete={async () => { const saved = await save("published"); if (saved) setOnboardingCompletionReady(true); return saved; }} onCopyPublicUrl={() => void copyPublicUrl()} onFinish={() => { setShowFirstRun(false); setSheet(null); }} /></div> : null}
      {previewInquiry ? <InquiryFormModal key={`${previewInquiry.kind}-${previewInquiry.title}`} formId={null} kind={previewInquiry.kind} title={previewInquiry.title} slug={form.slug} mode="preview" locale={locale} onClose={() => setPreviewInquiry(null)} /> : null}
      {avatarCropFile ? <ProfileImageCropModal file={avatarCropFile} locale={locale} onCancel={() => setAvatarCropFile(null)} onConfirm={async (croppedFile) => { const uploaded = await uploadImage(croppedFile, "avatar"); if (uploaded) setAvatarCropFile(null); return uploaded; }} /> : null}
    </div>
  );
}
