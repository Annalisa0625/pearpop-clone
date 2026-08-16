"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, ChevronRight, Copy, ExternalLink, Link2, MessageSquareText, Share2, Sparkles, UserRound } from "lucide-react";
import TrendreLinkCanvas, {
  type TrendreLinkCanvasData,
  type TrendreLinkEditableField,
  type TrendreLinkCanvasItem,
} from "@/components/trendre-link/TrendreLinkCanvas";
import StylePresetGallery from "@/components/trendre-link/StylePresetGallery";
import SocialBrandIcon from "@/components/trendre-link/SocialBrandIcon";
import ServiceIcon from "@/components/trendre-link/ServiceIcon";
import InquiryFormModal from "@/components/trendre-link/InquiryFormModal";
import CardDesignSelector from "./_components/CardDesignSelector";
import EditorBottomSheet from "./_components/EditorBottomSheet";
import ProfileImageCropModal from "./_components/ProfileImageCropModal";
import CreatorLinkOnboarding, { type OnboardingLinkForm } from "./_components/CreatorLinkOnboarding";
import CreatorLinkItemsEditor from "./_components/CreatorLinkItemsEditor";
import CreatorLinkSocialOrderEditor from "./_components/CreatorLinkSocialOrderEditor";
import { applyLinkDesignPreset, findLinkDesignPresetByPageAppearance, findMatchingLinkDesignBackgroundPreset, findMatchingLinkDesignPreset, getAvailableLinkDesignPresetCategories, type LinkDesignPresetCategory } from "@/lib/trendre-link/link-design-presets";
import { createCreatorLinkBackgroundReference, withCreatorLinkBackground } from "@/lib/trendre-link/background-selection";
import type { CreatorLinkOnboardingPreset } from "@/lib/trendre-link/onboarding-presets";
import { useAppLocale } from "@/lib/i18n/locale";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
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
  DEFAULT_CREATOR_LINK_ITEM_APPEARANCE,
  normalizeCreatorLinkItemAppearance,
  CREATOR_LINK_SOCIAL_STYLES,
  CREATOR_LINK_SOCIAL_SURFACES,
  CREATOR_LINK_SOCIAL_SHAPES,
  type CreatorLinkItemAppearance,
  type CreatorLinkSocialPlatform,
  type CreatorLinkSocialStyle,
  type CreatorLinkSocialSurface,
  type CreatorLinkSocialShape,
} from "@/lib/trendre-link/item-validation";
import {
  CREATOR_LINK_STANDARD_SERVICES,
  extractCreatorLinkServiceEditableValue,
  getCreatorLinkService,
  getCreatorLinkServiceKeyFromMetadata,
  normalizeCreatorLinkServiceInput,
  validateCreatorLinkServiceLink,
  type CreatorLinkServiceKey,
} from "@/lib/trendre-link/service-registry";
import { INQUIRY_FORM_DEFAULTS, type CreatorLinkInquiryFormKind } from "@/lib/trendre-link/inquiry-forms";
import { CREATOR_LINK_ADD_ACTIONS, getCreatorLinkEditorCtaCopy, getCreatorLinkSocialColorControls, resolveCreatorLinkPreviewEditTarget, type CreatorLinkSocialColorControl } from "@/lib/trendre-link/editor-controls";
import { setCreatorLinkWorkEnabled } from "@/lib/trendre-link/work-settings";
import { normalizeCreatorLinkLayoutOrder, parseCreatorLinkLayoutToken, type CreatorLinkLayoutToken } from "@/lib/trendre-link/layout-order";
import { areCreatorLinkEditorDraftsEqual, canLeaveCreatorLinkEditor, createCreatorLinkTemporaryItemId, reorderCreatorLinkDraftItems, replaceCreatorLinkDraftLayoutItemId, type CreatorLinkEditorDraft, type CreatorLinkUnsavedDecision } from "@/lib/trendre-link/editor-draft";
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
type Sheet = "links" | "add" | "service" | "profile" | "preset" | "social" | "link" | "inquiry" | null;
type Toast = { tone: "success" | "error" | "info"; message: string } | null;
type SocialInputs = Record<CreatorLinkSocialPlatform, string>;
type SocialAppearances = Record<CreatorLinkSocialPlatform, CreatorLinkItemAppearance>;
type LinkEditorState = { id: string | null; title: string; url: string; serviceKey: CreatorLinkServiceKey; appearance: CreatorLinkItemAppearance };
type InquiryFormEditor = Record<CreatorLinkInquiryFormKind, { title: string; isEnabled: boolean }>;
type EditorDraft = CreatorLinkEditorDraft<LinkFormState, CreatorLinkItem, InquiryFormEditor>;

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
    && (value.layoutOrder === null || (Array.isArray(value.layoutOrder) && value.layoutOrder.every((token) => parseCreatorLinkLayoutToken(token) !== null)))
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

const EMPTY_SOCIAL_INPUTS = Object.fromEntries(CREATOR_LINK_SOCIAL_PLATFORMS.map((platform) => [platform, ""])) as SocialInputs;
const EMPTY_LINK_EDITOR: LinkEditorState = { id: null, title: "", url: "", serviceKey: "custom", appearance: DEFAULT_CREATOR_LINK_ITEM_APPEARANCE };
const EMPTY_SOCIAL_APPEARANCES = Object.fromEntries(CREATOR_LINK_SOCIAL_PLATFORMS.map((platform) => [platform, DEFAULT_CREATOR_LINK_ITEM_APPEARANCE])) as SocialAppearances;
const SOCIAL_ICON_COLOR_PALETTE = ["#111111", "#FFFFFF", "#ED5964", "#F97316", "#22C55E", "#14B8A6", "#3B82F6", "#8B5CF6", "#EC4899"] as const;

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

function CheckIcon() {
  return <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true"><path d="m5 12.5 4.2 4.2L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function TrashIcon() {
  return <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" aria-hidden="true"><path d="M5 7h14M9 7V4h6v3m2 0-1 13H8L7 7m3 4v5m4-5v5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function SocialIconColorControl({ platform, value, designColor, onChange, locale }: { platform: CreatorLinkSocialPlatform; value: string | null | undefined; designColor: string | null; onChange: (value: string | null) => void; locale: "ja" | "en" }) {
  const design = designColor !== null && value === designColor;
  const brand = value === null;
  const custom = typeof value === "string" && !design;
  const customColor = custom ? value : designColor ?? "#29272A";
  return <fieldset className="mt-5 border-t border-slate-200/70 pt-5">
    <legend className="text-sm font-medium text-slate-700">Icon Color</legend>
    <div className="mt-2 grid grid-cols-3 gap-2">
      <button type="button" aria-pressed={design} onClick={() => onChange(designColor)} className={`flex min-h-12 items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold ${design ? "border-rose-300 bg-rose-50/55 text-rose-700" : "border-slate-200 bg-white text-slate-600"}`}><span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: designColor ?? "transparent" }} />Design</button>
      <button type="button" aria-pressed={brand} onClick={() => onChange(null)} className={`flex min-h-12 items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold ${brand ? "border-rose-300 bg-rose-50/55 text-rose-700" : "border-slate-200 bg-white text-slate-600"}`}><SocialBrandIcon platform={platform} brand className="h-4 w-4" />Brand</button>
      <button type="button" aria-pressed={custom} onClick={() => onChange(customColor)} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border text-sm font-semibold ${custom ? "border-rose-300 bg-rose-50/55 text-rose-700" : "border-slate-200 bg-white text-slate-600"}`}><span className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: customColor }} />Custom</button>
    </div>
    {custom ? <div className="mt-4 rounded-2xl bg-slate-50/80 p-3">
      <div className="flex items-center gap-3"><label className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-white shadow ring-1 ring-black/10" style={{ backgroundColor: customColor }}><span className="sr-only">{locale === "ja" ? "カスタムカラー" : "Custom color"}</span><input type="color" value={customColor} onChange={(event) => onChange(event.target.value.toUpperCase())} className="absolute inset-[-8px] h-16 w-16 cursor-pointer opacity-0" /></label><div><p className="text-sm font-semibold text-slate-800">{customColor}</p><p className="text-xs text-slate-500">{locale === "ja" ? "色をタップして調整" : "Tap the color to adjust"}</p></div></div>
      <div className="mt-3 flex flex-wrap gap-2">{SOCIAL_ICON_COLOR_PALETTE.map((color) => <button key={color} type="button" aria-label={color} aria-pressed={customColor === color} onClick={() => onChange(color)} className={`h-10 w-10 rounded-full border border-black/10 ${customColor === color ? "ring-2 ring-rose-400 ring-offset-2" : ""}`} style={{ backgroundColor: color }} />)}</div>
    </div> : null}
  </fieldset>;
}

function SocialStyleControl({ value, onChange }: { value: CreatorLinkSocialStyle; onChange: (value: CreatorLinkSocialStyle) => void }) {
  const styles = CREATOR_LINK_SOCIAL_STYLES.filter((style) => style !== "glass");
  return <fieldset className="mt-5"><legend className="text-sm font-semibold text-slate-900">Appearance</legend><div className="mt-2 grid grid-cols-3 gap-2">{styles.map((style) => <button key={style} type="button" aria-pressed={value === style} onClick={() => onChange(style)} className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border px-2 text-xs font-semibold capitalize ${value === style ? "border-rose-300 bg-rose-50/55 text-rose-700 ring-1 ring-rose-200" : "border-slate-200 bg-white text-slate-600"}`}><span className={`${style === "pill" ? "h-7 w-12 rounded-full" : "h-8 w-8 rounded-full"} ${style === "icons" ? "bg-transparent ring-1 ring-slate-300" : "bg-slate-200"}`} /><span>{style}</span></button>)}</div></fieldset>;
}

