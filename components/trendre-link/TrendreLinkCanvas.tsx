"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BriefcaseBusiness, ChevronRight, Link as LinkGlyph } from "lucide-react";
import InquiryFormModal from "@/components/trendre-link/InquiryFormModal";
import SocialBrandIcon from "@/components/trendre-link/SocialBrandIcon";
import { findLinkDesignBackgroundPreset } from "@/lib/trendre-link/link-design-presets";
import type { CreatorLinkButtonStyle, CreatorLinkFontStyle, CreatorLinkItemType, CreatorLinkTheme } from "@/lib/trendre-link/constants";
import { CREATOR_LINK_ITEM_COLOR_VALUES, isCreatorLinkSocialPlatform, normalizeCreatorLinkItemAppearance, type CreatorLinkItemAppearance } from "@/lib/trendre-link/item-validation";
import type { CreatorLinkInquiryFormKind } from "@/lib/trendre-link/inquiry-forms";
import { inquiryDraftStorageKey, parseInquiryDraft, safeSessionStorageGet } from "@/lib/trendre-link/inquiry-return";
import { createCreatorLinkInquiryFormSelection } from "@/lib/trendre-link/public-inquiry-types";

export const TRENDRE_LINK_LOGICAL_CANVAS_WIDTH = 480;
export const TRENDRE_LINK_LOGICAL_CANVAS_HEIGHT = 1040;

export type TrendreLinkCanvasMode = "edit" | "preview" | "public";
export type TrendreLinkEditableField = "displayName" | "bio" | null;
export type TrendreLinkCanvasItem = { id?: string; sortOrder?: number; itemType: CreatorLinkItemType; platform: string | null; title: string | null; description: string | null; url: string | null; imageUrl: string | null; metadata: CreatorLinkItemAppearance };
export type TrendreLinkCanvasInquiryType = { id?: string; sortOrder?: number; templateKey: string | null; title: string; description: string | null; isCustom?: boolean };
export type TrendreLinkCanvasData = {
  page: { slug: string; displayName: string; displayNameColor: string | null; bio: string | null; avatarUrl: string | null; coverUrl: string | null; themeKey: CreatorLinkTheme; accentColor: string | null; buttonStyle: CreatorLinkButtonStyle; fontStyle: CreatorLinkFontStyle; isAcceptingInquiries: boolean };
  items: TrendreLinkCanvasItem[];
  inquiryTypes: TrendreLinkCanvasInquiryType[];
};

type CanvasProps = {
  data: TrendreLinkCanvasData;
  mode: TrendreLinkCanvasMode;
  locale?: "ja" | "en";
  editingField?: TrendreLinkEditableField;
  onEditingFieldChange?: (field: TrendreLinkEditableField) => void;
  onDisplayNameChange?: (value: string) => void;
  onBioChange?: (value: string) => void;
  onEditProfile?: () => void;
  onEditInquirySettings?: () => void;
  onAddFirstLink?: () => void;
  onEditItem?: (item: TrendreLinkCanvasItem) => void;
  onReorderItems?: (items: TrendreLinkCanvasItem[]) => void;
  onReorderInquiryTypes?: (types: TrendreLinkCanvasInquiryType[]) => void;
};

const THEMES = {
  "night-purple": { shell: "bg-[#1d1236] text-white", panel: "bg-white/10 border-white/15", muted: "text-white/70", subtle: "text-white/50", button: "bg-white text-[#241047]", edit: "border-white/25 bg-white/10 text-white" },
  "soft-ivory": { shell: "bg-[#f7efe1] text-stone-900", panel: "bg-white/65 border-stone-300/60", muted: "text-stone-600", subtle: "text-stone-500", button: "bg-stone-900 text-white", edit: "border-stone-500/30 bg-white/50 text-stone-800" },
  "minimal-black": { shell: "bg-[#0c0c0c] text-white", panel: "bg-white/5 border-white/15", muted: "text-white/65", subtle: "text-white/45", button: "bg-white text-black", edit: "border-white/25 bg-white/5 text-white" },
  "natural-beige": { shell: "bg-[#cdbda8] text-[#30291f]", panel: "bg-[#f8f3ea]/60 border-white/45", muted: "text-[#665b4c]", subtle: "text-[#746958]", button: "bg-[#443a2e] text-white", edit: "border-[#443a2e]/25 bg-white/30 text-[#30291f]" },
} satisfies Record<CreatorLinkTheme, Record<string, string>>;