function SocialSurfaceControl({ value, color, onChange, onColorChange }: { value: CreatorLinkSocialSurface; color: string; onChange: (value: CreatorLinkSocialSurface) => void; onColorChange: (value: string | undefined) => void }) {
  return <fieldset className="mt-5 border-t border-slate-200/70 pt-5"><legend className="text-sm font-semibold text-slate-900">Background / Surface</legend><div className="mt-2 grid grid-cols-3 gap-2">{CREATOR_LINK_SOCIAL_SURFACES.map((surface) => <button key={surface} type="button" aria-pressed={value === surface} onClick={() => onChange(surface)} className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border px-2 text-xs font-semibold capitalize ${value === surface ? "border-rose-300 bg-rose-50/55 text-rose-700 ring-1 ring-rose-200" : "border-slate-200 bg-white text-slate-600"}`}><span className={`h-9 w-9 rounded-full border ${surface === "none" ? "border-dashed border-slate-300 bg-transparent" : surface === "glass" ? "border-white/70 bg-slate-200/45 shadow-sm backdrop-blur" : "border-transparent"}`} style={surface === "solid" ? { backgroundColor: color } : undefined} /><span>{surface}</span></button>)}</div>{value === "solid" ? <div className="mt-3 flex items-center justify-between rounded-2xl bg-slate-50 p-3"><div><p className="text-sm font-semibold text-slate-800">Surface Color</p><p className="text-xs text-slate-500">Design or custom color</p></div><label className="relative h-11 w-11 overflow-hidden rounded-full border-2 border-white shadow ring-1 ring-black/10" style={{ backgroundColor: color }}><span className="sr-only">Surface color</span><input type="color" value={color} onChange={(event) => onColorChange(event.target.value.toUpperCase())} className="absolute inset-[-8px] h-16 w-16 cursor-pointer opacity-0" /></label></div> : null}</fieldset>;
}

function SocialShapeControl({ value, onChange }: { value: CreatorLinkSocialShape; onChange: (value: CreatorLinkSocialShape) => void }) {
  return <fieldset className="mt-5"><legend className="text-sm font-semibold text-slate-900">Shape</legend><div className="mt-2 grid grid-cols-3 gap-2">{CREATOR_LINK_SOCIAL_SHAPES.map((shape) => <button key={shape} type="button" aria-pressed={value === shape} onClick={() => onChange(shape)} className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border px-2 text-xs font-semibold capitalize ${value === shape ? "border-rose-300 bg-rose-50/55 text-rose-700 ring-1 ring-rose-200" : "border-slate-200 bg-white text-slate-600"}`}><span className={`flex items-center justify-center ${shape === "pill" ? "h-8 w-14 rounded-full" : "h-9 w-9 rounded-full"} ${shape === "icons" ? "bg-transparent" : "border border-slate-300 bg-slate-100"}`}><span className="h-3.5 w-3.5 rounded-full bg-slate-500" /></span><span>{shape}</span></button>)}</div></fieldset>;
}

function SocialColorRows({ shape, appearance, activeTarget, presetColors, onToggle, onSelect }: { shape: CreatorLinkSocialShape; appearance: CreatorLinkItemAppearance; activeTarget: CreatorLinkSocialColorControl | null; presetColors: Partial<Record<CreatorLinkSocialColorControl, string | null>>; onToggle: (target: CreatorLinkSocialColorControl) => void; onSelect: (target: CreatorLinkSocialColorControl, value: string | null) => void }) {
  const labels: Record<CreatorLinkSocialColorControl, string> = { icon: "Icon color", surface: "Background color", border: "Border color" };
  const values = { icon: appearance.iconColor, surface: appearance.surfaceColor, border: appearance.borderColor };
  return <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">{getCreatorLinkSocialColorControls(shape).map((target, index) => { const value = values[target]; return <div key={target} className={index ? "border-t border-slate-100" : ""}><button type="button" aria-expanded={activeTarget === target} onClick={() => onToggle(target)} className="flex min-h-14 w-full items-center justify-between px-4 text-left text-sm font-medium text-slate-700"><span>{labels[target]}</span><span className="flex items-center gap-2"><span className="text-xs text-slate-400">{value ?? (target === "icon" ? "Brand" : "Transparent")}</span><span className={`h-8 w-8 rounded-full border border-black/10 ${value === null || value === undefined ? "bg-[linear-gradient(135deg,#e2e8f0_25%,transparent_25%,transparent_50%,#e2e8f0_50%,#e2e8f0_75%,transparent_75%)] bg-[length:10px_10px]" : ""}`} style={typeof value === "string" ? { backgroundColor: value } : undefined} /></span></button>{activeTarget === target ? <div className="border-t border-slate-100 px-3 pb-3"><SocialColorPicker target={target} value={value} presetColor={presetColors[target] ?? null} onSelect={(next) => onSelect(target, next)} onClose={() => onToggle(target)} /></div> : null}</div>; })}</div>;
}

function SocialColorPicker({ target, value, presetColor, onSelect, onClose }: { target: CreatorLinkSocialColorControl; value: string | null | undefined; presetColor: string | null; onSelect: (value: string | null) => void; onClose: () => void }) {
  const palette = [...new Set(["#111111", "#FFFFFF", ...(presetColor ? [presetColor] : []), ...SOCIAL_ICON_COLOR_PALETTE])];
  const fallback = typeof value === "string" ? value : presetColor ?? "#29272A";
  const title = target === "icon" ? "Icon color" : target === "surface" ? "Background color" : "Border color";
  return <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-900">{title}</h3><button type="button" onClick={onClose} className="min-h-10 px-2 text-xs font-semibold text-slate-500">Done</button></div><div className="mt-3 flex flex-wrap gap-2">{target === "icon" ? <button type="button" onClick={() => { onSelect(null); onClose(); }} className="flex h-10 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600">Brand</button> : <button type="button" onClick={() => { onSelect(null); onClose(); }} className="flex h-10 items-center rounded-full border border-dashed border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600">Transparent</button>}{palette.map((color) => <button key={color} type="button" aria-label={color} aria-pressed={value === color} onClick={() => { onSelect(color); onClose(); }} className={`h-10 w-10 rounded-full border border-black/10 ${value === color ? "ring-2 ring-rose-400 ring-offset-2" : ""}`} style={{ backgroundColor: color }} />)}<label className="relative flex h-10 min-w-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-white shadow ring-1 ring-black/10" style={{ backgroundColor: fallback }}><span className="px-3 text-[10px] font-bold mix-blend-difference text-white">MORE</span><input type="color" value={fallback} onChange={(event) => { onSelect(event.target.value.toUpperCase()); onClose(); }} className="absolute inset-[-8px] h-16 w-20 cursor-pointer opacity-0" /></label></div></div>;
}

function currentLinkAppearance(form: LinkFormState, items: CreatorLinkItem[]): CreatorLinkItemAppearance {
  const existing = items.find((item) => item.itemType === "link");
  if (existing) return normalizeCreatorLinkItemAppearance(existing.metadata);
  const preset = findLinkDesignPresetByPageAppearance(form);
  return preset ? { ...preset.linkAppearance } : { ...DEFAULT_CREATOR_LINK_ITEM_APPEARANCE };
}

function currentSocialAppearance(form: LinkFormState, items: CreatorLinkItem[]): CreatorLinkItemAppearance {
  const existing = items.find((item) => item.itemType === "social");
  if (existing) return normalizeCreatorLinkItemAppearance(existing.metadata);
  const preset = findLinkDesignPresetByPageAppearance(form);
  return { ...DEFAULT_CREATOR_LINK_ITEM_APPEARANCE, iconColor: preset?.socialIconColor, socialStyle: preset?.socialStyle ?? "icons", socialShape: preset?.socialShape, surfaceColor: preset?.socialSurfaceColor, borderColor: preset?.socialBorderColor };
}

function WorkEditor({ value, busy, locale, onChange, onPreview, onSave }: { value: InquiryFormEditor; busy: boolean; locale: "ja" | "en"; onChange: (value: InquiryFormEditor) => void; onPreview: (kind: CreatorLinkInquiryFormKind) => void; onSave: () => void }) {
  const active = value.simple.isEnabled || value.pr.isEnabled;
  const toggleMaster = () => onChange(setCreatorLinkWorkEnabled(value, !active));
  return <div className="mt-5 space-y-4"><button type="button" aria-pressed={active} onClick={toggleMaster} className={`onboarding-press flex min-h-28 w-full items-center gap-4 rounded-2xl border p-4 text-left ${active ? "border-rose-300 bg-rose-50/70 text-rose-950 shadow-sm" : "border-slate-200 bg-white text-slate-600"}`}><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${active ? "bg-rose-500 text-white" : "bg-slate-100"}`}><MessageSquareText className="h-6 w-6" /></span><span className="min-w-0 flex-1"><strong className="block text-base">{locale === "ja" ? "仕事の依頼を受け付ける" : "Accept work inquiries"}</strong><span className="mt-1 block text-xs opacity-70">{locale === "ja" ? "PR・案件相談をLinkから受付" : "Receive PR and project requests from your Link"}</span></span><span className="text-sm font-bold">{active ? (locale === "ja" ? "受付中" : "Active") : (locale === "ja" ? "停止中" : "Paused")}</span></button><div className="grid grid-cols-2 gap-3">{(["pr", "simple"] as const).map((kind) => { const selected = value[kind].isEnabled; const label = kind === "pr" ? (locale === "ja" ? "PR投稿" : "PR Post") : (locale === "ja" ? "その他の相談" : "Other"); return <article key={kind} className={`rounded-2xl border p-3 transition ${selected ? "border-rose-300 bg-rose-50/60 shadow-sm" : "border-slate-200 bg-white"}`}><button type="button" aria-pressed={selected} onClick={() => onChange({ ...value, [kind]: { ...value[kind], isEnabled: !selected } })} className="flex min-h-16 w-full flex-col items-start justify-between text-left"><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${selected ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-500"}`}><BriefcaseBusiness className="h-4 w-4" /></span><strong className="mt-3 text-sm text-slate-900">{label}</strong><span className={`mt-1 text-xs font-semibold ${selected ? "text-rose-600" : "text-slate-400"}`}>{selected ? (locale === "ja" ? "受付中" : "Active") : (locale === "ja" ? "停止中" : "Paused")}</span></button><label className="mt-3 block text-xs font-medium text-slate-500">{locale === "ja" ? "公開タイトル" : "Public title"}<input value={value[kind].title} maxLength={80} onChange={(event) => onChange({ ...value, [kind]: { ...value[kind], title: event.target.value } })} className="mt-1 h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-2 text-sm text-slate-800 outline-none focus:border-rose-400" /></label><button type="button" onClick={() => onPreview(kind)} className="mt-2 min-h-10 w-full rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">{locale === "ja" ? "フォーム確認" : "Preview form"}</button></article>; })}</div><button type="button" disabled={busy || !value.simple.title.trim() || !value.pr.title.trim()} onClick={onSave} className="min-h-12 w-full rounded-xl bg-[#29272A] text-sm font-semibold text-white disabled:opacity-40">{busy ? (locale === "ja" ? "保存中…" : "Saving…") : getCreatorLinkEditorCtaCopy(locale, "save")}</button></div>;
}