function PencilIcon() { return <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true"><path d="m14.7 5.3 4 4M4 20l3.8-.8L19 8a1.4 1.4 0 0 0 0-2l-1-1a1.4 1.4 0 0 0-2 0L4.8 16.2 4 20Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function DragIcon() { return <svg viewBox="0 0 20 20" fill="currentColor" className="h-[18px] w-[18px]" aria-hidden="true"><circle cx="7" cy="5" r="1.15" /><circle cx="13" cy="5" r="1.15" /><circle cx="7" cy="10" r="1.15" /><circle cx="13" cy="10" r="1.15" /><circle cx="7" cy="15" r="1.15" /><circle cx="13" cy="15" r="1.15" /></svg>; }
function getInitial(name: string) { return name.trim().slice(0, 1).toUpperCase() || "+"; }
function safeUrl(value: string | null) { if (!value) return null; try { const url = new URL(value); return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null; } catch { return null; } }
function safeMediaUrl(value: string | null, allowLocalPreview: boolean) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
    if (allowLocalPreview && url.protocol === "blob:") return value;
    return null;
  } catch { return null; }
}
function contrast(hex: string) { const n = Number.parseInt(hex.slice(1), 16); return (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 155 ? "#29272A" : "#FAF9F7"; }
function finishTextColor(appearance: CreatorLinkItemAppearance) {
  if (appearance.finish === "solid") return contrast(CREATOR_LINK_ITEM_COLOR_VALUES[appearance.color]);
  return ["champagne", "champagne-gold", "rose-gold", "silver"].includes(appearance.color) ? "#29272A" : "#FAF9F7";
}
function appearanceStyle(appearance: CreatorLinkItemAppearance): CSSProperties {
  const paint = CREATOR_LINK_ITEM_COLOR_VALUES[appearance.color];
  const text = finishTextColor(appearance);
  const depthShadow = appearance.depth === "raised"
    ? "0 8px 0 rgba(20,18,24,.18), 0 16px 28px rgba(20,18,24,.22), inset 0 1px 0 rgba(255,255,255,.38)"
    : appearance.depth === "soft"
      ? "0 10px 24px rgba(20,18,24,.14), inset 0 1px 0 rgba(255,255,255,.22)"
      : appearance.finish === "metallic" ? "inset 0 1px 0 rgba(255,255,255,.3)" : undefined;
  if (appearance.surface === "filled") return { background: paint, borderColor: "transparent", color: text, boxShadow: depthShadow };
  return { background: `linear-gradient(rgba(255,255,255,.10), rgba(255,255,255,.10)) padding-box, ${paint} border-box`, borderColor: "transparent", color: text, boxShadow: depthShadow };
}
function itemLabel(item: TrendreLinkCanvasItem) { if (item.itemType === "social") return item.platform === "instagram" ? "Instagram" : item.platform === "tiktok" ? "TikTok" : item.platform === "x" ? "X" : item.platform === "youtube" ? "YouTube" : "Social"; return item.title ?? "Link"; }
function itemWidth(appearance: CreatorLinkItemAppearance) { return appearance.layout === "wide" ? "w-full" : appearance.layout === "square" ? "w-[calc(50%-0.25rem)] max-w-[calc(50%-0.25rem)]" : "w-12"; }
const reorderStyles: CSSProperties = { userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none", touchAction: "none" };

function CanvasItem({ item, mode, buttonStyle, fontStyle, onEdit }: { item: TrendreLinkCanvasItem; mode: TrendreLinkCanvasMode; buttonStyle: CreatorLinkButtonStyle; fontStyle: CreatorLinkFontStyle; onEdit?: () => void }) {
  const url = safeUrl(item.url);
  const imageUrl = safeUrl(item.imageUrl);
  if (item.itemType === "heading") return item.title ? <h2 className="w-full px-1 pt-2 text-base font-semibold">{item.title}</h2> : null;
  if (item.itemType === "text") { const text = item.description ?? item.title; return text ? <div className="w-full rounded-2xl border border-current/10 bg-white/10 p-4 text-sm leading-6">{text}</div> : null; }
  if (item.itemType === "image" || item.itemType === "portfolio") {
    if (!imageUrl) return null;
    const image = <article className="w-full overflow-hidden rounded-2xl border border-current/10 bg-white/10"><img src={imageUrl} alt={item.title ?? "Creator image"} draggable={false} className="max-h-[480px] w-full object-cover" loading="lazy" decoding="async" />{item.title ? <p className="p-3 text-sm font-medium">{item.title}</p> : null}</article>;
    return item.itemType === "portfolio" && url && mode !== "edit" ? <a href={url} target="_blank" rel="noopener noreferrer" className="block w-full">{image}</a> : image;
  }
  if ((item.itemType !== "social" && item.itemType !== "link") || !url) return null;
  const appearance = normalizeCreatorLinkItemAppearance(item.metadata);
  const appearanceBaseStyle = appearanceStyle(appearance);
  const style: CSSProperties = buttonStyle === "glass"
    ? { background: "rgba(255,255,255,.16)", borderColor: "rgba(255,255,255,.48)", color: "inherit", boxShadow: "inset 0 1px 0 rgba(255,255,255,.18)", backdropFilter: "blur(14px)" }
    : buttonStyle === "pill"
      ? { ...appearanceBaseStyle, opacity: 0.88, boxShadow: "0 8px 22px rgba(24,20,28,.10)" }
      : appearanceBaseStyle;
  const label = itemLabel(item);
  const platform = item.platform && isCreatorLinkSocialPlatform(item.platform) ? item.platform : null;
  const icon = platform ? <SocialBrandIcon platform={platform} color={appearance.iconColor} /> : <LinkGlyph className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />;
  const shapeClass = buttonStyle === "pill" ? "rounded-full" : buttonStyle === "square" ? "rounded-lg" : buttonStyle === "glass" ? "rounded-2xl backdrop-blur-md" : "rounded-xl";
  const labelFontClass = fontStyle === "bold" ? "!font-black tracking-[-0.025em]" : fontStyle === "soft" ? "tracking-[0.045em]" : fontStyle === "serif" ? "font-serif" : "tracking-[-0.01em]";
  const content = appearance.layout === "icon"
    ? <div style={style} aria-label={label} className="flex h-[48px] w-[48px] items-center justify-center rounded-[14px] border"><span aria-hidden="true">{icon}</span><span className="sr-only">{label}</span></div>
    : appearance.layout === "square"
      ? <div style={style} className="flex h-[120px] w-full flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center"><span>{icon}</span><span className="line-clamp-2 text-sm font-medium">{label}</span></div>
      : <div style={style} className={`flex min-h-[60px] w-full items-center gap-3 border px-4 py-2 transition-[background-color,border-color,border-radius,box-shadow,opacity] duration-300 motion-reduce:transition-none ${shapeClass}`}><span className="flex w-6 shrink-0 items-center justify-center">{icon}</span><span className={`min-w-0 flex-1 truncate text-center text-[15px] font-semibold ${labelFontClass}`}>{label}</span><span className="w-6 shrink-0" aria-hidden="true" /></div>;
  return mode === "edit" ? <button type="button" onClick={onEdit} className="block h-full w-full">{content}</button> : <a href={url} target="_blank" rel="noopener noreferrer" aria-label={label} className="block h-full w-full">{content}</a>;
}

function SortableShell({ id, width, children }: { id: string; width: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return <div ref={setNodeRef} style={{ ...reorderStyles, transform: CSS.Transform.toString(transform), transition }} {...attributes} {...listeners} onContextMenu={(event) => event.preventDefault()} className={`${width} relative cursor-grab outline outline-1 outline-current/15 active:cursor-grabbing ${isDragging ? "z-20 -translate-y-px opacity-90 drop-shadow-sm" : "opacity-[0.96]"}`}>
    {children}<span className="pointer-events-none absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-current/50" aria-hidden="true"><DragIcon /></span>
  </div>;
}

function FormCard({ type, theme, onClick, reorder }: { type: TrendreLinkCanvasInquiryType; theme: (typeof THEMES)[CreatorLinkTheme]; onClick?: () => void; reorder?: boolean }) {
  return <button type="button" disabled={reorder} onClick={onClick} className={`flex min-h-[56px] w-full items-center justify-between rounded-2xl border px-4 text-left ${theme.panel} ${reorder ? "pr-12" : ""}`}><span className="truncate text-[15px] font-medium">{type.title}</span>{!reorder ? <span aria-hidden="true" className={theme.subtle}>›</span> : null}</button>;
}

export default function TrendreLinkCanvas({ data, mode, locale = "ja", editingField = null, onEditingFieldChange, onDisplayNameChange, onBioChange, onEditProfile, onEditInquirySettings, onAddFirstLink, onEditItem, onReorderItems, onReorderInquiryTypes }: CanvasProps) {
  const { page, items } = data;
  const [reorderMode, setReorderMode] = useState(false);
  const [selectedForm, setSelectedForm] = useState<{ id: string; kind: CreatorLinkInquiryFormKind; title: string } | null>(null);
  const [showFormChoices, setShowFormChoices] = useState(false);
  useEffect(() => { if (mode !== "edit") setReorderMode(false); }, [mode]);
  const preset = findLinkDesignBackgroundPreset(page);
  const baseTheme = THEMES[page.themeKey];
  const accentForeground = page.accentColor ? contrast(page.accentColor) : null;
  const theme = page.coverUrl
    ? baseTheme
    : preset
      ? (preset.foreground === "light" ? THEMES["minimal-black"] : THEMES["soft-ivory"])
      : accentForeground
        ? (accentForeground === "#29272A" ? THEMES["soft-ivory"] : THEMES["minimal-black"])
        : baseTheme;
  const isEdit = mode === "edit";
  const avatarUrl = safeMediaUrl(page.avatarUrl, mode !== "public");
  const coverUrl = safeMediaUrl(page.coverUrl, mode !== "public");
  const fontClass = page.fontStyle === "serif" ? "font-serif" : page.fontStyle === "bold" ? "font-sans font-bold tracking-[-0.025em]" : page.fontStyle === "soft" ? "font-sans tracking-[0.035em]" : "font-sans tracking-[-0.01em]";
  const headingFontClass = page.fontStyle === "bold" ? "!font-black tracking-[-0.045em]" : page.fontStyle === "soft" ? "tracking-[0.035em]" : page.fontStyle === "serif" ? "font-serif" : "tracking-[-0.02em]";
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 10 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const socialItems = items.filter((item) => item.itemType === "social" && item.platform && safeUrl(item.url));
  const contentItems = items.filter((item) => item.itemType !== "social");
  const canSortItems = reorderMode && contentItems.length > 0 && contentItems.every((item) => Boolean(item.id));
  const enabledForms = data.inquiryTypes.filter((type) => type.templateKey === null || type.templateKey === "pr_post").sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  useEffect(() => {
    if (mode !== "public" || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("resume") !== "inquiry") return;
    const draft = parseInquiryDraft(
      safeSessionStorageGet(inquiryDraftStorageKey(page.slug)),
      { slug: page.slug }
    );
    const formType = draft
      ? enabledForms.find((type) => type.id === draft.formId)
      : null;
    url.searchParams.delete("resume");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    if (draft && formType) {
      const selection = createCreatorLinkInquiryFormSelection(formType);
      if (selection && draft.kind === selection.kind) {
        setSelectedForm(selection);
      }
    }
  }, [data.inquiryTypes, mode, page.slug]);
  const canSortForms = reorderMode && enabledForms.length > 1 && enabledForms.every((type) => Boolean(type.id));
  const copy = locale === "ja" ? { editName: "表示名を編集", editPhoto: "プロフィール写真を編集", addPhoto: "写真を追加", addName: "名前を追加", addBio: "自己紹介を追加", firstLinkTitle: "リンクを追加", firstLinkHelp: "あなたの活動が伝わるリンクを追加しましょう", inquiries: "仕事の依頼・相談", inquiryHelp: "PR・UGC制作などのご相談はこちら", chooseInquiry: "相談内容を選択", reorder: "並び替え", reordering: "並び替え中", done: "完了" } : { editName: "Edit display name", editPhoto: "Edit profile photo", addPhoto: "Add photo", addName: "Add name", addBio: "Add a bio", firstLinkTitle: "Add a link", firstLinkHelp: "Add a link that shows what you create", inquiries: "Work with me", inquiryHelp: "PR, UGC, and collaboration inquiries", chooseInquiry: "Choose an inquiry type", reorder: "Reorder", reordering: "Reordering", done: "Done" };
  const usesLogicalCanvas = mode === "preview" || mode === "public";
  const profileTopPadding = usesLogicalCanvas ? "pt-[5.5rem]" : "pt-12";
  const canvasBottomPadding = usesLogicalCanvas ? "pb-6" : "pb-[calc(6.75rem+env(safe-area-inset-bottom))]";
  const backgroundStyle = coverUrl
    ? { backgroundImage: `url(${JSON.stringify(coverUrl).slice(1, -1)})`, backgroundSize: "cover", backgroundPosition: "center" }
    : preset
      ? { background: preset.background, color: preset.foreground === "light" ? "#FAF9F7" : "#29272A" }
      : page.accentColor
        ? { background: page.accentColor, color: accentForeground ?? undefined }
        : undefined;
  const clearSelection = () => document.getSelection()?.removeAllRanges();
  const openForm = (type: TrendreLinkCanvasInquiryType) => {
    if (isEdit) onEditInquirySettings?.();
    else {
      const selection = createCreatorLinkInquiryFormSelection(type);
      if (selection) setSelectedForm(selection);
    }
  };

  return <div style={{ ...backgroundStyle, ...(usesLogicalCanvas ? { minHeight: `${TRENDRE_LINK_LOGICAL_CANVAS_HEIGHT}px`, width: `${TRENDRE_LINK_LOGICAL_CANVAS_WIDTH}px` } : {}) }} className={`relative min-h-[100dvh] w-full overflow-x-hidden ${theme.shell} ${fontClass}`}>
    {!coverUrl && preset?.backgroundImage ? <div className={`pointer-events-none absolute inset-x-0 top-0 overflow-hidden ${usesLogicalCanvas ? "h-[1040px]" : "bottom-0"}`} aria-hidden="true"><img src={preset.backgroundImage} alt="" loading="lazy" decoding="async" draggable={false} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: preset.backgroundPosition ?? "center", filter: preset.backgroundFilter, transform: preset.backgroundScale ? `scale(${preset.backgroundScale})` : undefined }} />{preset.backgroundOverlay ? <div className="absolute inset-0" style={{ background: preset.backgroundOverlay }} /> : null}</div> : null}
    {coverUrl ? <div className={`pointer-events-none absolute inset-0 ${page.themeKey === "night-purple" || page.themeKey === "minimal-black" ? "bg-black/45" : "bg-white/40"}`} /> : null}
    <div className={`relative z-[1] mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col ${usesLogicalCanvas ? "min-h-[1040px]" : ""} ${canvasBottomPadding}`}>
      <section className={`${profileTopPadding} px-[18px] text-center transition-[padding] duration-300 motion-reduce:transition-none ${isEdit && !editingField ? "opacity-[0.94] saturate-[0.94]" : ""}`}><div className="relative mx-auto w-fit"><div className={`flex h-[86px] w-[86px] items-center justify-center overflow-hidden rounded-full text-[29px] font-medium shadow-sm ring-1 ring-white/25 ${avatarUrl ? "" : theme.button}`}>{avatarUrl ? <img src={avatarUrl} alt={page.displayName || "Creator profile"} draggable={false} className="h-full w-full object-cover" /> : getInitial(page.displayName)}</div>{isEdit ? <button type="button" onClick={onEditProfile} className={`absolute -bottom-1 -right-1 flex h-11 w-11 items-center justify-center rounded-full ${theme.subtle}`} aria-label={copy.editPhoto}><span className={`flex h-7 w-7 items-center justify-center rounded-full border shadow-sm ${theme.edit}`}><PencilIcon /></span></button> : null}</div>
        {isEdit && !avatarUrl ? <button type="button" onClick={onEditProfile} className={`mt-1 min-h-11 px-3 text-xs font-medium ${theme.subtle}`}>{copy.addPhoto}</button> : null}
        <div className={`relative mx-auto max-w-sm ${isEdit && !avatarUrl ? "mt-0" : page.themeKey === "night-purple" ? "mt-5" : "mt-4"}`}>{isEdit && editingField === "displayName" ? <input autoFocus value={page.displayName} maxLength={80} onChange={(e) => onDisplayNameChange?.(e.target.value)} onBlur={() => onEditingFieldChange?.(null)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") onEditingFieldChange?.(null); }} style={page.displayNameColor ? { color: page.displayNameColor } : undefined} className={`w-full rounded-xl border px-3 py-2 text-center text-[23px] font-medium outline-none ${theme.edit}`} /> : isEdit ? <button type="button" onClick={() => onEditingFieldChange?.("displayName")} style={page.displayNameColor ? { color: page.displayNameColor } : undefined} className={`inline-flex min-h-11 max-w-full items-center gap-1.5 font-medium ${headingFontClass} ${page.themeKey === "minimal-black" ? "text-[27px] uppercase" : page.themeKey === "night-purple" ? "text-[25px]" : "text-[23px]"}`}><span className="truncate">{page.displayName || copy.addName}</span><span className={theme.subtle}><PencilIcon /></span></button> : <h1 style={page.displayNameColor ? { color: page.displayNameColor } : undefined} className={`font-medium ${headingFontClass} ${page.themeKey === "minimal-black" ? "text-[27px] uppercase" : page.themeKey === "night-purple" ? "text-[25px]" : "text-[23px]"}`}>{page.displayName}</h1>}</div>
        <div className="relative mx-auto mt-2.5 max-w-sm">{isEdit && editingField === "bio" ? <textarea autoFocus value={page.bio ?? ""} maxLength={500} rows={3} onChange={(e) => onBioChange?.(e.target.value)} onBlur={() => onEditingFieldChange?.(null)} className={`w-full resize-none rounded-xl border px-3 py-2 text-center text-sm leading-6 outline-none ${theme.edit}`} /> : isEdit && !page.bio ? <button type="button" onClick={() => onEditingFieldChange?.("bio")} className={`min-h-10 rounded-xl border border-dashed px-4 text-sm ${theme.edit}`}>{copy.addBio}</button> : page.bio ? <button type="button" disabled={!isEdit} onClick={() => onEditingFieldChange?.("bio")} className={`inline-flex items-start gap-1.5 whitespace-pre-line text-sm leading-6 ${theme.muted}`}>{page.bio}{isEdit ? <span className="mt-1.5"><PencilIcon /></span> : null}</button> : null}</div>
        {socialItems.length ? <div className="mx-auto mt-4 flex max-w-sm flex-wrap items-center justify-center gap-1">{socialItems.map((item, index) => { const platform = item.platform && isCreatorLinkSocialPlatform(item.platform) ? item.platform : null; const url = safeUrl(item.url); if (!platform || !url) return null; const label = itemLabel(item); const sample = item.id?.startsWith("guest-sample-social-") ?? false; const iconColor = normalizeCreatorLinkItemAppearance(item.metadata).iconColor; return isEdit ? <button key={item.id ?? `${platform}-${index}`} type="button" onClick={() => onEditItem?.(item)} aria-label={`${label}を編集`} className={`flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${sample ? "opacity-35 grayscale" : ""}`}><SocialBrandIcon platform={platform} brand={!iconColor} color={iconColor} className="h-[21px] w-[21px]" /></button> : <a key={item.id ?? `${platform}-${index}`} href={url} target="_blank" rel="noopener noreferrer" aria-label={label} className={`flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${sample ? "opacity-35 grayscale" : ""}`}><SocialBrandIcon platform={platform} brand={!iconColor} color={iconColor} className="h-[21px] w-[21px]" /></a>; })}</div> : null}
      </section>

      {(contentItems.length > 0 || isEdit) ? <section className="px-[18px] pt-7">{isEdit && (contentItems.length > 0 || enabledForms.length > 1) ? <div className="mb-2 flex h-9 items-center justify-end gap-2"><span className={`text-xs ${theme.subtle}`}>{reorderMode ? copy.reordering : ""}</span><button type="button" onClick={() => setReorderMode((value) => !value)} className={`flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-medium ${theme.subtle}`}>{reorderMode ? copy.done : <><DragIcon />{copy.reorder}</>}</button></div> : null}
        {contentItems.length > 0 ? canSortItems ? <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={clearSelection} onDragEnd={(event: DragEndEvent) => { clearSelection(); const { active, over } = event; if (!over || active.id === over.id) return; const from = contentItems.findIndex((item) => item.id === active.id); const to = contentItems.findIndex((item) => item.id === over.id); if (from >= 0 && to >= 0) onReorderItems?.(arrayMove(contentItems, from, to)); }}><SortableContext items={contentItems.map((item) => item.id ?? "")} strategy={rectSortingStrategy}><div className="flex flex-wrap gap-3">{contentItems.map((item) => <SortableShell key={item.id} id={item.id!} width={itemWidth(normalizeCreatorLinkItemAppearance(item.metadata))}><CanvasItem item={item} mode="edit" buttonStyle={page.buttonStyle} fontStyle={page.fontStyle} /></SortableShell>)}</div></SortableContext></DndContext> : <div className={`flex flex-wrap gap-3 ${isEdit ? "opacity-[0.94] saturate-[0.94]" : ""}`}>{contentItems.map((item, index) => <div key={item.id ?? `${item.itemType}-${index}`} className={itemWidth(normalizeCreatorLinkItemAppearance(item.metadata))}><CanvasItem item={item} mode={mode} buttonStyle={page.buttonStyle} fontStyle={page.fontStyle} onEdit={() => onEditItem?.(item)} /></div>)}</div> : isEdit ? <button type="button" onClick={onAddFirstLink} className={`flex min-h-[72px] w-full items-center gap-3 rounded-2xl border border-dashed px-4 py-3 text-left ${theme.edit}`}><span className="text-xl" aria-hidden="true">＋</span><span><strong className="block text-sm font-medium">{copy.firstLinkTitle}</strong><span className={`mt-0.5 block text-xs ${theme.subtle}`}>{copy.firstLinkHelp}</span></span></button> : null}
      </section> : null}

      {page.isAcceptingInquiries && enabledForms.length ? <section className="px-[18px] pt-7">{isEdit ? <><h2 className="mb-2 px-1 text-base font-medium">{copy.inquiries}</h2>{canSortForms ? <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={clearSelection} onDragEnd={(event: DragEndEvent) => { clearSelection(); const { active, over } = event; if (!over || active.id === over.id) return; const from = enabledForms.findIndex((type) => type.id === active.id); const to = enabledForms.findIndex((type) => type.id === over.id); if (from >= 0 && to >= 0) onReorderInquiryTypes?.(arrayMove(enabledForms, from, to)); }}><SortableContext items={enabledForms.map((type) => type.id!)} strategy={rectSortingStrategy}><div className="space-y-2">{enabledForms.map((type) => <SortableShell key={type.id} id={type.id!} width="w-full"><FormCard type={type} theme={theme} reorder /></SortableShell>)}</div></SortableContext></DndContext> : <div className="space-y-2 opacity-[0.94] saturate-[0.94]">{enabledForms.map((type, index) => <FormCard key={type.id ?? `${type.templateKey ?? "simple"}-${index}`} type={type} theme={theme} onClick={() => openForm(type)} />)}</div>}</> : <div>
        <button type="button" onClick={() => enabledForms.length === 1 ? openForm(enabledForms[0]) : setShowFormChoices((value) => !value)} aria-expanded={enabledForms.length > 1 ? showFormChoices : undefined} className={`flex min-h-[64px] w-full items-center gap-3 border px-4 text-left transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${theme.button} ${page.buttonStyle === "pill" ? "rounded-full" : page.buttonStyle === "square" ? "rounded-lg" : "rounded-2xl"}`}><BriefcaseBusiness className="h-5 w-5 shrink-0" aria-hidden="true" /><span className="min-w-0 flex-1"><strong className="block text-[15px] font-semibold">{copy.inquiries}</strong><span className="mt-0.5 block truncate text-xs opacity-70">{copy.inquiryHelp}</span></span><ChevronRight className={`h-5 w-5 shrink-0 transition ${showFormChoices ? "rotate-90" : ""}`} aria-hidden="true" /></button>
        {showFormChoices && enabledForms.length > 1 ? <div className="mt-2 space-y-2" aria-label={copy.chooseInquiry}>{enabledForms.map((type, index) => <button key={type.id ?? `${type.templateKey ?? "simple"}-${index}`} type="button" onClick={() => openForm(type)} className={`flex min-h-[52px] w-full items-center justify-between rounded-xl border px-4 text-left text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${theme.panel}`}><span className="truncate">{type.title}</span><ChevronRight className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" /></button>)}</div> : null}
      </div>}</section> : null}
      <footer className={`mt-auto px-5 pb-1 pt-10 text-center text-xs font-medium ${theme.subtle}`}>Powered by Trendre</footer>
    </div>
    {selectedForm ? <InquiryFormModal key={`${selectedForm.id}-${selectedForm.kind}`} formId={selectedForm.id} kind={selectedForm.kind} title={selectedForm.title} slug={page.slug} mode={mode === "public" ? "public" : "preview"} locale={locale} onClose={() => setSelectedForm(null)} /> : null}
  </div>;
}

export { THEMES as TRENDRE_LINK_CANVAS_THEMES };