function WorkEditorV2({ value, locale, onChange, onPreview }: { value: InquiryFormEditor; locale: "ja" | "en"; onChange: (value: InquiryFormEditor) => void; onPreview: (kind: CreatorLinkInquiryFormKind) => void }) {
  const active = value.simple.isEnabled;
  const copy = locale === "ja" ? { master: "仕事の相談を受け付ける", active: "受付中", paused: "停止中", title: "公開タイトル", preview: "フォームを確認", help: "相談の送信だけでは契約・発注は成立しません。" } : { master: "Accept work inquiries", active: "Active", paused: "Paused", title: "Public title", preview: "Preview form", help: "Sending an inquiry does not create a contract or order." };
  return <div className="mt-4 space-y-3"><button type="button" aria-pressed={active} onClick={() => onChange({ ...value, simple: { ...value.simple, isEnabled: !active }, pr: { ...value.pr, isEnabled: false } })} className={`onboarding-press flex min-h-24 w-full items-center gap-4 rounded-2xl border p-4 text-left ${active ? "border-rose-300 bg-rose-50/70 text-rose-950" : "border-slate-200 bg-white text-slate-600"}`}><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${active ? "bg-rose-500 text-white" : "bg-slate-100"}`}><MessageSquareText className="h-5 w-5" /></span><span className="min-w-0 flex-1"><strong className="block text-[15px]">{copy.master}</strong><span className={`mt-1 block text-xs font-semibold ${active ? "text-emerald-600" : "text-slate-400"}`}>{active ? copy.active : copy.paused}</span></span></button><article className="rounded-2xl border border-slate-200 bg-white p-4"><label className="block text-sm font-medium text-slate-600">{copy.title}<input value={value.simple.title} maxLength={80} onChange={(event) => onChange({ ...value, simple: { ...value.simple, title: event.target.value }, pr: { ...value.pr, isEnabled: false } })} className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none focus:border-rose-400" /></label><button type="button" onClick={() => onPreview("simple")} className="mt-3 min-h-11 w-full rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">{copy.preview}</button><p className="mt-3 text-xs leading-5 text-slate-500">{copy.help}</p></article></div>;
}

export default function CreatorLinkBuilderPage() {
  const router = useRouter();
  const routerRef = useRef(router);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale } = useAppLocale();
  const [page, setPage] = useState<CreatorLinkPage | null>(null);
  const [form, setForm] = useState<LinkFormState | null>(null);
  const [items, setItems] = useState<CreatorLinkItem[]>([]);
  const [draftLayoutOrder, setDraftLayoutOrder] = useState<CreatorLinkLayoutToken[] | null>(null);
  const [inquiryTypes, setInquiryTypes] = useState<CreatorLinkInquiryType[]>([]);
  const [inquiryFormEditor, setInquiryFormEditor] = useState<InquiryFormEditor>(EMPTY_INQUIRY_FORMS);
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
  const [socialColorTarget, setSocialColorTarget] = useState<CreatorLinkSocialColorControl | null>(null);
  const [linkEditor, setLinkEditor] = useState<LinkEditorState>(EMPTY_LINK_EDITOR);
  const [uploadingImage, setUploadingImage] = useState<"avatar" | "background" | null>(null);
  const [avatarCropFile, setAvatarCropFile] = useState<File | null>(null);
  const [showFirstRun, setShowFirstRun] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingCompletionReady, setOnboardingCompletionReady] = useState(false);
  const [persistedDraft, setPersistedDraft] = useState<EditorDraft | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const firstRunHandledRef = useRef(false);
  const publicUrlRef = useRef<HTMLInputElement>(null);
  const knownPersistedItemIdsRef = useRef(new Set<string>());
  const deletedPersistedItemIdsRef = useRef(new Set<string>());

  const privateFetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("セッション情報を確認できませんでした。もう一度ログインしてください。");
    }

    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${session.access_token}`);
    return fetch(input, { ...init, credentials: "include", headers });
  };

  const copy = useMemo(() => locale === "ja" ? {
    edit: "編集", preview: "プレビュー", draft: "下書き", published: "公開中", private: "非公開",
    back: "戻る", accountProfile: "アカウントプロフィール",
    copyUrl: "リンクをコピー", copied: "リンクをコピーしました", copyFailed: "リンクをコピーできませんでした", openPage: "公開ページを開く", profile: "名前", theme: "背景", link: "リンク", sns: "SNS", inquiry: "フォーム",
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
    copyUrl: "Copy link", copied: "Link copied", copyFailed: "Could not copy the link", openPage: "Open public page", profile: "Name", theme: "Background", link: "Link", sns: "Social", inquiry: "Form",
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
        const response = await privateFetch("/api/creator/link/bootstrap", { method: "POST", signal: controller.signal });
        if (response.status === 401) {
          routerRef.current.replace("/login");
          return;
        }
        const data: unknown = await response.json().catch(() => null);
        if (!response.ok || !isBootstrapSuccess(data)) throw new Error(getApiError(data, INITIAL_LOAD_ERROR));
        setPage(data.page);
        const loadedForm = toFormState(data.page);
        setForm(loadedForm);
        const loadedItems = data.items.sort((a, b) => a.sortOrder - b.sortOrder);
        setItems(loadedItems);
        const loadedLayoutOrder = normalizeCreatorLinkLayoutOrder(data.page.layoutOrder, loadedItems.filter((item) => item.itemType === "link").map((item) => item.id));
        setDraftLayoutOrder(loadedLayoutOrder);
        setInquiryTypes(data.inquiryTypes);
        const loadedInquiryForms = toInquiryFormEditor(data.inquiryTypes);
        setInquiryFormEditor(loadedInquiryForms);
        setPersistedDraft({ form: loadedForm, items: loadedItems, layoutOrder: loadedLayoutOrder, inquiryForms: loadedInquiryForms });
        knownPersistedItemIdsRef.current = new Set(loadedItems.map((item) => item.id));
        deletedPersistedItemIdsRef.current.clear();
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
        const response = await privateFetch(`/api/creator/link/slug-availability?${params.toString()}`, { signal: controller.signal });
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

  const currentLinkIds = useMemo(
    () => items.filter((item) => item.itemType === "link").map((item) => item.id),
    [items],
  );
  const effectiveDraftLayoutOrder = useMemo(
    () => normalizeCreatorLinkLayoutOrder(draftLayoutOrder, currentLinkIds),
    [draftLayoutOrder, currentLinkIds],
  );
  const currentEditorDraft = useMemo<EditorDraft | null>(() => form ? ({
    form,
    items,
    layoutOrder: effectiveDraftLayoutOrder,
    inquiryForms: inquiryFormEditor,
  }) : null, [effectiveDraftLayoutOrder, form, inquiryFormEditor, items]);
  const isDirty = Boolean(currentEditorDraft && persistedDraft && !areCreatorLinkEditorDraftsEqual(currentEditorDraft, persistedDraft));

  useEffect(() => {
    if (!isDirty || showFirstRun) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty, showFirstRun]);

  useEffect(() => {
    if (!isDirty || showFirstRun) return;
    const intercept = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin || `${destination.pathname}${destination.search}${destination.hash}` === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;
      event.preventDefault();
      setPendingNavigation(`${destination.pathname}${destination.search}${destination.hash}`);
    };
    document.addEventListener("click", intercept, true);
    return () => document.removeEventListener("click", intercept, true);
  }, [isDirty, showFirstRun]);

  const save = async (nextStatus: CreatorLinkStatus): Promise<boolean> => {
    if (!form || !page || !persistedDraft || saving) return false;
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
    for (const item of items) {
      if (item.itemType === "link") {
        const validated = validateCreatorLinkServiceLink({
          serviceKey: getCreatorLinkServiceKeyFromMetadata(item.metadata) ?? "custom",
          title: item.title ?? "",
          input: item.url ?? "",
        });
        if (!validated.ok) {
          setToast({ tone: "error", message: validated.error });
          openLinkSheet(item);
          return false;
        }
      }
      if (item.itemType === "social" && item.platform && isCreatorLinkSocialPlatform(item.platform)) {
        const validated = normalizeSocialProfile(item.platform, item.url ?? "");
        if (!validated.ok) {
          setToast({ tone: "error", message: validated.error });
          openSocialSheet(item.platform);
          return false;
        }
      }
    }
    if (!inquiryFormEditor.simple.title.trim() || !inquiryFormEditor.pr.title.trim()) {
      setToast({ tone: "error", message: locale === "ja" ? "フォーム名を入力してください。" : "Enter a title for each inquiry form." });
      setSheet("inquiry");
      return false;
    }
    setSaving(true);
    setToast(null);
    try {
      let workingItems = [...items].sort((left, right) => left.sortOrder - right.sortOrder);
      let workingLayoutOrder = [...effectiveDraftLayoutOrder];
      const currentIds = new Set(workingItems.map((item) => item.id));

      for (const persistedItem of persistedDraft.items) {
        if (currentIds.has(persistedItem.id) || deletedPersistedItemIdsRef.current.has(persistedItem.id)) continue;
        const response = await privateFetch(`/api/creator/link/items/${persistedItem.id}`, { method: "DELETE" });
        if (response.status === 401) { router.replace("/login"); return false; }
        const data: unknown = await response.json().catch(() => null);
        if (!response.ok || !isItemDeleteSuccess(data)) throw new Error(getApiError(data, copy.itemError));
        deletedPersistedItemIdsRef.current.add(persistedItem.id);
        knownPersistedItemIdsRef.current.delete(persistedItem.id);
      }

      for (const draftItem of [...workingItems]) {
        if (knownPersistedItemIdsRef.current.has(draftItem.id)) continue;
        const response = await privateFetch("/api/creator/link/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageId: page.id, itemType: draftItem.itemType, platform: draftItem.platform, title: draftItem.title, url: draftItem.url, metadata: draftItem.metadata }),
        });
        if (response.status === 401) { router.replace("/login"); return false; }
        const data: unknown = await response.json().catch(() => null);
        if (!response.ok || !isItemMutationSuccess(data)) throw new Error(getApiError(data, copy.itemError));
        const temporaryId = draftItem.id;
        knownPersistedItemIdsRef.current.add(data.item.id);
        workingItems = workingItems.map((item) => item.id === temporaryId ? { ...data.item, sortOrder: item.sortOrder, isVisible: item.isVisible } : item);
        workingLayoutOrder = replaceCreatorLinkDraftLayoutItemId(workingLayoutOrder, temporaryId, data.item.id);
        setItems(workingItems);
        setDraftLayoutOrder(workingLayoutOrder);
      }

      const savedItems: CreatorLinkItem[] = [];
      for (const draftItem of workingItems) {
        const response = await privateFetch(`/api/creator/link/items/${draftItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(draftItem.itemType === "social" ? { platform: draftItem.platform, url: draftItem.url } : { title: draftItem.title, url: draftItem.url }),
            metadata: draftItem.metadata,
            isVisible: draftItem.isVisible,
          }),
        });
        if (response.status === 401) { router.replace("/login"); return false; }
        const data: unknown = await response.json().catch(() => null);
        if (!response.ok || !isItemMutationSuccess(data)) throw new Error(getApiError(data, copy.itemError));
        savedItems.push({ ...data.item, sortOrder: draftItem.sortOrder });
      }

      const orderedItems = savedItems.sort((left, right) => left.sortOrder - right.sortOrder).map((item, sortOrder) => ({ ...item, sortOrder }));
      if (orderedItems.length > 0) {
        const response = await privateFetch("/api/creator/link/items/reorder", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageId: page.id, items: orderedItems.map((item) => ({ id: item.id, sortOrder: item.sortOrder })) }),
        });
        if (response.status === 401) { router.replace("/login"); return false; }
        const data: unknown = await response.json().catch(() => null);
        if (!response.ok || !isReorderSuccess(data)) throw new Error(getApiError(data, copy.reorderError));
        const reorderedById = new Map(data.items.map((item) => [item.id, item]));
        workingItems = orderedItems.map((item) => reorderedById.get(item.id) ?? item);
      } else {
        workingItems = [];
      }

      const inquiryResponse = await privateFetch("/api/creator/link/inquiry-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: page.id, forms: (["simple", "pr"] as const).map((kind, sortOrder) => ({ kind, title: inquiryFormEditor[kind].title, isEnabled: inquiryFormEditor[kind].isEnabled, sortOrder })) }),
      });
      if (inquiryResponse.status === 401) { router.replace("/login"); return false; }
      const inquiryData: unknown = await inquiryResponse.json().catch(() => null);
      if (!inquiryResponse.ok || !isInquiryFormsUpdateSuccess(inquiryData)) throw new Error(getApiError(inquiryData, copy.saveError));

      const realLinkIds = workingItems.filter((item) => item.itemType === "link").map((item) => item.id);
      const finalLayoutOrder = normalizeCreatorLinkLayoutOrder(workingLayoutOrder, realLinkIds);
      const response = await privateFetch("/api/creator/link/page", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: page.id, displayName: form.displayName, displayNameColor: form.displayNameColor, bio: form.bio, slug: form.slug, themeKey: form.themeKey, accentColor: form.accentColor, buttonStyle: form.buttonStyle, fontStyle: form.fontStyle, avatarUrl: form.avatarUrl, coverUrl: form.coverUrl, isAcceptingInquiries: inquiryData.isAcceptingInquiries, status: nextStatus, layoutOrder: finalLayoutOrder }),
      });
      if (response.status === 401) { router.replace("/login"); return false; }
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok || !isUpdateSuccess(data)) throw new Error(getApiError(data, copy.saveError));

      const savedForm = toFormState(data.page);
      const savedInquiryForms = toInquiryFormEditor(inquiryData.inquiryTypes);
      const nextDraft = { form: savedForm, items: workingItems, layoutOrder: finalLayoutOrder, inquiryForms: savedInquiryForms };
      const nextInquiryTypes = [...inquiryTypes.filter((item) => item.templateKey !== "pr_post" && item.templateKey !== null), ...inquiryData.inquiryTypes];
      setPage(data.page);
      setForm(savedForm);
      setItems(workingItems);
      setDraftLayoutOrder(finalLayoutOrder);
      setInquiryTypes(nextInquiryTypes);
      setInquiryFormEditor(savedInquiryForms);
      setPersistedDraft(nextDraft);
      knownPersistedItemIdsRef.current = new Set(workingItems.map((item) => item.id));
      deletedPersistedItemIdsRef.current.clear();
      setSlugCheck("available");
      setToast({ tone: "success", message: nextStatus === "published" && persistedDraft.form.status !== "published" ? copy.publishedMessage : copy.saved });
      return true;
    } catch (saveError) {
      setToast({ tone: "error", message: saveError instanceof Error ? saveError.message : copy.saveError });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const openSocialSheet = (selectedPlatform?: CreatorLinkSocialPlatform) => {
    const next = { ...EMPTY_SOCIAL_INPUTS };
    const inherited = form ? currentSocialAppearance(form, items) : DEFAULT_CREATOR_LINK_ITEM_APPEARANCE;
    const nextAppearances = Object.fromEntries(CREATOR_LINK_SOCIAL_PLATFORMS.map((platform) => [platform, { ...inherited }])) as SocialAppearances;
    for (const item of items) {
      if (item.itemType === "social" && item.platform && isCreatorLinkSocialPlatform(item.platform)) {
        next[item.platform] = extractCreatorLinkServiceEditableValue(item.platform, item.url);
        nextAppearances[item.platform] = normalizeCreatorLinkItemAppearance(item.metadata);
      }
    }
    setSocialInputs(next);
    setSocialAppearances(nextAppearances);
    setSocialColorTarget(null);
    if (selectedPlatform) setActiveSocial(selectedPlatform);
    setSheet("social");
  };

  const openAddSheet = () => setSheet("add");

  const updateExistingSocialDraft = (platform: CreatorLinkSocialPlatform, input: string, appearance: CreatorLinkItemAppearance) => {
    setItems((current) => current.map((item) => item.itemType === "social" && item.platform === platform
      ? { ...item, url: input, metadata: appearance }
      : item));
  };

  const updateExistingLinkDraft = (next: LinkEditorState) => {
    setLinkEditor(next);
    if (!next.id) return;
    setItems((current) => current.map((item) => item.id === next.id ? {
      ...item,
      title: next.title,
      url: next.url,
      metadata: { ...next.appearance, serviceKey: next.serviceKey },
    } : item));
  };

  const openLinkSheet = (item?: CreatorLinkItem | TrendreLinkCanvasItem, selectedService: CreatorLinkServiceKey = "custom") => {
    const itemService = item ? getCreatorLinkServiceKeyFromMetadata(item.metadata) ?? "custom" : selectedService;
    const appearance = item ? normalizeCreatorLinkItemAppearance(item.metadata) : form ? currentLinkAppearance(form, items) : { ...DEFAULT_CREATOR_LINK_ITEM_APPEARANCE };
    setLinkEditor(item && item.itemType === "link" ? {
      id: item.id ?? null,
      title: item.title ?? "",
      url: extractCreatorLinkServiceEditableValue(itemService, item.url),
      serviceKey: itemService,
      appearance: { ...appearance, serviceKey: itemService },
    } : {
      ...EMPTY_LINK_EDITOR,
      title: locale === "ja" ? getCreatorLinkService(selectedService).labelJa : getCreatorLinkService(selectedService).labelEn,
      serviceKey: selectedService,
      appearance: { ...appearance, serviceKey: selectedService },
    });
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
    if (existing) {
      setItems((current) => current.map((item) => item.id === existing.id ? { ...item, url: normalized.value.url, metadata: socialAppearances[platform] } : item));
    } else {
      const now = new Date().toISOString();
      const nextSortOrder = items.reduce((maximum, item) => Math.max(maximum, item.sortOrder), -1) + 1;
      setItems((current) => [...current, {
        id: createCreatorLinkTemporaryItemId(), pageId: page.id, itemType: "social", platform,
        title: null, description: null, url: normalized.value.url, imageUrl: null,
        metadata: socialAppearances[platform], sortOrder: nextSortOrder, isVisible: true,
        createdAt: now, updatedAt: now,
      }]);
    }
    setSocialInputs((current) => ({ ...current, [platform]: extractCreatorLinkServiceEditableValue(platform, normalized.value.url) }));
    setToast({ tone: "success", message: locale === "ja" ? "下書きに追加しました" : "Added to draft" });
    return true;
  };

  const deleteItem = async (id: string) => {
    const deleted = items.find((item) => item.id === id);
    setItems((current) => current.filter((item) => item.id !== id));
    if (deleted?.itemType === "link") setDraftLayoutOrder((current) => current?.filter((token) => token !== `link:${id}`) ?? null);
    if (deleted?.itemType === "social" && deleted.platform && isCreatorLinkSocialPlatform(deleted.platform)) {
      setSocialInputs((current) => ({ ...current, [deleted.platform as CreatorLinkSocialPlatform]: "" }));
      setSocialAppearances((current) => ({ ...current, [deleted.platform as CreatorLinkSocialPlatform]: DEFAULT_CREATOR_LINK_ITEM_APPEARANCE }));
    }
    if (linkEditor.id === id) setLinkEditor(EMPTY_LINK_EDITOR);
    setToast({ tone: "success", message: locale === "ja" ? "下書きから削除しました" : "Removed from draft" });
  };

  const saveLink = async () => {
    if (!page || itemSaving) return;
    const validated = validateCreatorLinkServiceLink({ serviceKey: linkEditor.serviceKey, title: linkEditor.title, input: linkEditor.url });
    if (!validated.ok) {
      setToast({ tone: "error", message: validated.error });
      return;
    }
    if (linkEditor.id) {
      setItems((current) => current.map((item) => item.id === linkEditor.id ? { ...item, title: validated.value.title, url: validated.value.url, metadata: { ...linkEditor.appearance, serviceKey: linkEditor.serviceKey } } : item));
    } else {
      const id = createCreatorLinkTemporaryItemId();
      const now = new Date().toISOString();
      const nextSortOrder = items.reduce((maximum, item) => Math.max(maximum, item.sortOrder), -1) + 1;
      setItems((current) => [...current, {
        id, pageId: page.id, itemType: "link", platform: null, title: validated.value.title,
        description: null, url: validated.value.url, imageUrl: null, metadata: { ...linkEditor.appearance, serviceKey: linkEditor.serviceKey },
        sortOrder: nextSortOrder, isVisible: true, createdAt: now, updatedAt: now,
      }]);
      setDraftLayoutOrder((current) => [...(current ?? []), `link:${id}`]);
    }
    setToast({ tone: "success", message: locale === "ja" ? "下書きに追加しました" : "Added to draft" });
    setSheet(null);
    if (showFirstRun && onboardingStep === 4) setOnboardingStep(5);
  };

  const applyOnboardingPreset = async (preset: CreatorLinkOnboardingPreset): Promise<boolean> => {
    if (!page || !form || itemSaving || saving) return false;
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
    return true;
  };

  const toggleItemVisibility = async (item: CreatorLinkItem) => {
    if (item.itemType !== "social" && item.itemType !== "link") return;
    setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, isVisible: !candidate.isVisible } : candidate));
  };

  const reorderItems = async (canvasItems: TrendreLinkCanvasItem[]) => {
    const orderedItems = canvasItems.filter((item): item is TrendreLinkCanvasItem & { id: string } => Boolean(item.id));
    setItems((current) => reorderCreatorLinkDraftItems(current, orderedItems));
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
      const response = await privateFetch("/api/creator/link/images", { method: "POST", body: payload });
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

  const savedStatus = persistedDraft?.form.status ?? page.status;
  const isPublished = savedStatus === "published";
  const canUsePublicUrl = isPublished && !isDirty;
  const publicPath = `/in/${persistedDraft?.form.slug ?? page.slug}`;
  const publicUrl = typeof window === "undefined" ? publicPath : new URL(publicPath, window.location.origin).toString();
  const slugMessage = slugError ? copy.checkFailed : slugCheck === "checking" ? copy.checking : slugCheck === "available" ? copy.available : slugCheck === "unavailable" ? copy.unavailable : copy.invalid;
  const slugTone = !slugError && slugCheck === "available" ? "text-emerald-600" : slugCheck === "checking" ? "text-amber-600" : "text-rose-600";
  const canSave = !saving && !slugError && slugCheck === "available" && form.displayName.trim().length > 0 && form.displayName.length <= 80 && form.bio.length <= 500;
  const optimisticItems: TrendreLinkCanvasItem[] = items
    .filter((item) => item.isVisible)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => {
      const normalizedSocial = item.itemType === "social" && item.platform && isCreatorLinkSocialPlatform(item.platform)
        ? normalizeSocialProfile(item.platform, item.url ?? "")
        : null;
      const normalizedLink = item.itemType === "link" ? validateCreatorLinkServiceLink({
        serviceKey: getCreatorLinkServiceKeyFromMetadata(item.metadata) ?? "custom",
        title: item.title ?? "",
        input: item.url ?? "",
      }) : null;
      return { id: item.id, sortOrder: item.sortOrder, itemType: item.itemType, platform: item.platform, title: item.title, description: item.description, url: normalizedSocial ? (normalizedSocial.ok ? normalizedSocial.value.url : null) : normalizedLink ? (normalizedLink.ok ? normalizedLink.value.url : null) : item.url, imageUrl: item.imageUrl, metadata: item.metadata };
    });
  const draftInquiryTypes = inquiryTypes.map((item) => {
    const kind = item.templateKey === "pr_post" ? "pr" : item.templateKey === null ? "simple" : null;
    return kind ? { ...item, title: inquiryFormEditor[kind].title, isEnabled: inquiryFormEditor[kind].isEnabled } : item;
  });
  const viewData: TrendreLinkCanvasData = {
    page: { slug: form.slug, displayName: form.displayName, displayNameColor: form.displayNameColor, bio: form.bio, avatarUrl: form.avatarUrl, coverUrl: form.coverUrl, themeKey: form.themeKey, accentColor: form.accentColor, buttonStyle: form.buttonStyle, fontStyle: form.fontStyle, isAcceptingInquiries: form.isAcceptingInquiries, layoutOrder: effectiveDraftLayoutOrder },
    layoutLinkIds: currentLinkIds,
    items: optimisticItems,
    inquiryTypes: draftInquiryTypes.filter((item) => item.isEnabled).map((item) => ({ id: item.id, sortOrder: item.sortOrder, templateKey: item.templateKey, title: item.title, description: item.description, isCustom: item.isCustom })),
  };

  const copyPublicUrl = async () => {
    if (!canUsePublicUrl) {
      setToast({
        tone: "error",
        message: locale === "ja" ? "公開後にリンクをコピーできます" : "Publish your Link before copying it.",
      });
      return;
    }

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
    else { publicUrlRef.current?.focus(); publicUrlRef.current?.select(); setToast({ tone: "error", message: copy.copyFailed }); }
  };

  const sheetTitle = sheet === "links" ? (locale === "ja" ? "リンク" : "Links")
    : sheet === "add" ? (locale === "ja" ? "追加" : "Add")
    : sheet === "preset" ? (locale === "ja" ? "デザイン" : "Design")
    : sheet === "service" ? (locale === "ja" ? "サービスを選択" : "Choose a service")
    : sheet === "profile" ? copy.urlSettings
    : sheet === "social" ? copy.socialTitle
    : sheet === "link" ? (linkEditor.id ? copy.editLinkTitle : copy.linkTitle)
    : (locale === "ja" ? "仕事の依頼・相談" : "Work inquiries");
  const sheetDescription = sheet === "profile" ? copy.urlHelp
    : sheet === "social" ? copy.socialHelp
    : sheet === "inquiry" ? (locale === "ja" ? "公開ページから受け付ける相談内容を設定します" : "Choose the inquiries shown on your public page")
    : undefined;
  const matchingPreset = findMatchingLinkDesignPreset({
    page: form,
    socials: items.filter((item) => item.itemType === "social"),
    links: items.filter((item) => item.itemType === "link"),
  });
  const matchingBackgroundPreset = findMatchingLinkDesignBackgroundPreset(form);
  const selectedPresetId = matchingBackgroundPreset?.id ?? null;
  const coordinatedPreset = matchingPreset ?? findLinkDesignPresetByPageAppearance(form);
  const availablePresetCategories = getAvailableLinkDesignPresetCategories();
  const openPresetGallery = () => {
    setPresetCategory(matchingBackgroundPreset?.category ?? "normal");
    setSheet("preset");
  };
  const editorNavigation = [
    { key: "links" as const, label: "Links", icon: Link2, action: () => setSheet("links") },
    { key: "preset" as const, label: "Design", icon: Sparkles, action: openPresetGallery },
    { key: "profile" as const, label: "Profile", icon: UserRound, action: () => setSheet("profile") },
    { key: "social" as const, label: "Social", icon: Share2, action: () => openSocialSheet() },
    { key: "inquiry" as const, label: locale === "ja" ? "仕事相談" : "Work", icon: MessageSquareText, action: () => setSheet("inquiry") },
  ];
  const selectedPreviewTarget = sheet === "profile" ? { kind: "profile" as const }
    : sheet === "social" ? { kind: "social" as const, itemId: items.find((item) => item.itemType === "social" && item.platform === activeSocial)?.id }
    : sheet === "link" ? { kind: "link" as const, itemId: linkEditor.id ?? undefined }
    : sheet === "inquiry" ? { kind: "work" as const }
    : null;
  const openPreviewItem = (item: TrendreLinkCanvasItem) => {
    const target = resolveCreatorLinkPreviewEditTarget({ kind: item.itemType === "social" ? "social" : "link", itemId: item.id, platform: item.platform ?? undefined });
    if (target.sheet === "social") {
      const platform = target.platform && isCreatorLinkSocialPlatform(target.platform) ? target.platform : undefined;
      openSocialSheet(platform);
    } else {
      openLinkSheet(item);
    }
  };

  const leaveEditor = async (decision: CreatorLinkUnsavedDecision) => {
    if (!pendingNavigation || !form || !persistedDraft || leaving) return;
    setLeaving(true);
    try {
      const destination = pendingNavigation;
      const mayLeave = await canLeaveCreatorLinkEditor(isDirty, decision, async () => save(form.status));
      if (!mayLeave) return;
      if (decision === "discard") {
        setForm(persistedDraft.form);
        setItems(persistedDraft.items);
        setDraftLayoutOrder(persistedDraft.layoutOrder);
        setInquiryFormEditor(persistedDraft.inquiryForms);
      }
      setPendingNavigation(null);
      router.push(destination);
    } finally {
      setLeaving(false);
    }
  };

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
          <div className="flex min-w-0 items-center justify-end gap-1">
            <button type="button" disabled={!canUsePublicUrl} onClick={() => void copyPublicUrl()} title={canUsePublicUrl ? copy.copyUrl : (locale === "ja" ? "公開後にリンクをコピーできます" : "Publish before copying your Link")} className="flex min-h-10 items-center justify-center gap-1 rounded-full px-2 text-[13px] font-semibold text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500 disabled:cursor-not-allowed disabled:text-slate-300"><Copy className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">{copy.copyUrl}</span><span className="sr-only">{copy.copyUrl}</span></button>
            {canUsePublicUrl ? <Link href={publicPath} target="_blank" rel="noopener noreferrer" aria-label={copy.openPage} className="flex h-11 w-11 items-center justify-center rounded-full text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500"><ExternalLink className="h-[19px] w-[19px]" /></Link> : <button type="button" disabled title={locale === "ja" ? "公開後に公開ページを開けます" : "Publish before opening your Link"} aria-label={copy.openPage} className="flex h-11 w-11 cursor-not-allowed items-center justify-center rounded-full text-slate-300"><ExternalLink className="h-[19px] w-[19px]" /></button>}
            {!isPublished ? <button type="button" disabled={saving} onClick={() => void save("published")} className="onboarding-press min-h-10 rounded-full bg-[#242326] px-3 text-[13px] font-semibold text-white disabled:opacity-35">{saving ? copy.saving : copy.publish}</button> : isDirty ? <button type="button" disabled={!canSave} onClick={() => void save("published")} className="onboarding-press min-h-10 rounded-full bg-[#242326] px-3 text-[13px] font-semibold text-white disabled:opacity-35">{saving ? copy.saving : getCreatorLinkEditorCtaCopy(locale, "saveChanges")}</button> : <span className="rounded-full bg-emerald-50 px-2.5 py-1.5 text-[12px] font-semibold text-emerald-700 ring-1 ring-emerald-100">{locale === "ja" ? "公開中" : "Published"}</span>}
          </div>
        </div>
      </header>

      {toast ? <div role="status" className={`fixed left-1/2 top-[calc(68px+env(safe-area-inset-top))] z-[120] max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-full px-4 py-2 text-center text-xs font-medium shadow-md ${toast.tone === "error" ? "bg-rose-600 text-white" : toast.tone === "success" ? "bg-[#29272a] text-white" : "bg-[#fffdfa] text-slate-700 ring-1 ring-slate-200"}`}>{toast.message}</div> : null}

      <main className={`relative mx-auto flex h-[calc(100%_-_60px_-_env(safe-area-inset-top))] min-h-0 w-full max-w-[720px] items-center justify-center overflow-hidden transition-[padding] duration-300 motion-reduce:transition-none ${sheet && !showFirstRun ? "pb-[min(48dvh,380px)]" : "pb-[74px]"}`}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-6 h-24 rounded-full bg-white/65 blur-3xl" />
        <div className={`trendre-editor-preview relative overflow-hidden rounded-[32px] border-[5px] border-[#242326] bg-[#242326] shadow-[0_22px_60px_rgba(34,31,38,.17)] ${sheet && !showFirstRun ? "is-editing" : ""}`} aria-label="公開ページのライブプレビュー">
          <div className="origin-top-left transition-transform duration-300 motion-reduce:transition-none"><TrendreLinkCanvas data={viewData} mode="edit" locale={locale} editingField={editingField} onEditingFieldChange={setEditingField} onDisplayNameChange={(displayName) => setForm({ ...form, displayName })} onEditProfile={() => setSheet("profile")} onEditInquirySettings={() => setSheet("inquiry")} onAddFirstLink={() => setSheet("service")} onEditItem={openPreviewItem} onReorderLayoutOrder={setDraftLayoutOrder} onReorderSocialItems={(nextItems) => { void reorderItems(nextItems); }} selectedTarget={selectedPreviewTarget} /></div>
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

            {sheet === "links" ? <CreatorLinkItemsEditor items={items} busyItemId={itemSaving} onAdd={openAddSheet} onEdit={openLinkSheet} onToggle={(item) => void toggleItemVisibility(item)} onReorder={(nextItems) => void reorderItems(nextItems)} /> : null}

            {sheet === "add" ? <div className="grid grid-cols-2 gap-3 pt-5">{CREATOR_LINK_ADD_ACTIONS.map((action) => { const Icon = action.id === "link" ? Link2 : Share2; return <button key={action.id} type="button" onClick={() => action.sheet === "link" ? setSheet("service") : openSocialSheet()} className="onboarding-press flex min-h-28 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 outline-none focus-visible:ring-4 focus-visible:ring-rose-200"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white"><Icon className="h-5 w-5" /></span>{action.label}</button>; })}</div> : null}

            {sheet === "service" ? <div className="space-y-2 py-4">
              {CREATOR_LINK_STANDARD_SERVICES.map((serviceKey) => { const service = getCreatorLinkService(serviceKey); return <button key={serviceKey} type="button" onClick={() => openLinkSheet(undefined, serviceKey)} className="onboarding-press flex min-h-16 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-left outline-none focus-visible:ring-4 focus-visible:ring-rose-200"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50"><ServiceIcon serviceKey={serviceKey} brand className="h-5 w-5" /></span><span className="min-w-0"><span className="block text-sm font-semibold text-slate-900">{locale === "ja" ? service.labelJa : service.labelEn}</span><span className="block truncate text-xs text-slate-500">{locale === "ja" ? service.descriptionJa : service.descriptionEn}</span></span><ChevronRight className="ml-auto h-4 w-4 shrink-0 text-slate-400" /></button>; })}
              <button type="button" onClick={() => openLinkSheet(undefined, "custom")} className="onboarding-press flex min-h-16 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-left outline-none focus-visible:ring-4 focus-visible:ring-rose-200"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50"><ServiceIcon serviceKey="custom" className="h-5 w-5" /></span><span><span className="block text-sm font-semibold text-slate-900">{locale === "ja" ? getCreatorLinkService("custom").labelJa : getCreatorLinkService("custom").labelEn}</span><span className="block text-xs text-slate-500">{locale === "ja" ? getCreatorLinkService("custom").descriptionJa : getCreatorLinkService("custom").descriptionEn}</span></span><ChevronRight className="ml-auto h-4 w-4 shrink-0 text-slate-400" /></button>
            </div> : null}

            {sheet === "preset" ? <div className="mt-3 pb-3"><div role="tablist" aria-label={locale === "ja" ? "スタイルカテゴリ" : "Style categories"} className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">{availablePresetCategories.map((category) => <button key={category} type="button" role="tab" aria-selected={presetCategory === category} onClick={() => setPresetCategory(category)} className={`min-h-11 shrink-0 rounded-full px-4 text-xs font-semibold capitalize outline-none focus-visible:ring-4 focus-visible:ring-rose-200 ${presetCategory === category ? "bg-[#242326] text-white" : "bg-slate-100 text-slate-600"}`}>{category}</button>)}</div><StylePresetGallery data={viewData} selectedPresetId={selectedPresetId} category={presetCategory} application="background" uploading={uploadingImage === "background"} onUpload={(file) => void uploadImage(file, "background")} onSelect={(preset) => setForm(withCreatorLinkBackground(form, createCreatorLinkBackgroundReference(preset.backgroundId)))} /></div> : null}

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
                <fieldset><legend className="text-sm font-medium text-slate-600">Display name font</legend><div className="mt-2 grid grid-cols-4 gap-2">{(["modern", "soft", "serif", "bold"] as CreatorLinkFontStyle[]).map((font) => <button key={font} type="button" aria-pressed={form.fontStyle === font} onClick={() => setForm({ ...form, fontStyle: font })} className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border bg-white text-xs capitalize ${form.fontStyle === font ? "border-slate-950 ring-1 ring-slate-950" : "border-slate-200"}`}><span className={`text-xl ${font === "serif" ? "font-serif" : font === "bold" ? "font-black" : font === "soft" ? "tracking-wider" : "font-semibold"}`}>Aa</span>{font}</button>)}</div></fieldset>
                <label className="flex min-h-14 items-center justify-between rounded-2xl bg-slate-50 px-4 text-sm font-medium text-slate-700">Display name color<span className="flex items-center gap-2"><span className="font-mono text-xs text-slate-500">{form.displayNameColor ?? "Design"}</span><span className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-white shadow ring-1 ring-black/10" style={{ backgroundColor: form.displayNameColor ?? "#29272A" }}><input type="color" value={form.displayNameColor ?? "#29272A"} onChange={(event) => setForm({ ...form, displayNameColor: event.target.value.toUpperCase() })} className="absolute inset-[-8px] h-16 w-16 cursor-pointer opacity-0" /></span></span></label>
                <label className="block text-sm font-medium text-slate-600">slug<div className="mt-1.5 flex h-12 overflow-hidden rounded-xl border border-slate-200 bg-white/80 focus-within:border-rose-400"><span className="flex shrink-0 items-center border-r border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-500">trendre.jp/in/</span><input value={form.slug} maxLength={50} autoCapitalize="none" autoCorrect="off" spellCheck={false} onChange={(event) => { setForm({ ...form, slug: event.target.value }); setSlugError(null); }} className="min-w-0 flex-1 select-text bg-transparent px-3 text-base outline-none" /></div></label>
                <p className={`flex items-center gap-1.5 text-xs font-medium ${slugTone}`}>{!slugError && slugCheck === "available" ? <CheckIcon /> : null}{slugMessage}</p>
                <div className="sticky bottom-0 -mx-4 border-t border-black/[0.06] bg-[#fffdfa]/95 px-4 pb-2 pt-3 backdrop-blur"><button type="button" onClick={() => setSheet(null)} className="min-h-11 w-full rounded-full bg-slate-100 px-4 text-sm font-semibold text-slate-700">{copy.done}</button></div>
              </div>
            ) : null}

            {sheet === "social" ? (
              <div className="pb-3 pt-4">
                <p className="text-sm font-semibold text-slate-900">SNS Accounts</p>
                <div role="tablist" aria-label="SNS" className="flex items-center justify-center gap-2">
                  {CREATOR_LINK_SOCIAL_PLATFORMS.map((platform) => { const connected = items.some((item) => item.itemType === "social" && item.platform === platform); return <button key={platform} type="button" role="tab" aria-selected={activeSocial === platform} onClick={() => setActiveSocial(platform)} aria-label={platform === "x" ? "X" : platform} className={`onboarding-press relative flex h-12 w-12 items-center justify-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-rose-200 ${activeSocial === platform ? "bg-[#242326] text-white" : "bg-slate-100 text-slate-700"}`}><SocialBrandIcon platform={platform} className="h-5 w-5" />{connected ? <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#fffdfa] bg-emerald-500" /> : null}</button>; })}
                </div>
                <CreatorLinkSocialOrderEditor items={items} onReorder={(nextItems) => void reorderItems(nextItems)} />
                {(() => {
                  const existing = items.find((item) => item.itemType === "social" && item.platform === activeSocial);
                  const socialService = getCreatorLinkService(activeSocial);
                  const label = locale === "ja" ? socialService.labelJa : socialService.labelEn;
                  const appearance = socialAppearances[activeSocial];
                  const shape: CreatorLinkSocialShape = appearance.socialShape ?? (appearance.socialStyle === "pill" ? "pill" : appearance.socialStyle === "circle" || appearance.socialStyle === "glass" ? "circle" : "icons");
                  const selectColor = (target: CreatorLinkSocialColorControl, value: string | null) => {
                    const colorUpdate = target === "icon" ? { iconColor: value } : target === "surface" ? { surfaceColor: value } : { borderColor: value };
                    const nextAppearance = { ...appearance, socialShape: shape, ...colorUpdate };
                    setSocialAppearances({ ...socialAppearances, [activeSocial]: nextAppearance });
                    updateExistingSocialDraft(activeSocial, socialInputs[activeSocial], nextAppearance);
                  };
                  return <div className="mx-auto mt-5 max-w-lg">
                    <div className="rounded-2xl bg-slate-50/80 p-4">
                      <div className="mb-2 flex items-center justify-between"><label htmlFor="social-editor-input" className="text-sm font-semibold text-slate-800">{label}</label>{existing ? <span className="text-xs font-medium text-emerald-600">Connected</span> : <span className="text-xs text-slate-400">Not set</span>}</div>
                      <div className="flex gap-2"><div className="flex h-12 min-w-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white focus-within:border-slate-500 focus-within:ring-4 focus-within:ring-slate-100"><span className="flex shrink-0 items-center border-r border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-500">{socialService.displayPrefix}</span><input id="social-editor-input" type="text" inputMode="text" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={socialInputs[activeSocial]} onChange={(event) => { const raw = event.target.value; const normalized = normalizeCreatorLinkServiceInput(activeSocial, raw); const input = normalized.ok ? normalized.value.editableValue : raw.replace(/^@+/, ""); setSocialInputs({ ...socialInputs, [activeSocial]: input }); updateExistingSocialDraft(activeSocial, input, appearance); }} placeholder={socialService.placeholder} className="min-w-0 flex-1 select-text bg-transparent px-3 text-base outline-none" /></div>{existing ? <button type="button" disabled={Boolean(itemSaving)} onClick={() => void deleteItem(existing.id)} aria-label={copy.deleteItem} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-400 hover:text-rose-600"><TrashIcon /></button> : null}</div>
                    </div>
                    <SocialShapeControl value={shape} onChange={(socialShape) => { const nextAppearance = { ...appearance, socialShape }; setSocialColorTarget(null); setSocialAppearances({ ...socialAppearances, [activeSocial]: nextAppearance }); updateExistingSocialDraft(activeSocial, socialInputs[activeSocial], nextAppearance); }} />
                    <SocialColorRows shape={shape} appearance={appearance} activeTarget={socialColorTarget} presetColors={{ icon: coordinatedPreset?.socialIconColor ?? null, surface: coordinatedPreset?.socialSurfaceColor ?? null, border: coordinatedPreset?.socialBorderColor ?? null }} onToggle={(target) => setSocialColorTarget((current) => current === target ? null : target)} onSelect={selectColor} />
                    {!existing ? <div className="sticky bottom-0 -mx-4 mt-5 border-t border-slate-200 bg-[#fffdfa]/95 px-4 pb-2 pt-3"><button type="button" disabled={Boolean(itemSaving) || !socialInputs[activeSocial].trim()} onClick={() => void saveSocial(activeSocial)} className="h-12 w-full rounded-xl bg-[#29272A] text-sm font-semibold text-white disabled:opacity-40">{locale === "ja" ? "追加" : "Add"}</button></div> : null}
                  </div>;
                })()}
              </div>
            ) : null}

            {sheet === "link" ? (
              <div className="mt-5 space-y-4">
                {linkEditor.serviceKey !== "custom" ? <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white"><ServiceIcon serviceKey={linkEditor.serviceKey} brand className="h-5 w-5" /></span><span><span className="block text-sm font-semibold text-slate-900">{locale === "ja" ? getCreatorLinkService(linkEditor.serviceKey).labelJa : getCreatorLinkService(linkEditor.serviceKey).labelEn}</span><span className="block text-xs text-slate-500">{locale === "ja" ? getCreatorLinkService(linkEditor.serviceKey).descriptionJa : getCreatorLinkService(linkEditor.serviceKey).descriptionEn}</span></span></div> : null}
                <label className="block text-sm font-medium text-slate-600">{copy.linkName}<input value={linkEditor.title} maxLength={80} onChange={(event) => updateExistingLinkDraft({ ...linkEditor, title: event.target.value })} className="mt-1.5 h-12 w-full select-text rounded-xl border border-slate-200 bg-white/80 px-3 text-base outline-none focus:border-rose-400" /></label>
                <label className="block text-sm font-medium text-slate-600">{getCreatorLinkService(linkEditor.serviceKey).inputMode === "handle" ? (locale === "ja" ? "ID" : "Handle") : copy.url}<span className="mt-1.5 flex h-12 overflow-hidden rounded-xl border border-slate-200 bg-white/80 focus-within:border-rose-400">{getCreatorLinkService(linkEditor.serviceKey).displayPrefix ? <span className="flex shrink-0 items-center border-r border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-500">{getCreatorLinkService(linkEditor.serviceKey).displayPrefix}</span> : null}<input type={getCreatorLinkService(linkEditor.serviceKey).inputMode === "url" ? "url" : "text"} value={linkEditor.url} maxLength={500} inputMode={getCreatorLinkService(linkEditor.serviceKey).inputMode === "url" ? "url" : "text"} autoCapitalize="none" autoCorrect="off" spellCheck={false} onChange={(event) => { const raw = event.target.value; const normalized = normalizeCreatorLinkServiceInput(linkEditor.serviceKey, raw); updateExistingLinkDraft({ ...linkEditor, url: normalized.ok ? normalized.value.editableValue : raw.replace(/^@+/, "") }); }} placeholder={getCreatorLinkService(linkEditor.serviceKey).placeholder} className="min-w-0 flex-1 select-text bg-transparent px-3 text-base outline-none" /></span></label>
                <details open={Boolean(linkEditor.id)} className="rounded-xl border border-slate-200 bg-white/70 px-4 py-3">
                  <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500">{locale === "ja" ? "詳細デザイン" : "Advanced design"}</summary>
                  <CardDesignSelector value={linkEditor.appearance} onChange={(appearance) => updateExistingLinkDraft({ ...linkEditor, appearance })} locale={locale} pageButtonStyle={form.buttonStyle} />
                </details>
                <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-slate-200/70 bg-[#fffdfa]/95 px-4 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">{linkEditor.id ? <button type="button" disabled={Boolean(itemSaving)} onClick={() => void deleteItem(linkEditor.id!)} aria-label={copy.deleteItem} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-medium text-rose-600"><TrashIcon />{copy.deleteItem}</button> : <button type="button" disabled={Boolean(itemSaving)} onClick={() => void saveLink()} className="min-h-11 flex-1 rounded-xl bg-[#29272a] text-sm font-medium text-white transition enabled:hover:bg-[#ed5964] disabled:opacity-40">{locale === "ja" ? "追加" : "Add"}</button>}</div>
              </div>
            ) : null}

            {sheet === "inquiry" ? <WorkEditorV2 value={inquiryFormEditor} locale={locale} onChange={(next) => { setInquiryFormEditor(next); setForm({ ...form, isAcceptingInquiries: next.simple.isEnabled || next.pr.isEnabled }); }} onPreview={(kind) => setPreviewInquiry({ kind, title: inquiryFormEditor[kind].title.trim() || INQUIRY_FORM_DEFAULTS[kind].title })} /> : null}

        </EditorBottomSheet>
        </div>
      ) : null}

      {showFirstRun ? <div className="fixed inset-0 z-[60] overflow-hidden bg-[#141414]"><CreatorLinkOnboarding step={onboardingStep} form={form as OnboardingLinkForm} previewData={viewData} slugState={slugCheck} slugMessage={slugMessage} slugError={slugError} uploadingImage={uploadingImage === "avatar"} completing={saving} completionReady={onboardingCompletionReady} publicUrl={publicUrl} socialInputs={socialInputs} savedSocials={items.filter((item) => item.itemType === "social" && item.platform && isCreatorLinkSocialPlatform(item.platform)).map((item) => item.platform as CreatorLinkSocialPlatform)} socialSaving={Boolean(itemSaving)} onStepChange={setOnboardingStep} onChange={(updates) => setForm({ ...form, ...updates })} onSelectAvatar={selectAvatarForCrop} onSocialChange={(platform, value) => setSocialInputs((current) => ({ ...current, [platform]: value }))} onSaveSocial={saveSocial} onAddLink={() => openLinkSheet()} onApplyPreset={applyOnboardingPreset} onComplete={async () => { const saved = await save("published"); if (saved) setOnboardingCompletionReady(true); return saved; }} onCopyPublicUrl={() => void copyPublicUrl()} onFinish={() => { setShowFirstRun(false); setSheet(null); }} /></div> : null}
      {previewInquiry ? <InquiryFormModal key={`${previewInquiry.kind}-${previewInquiry.title}`} formId={null} kind={previewInquiry.kind} title={previewInquiry.title} slug={form.slug} mode="preview" locale={locale} onClose={() => setPreviewInquiry(null)} /> : null}
      {avatarCropFile ? <ProfileImageCropModal file={avatarCropFile} locale={locale} onCancel={() => setAvatarCropFile(null)} onConfirm={async (croppedFile) => { const uploaded = await uploadImage(croppedFile, "avatar"); if (uploaded) setAvatarCropFile(null); return uploaded; }} /> : null}
      {pendingNavigation ? <div role="dialog" aria-modal="true" aria-labelledby="unsaved-link-title" className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center">
        <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
          <h2 id="unsaved-link-title" className="text-lg font-semibold text-slate-950">{locale === "ja" ? "変更を保存しますか？" : "Save your changes?"}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{locale === "ja" ? "このページを離れる前に、編集内容を保存または破棄してください。" : "Save or discard your draft before leaving this page."}</p>
          <div className="mt-5 grid gap-2">
            <button type="button" disabled={leaving || !canSave} onClick={() => void leaveEditor("save")} className="min-h-12 rounded-xl bg-[#242326] px-4 text-sm font-semibold text-white disabled:opacity-40">{leaving ? copy.saving : (locale === "ja" ? "保存して移動" : "Save and leave")}</button>
            <button type="button" disabled={leaving} onClick={() => void leaveEditor("discard")} className="min-h-12 rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-600 disabled:opacity-40">{locale === "ja" ? "破棄して移動" : "Discard and leave"}</button>
            <button type="button" disabled={leaving} onClick={() => setPendingNavigation(null)} className="min-h-12 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-700 disabled:opacity-40">{locale === "ja" ? "編集を続ける" : "Keep editing"}</button>
          </div>
        </div>
      </div> : null}
    </div>
  );
}
