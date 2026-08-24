"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { closestCenter, DndContext, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, horizontalListSortingStrategy, rectSortingStrategy, sortableKeyboardCoordinates, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BriefcaseBusiness, ChevronRight, Link as LinkGlyph } from "lucide-react";
import InquiryFormModal from "@/components/trendre-link/InquiryFormModal";
import SocialBrandIcon from "@/components/trendre-link/SocialBrandIcon";
import ServiceIcon from "@/components/trendre-link/ServiceIcon";
import { findLinkDesignBackgroundPreset } from "@/lib/trendre-link/link-design-presets";
import type { CreatorLinkButtonStyle, CreatorLinkFontStyle, CreatorLinkItemType, CreatorLinkTheme } from "@/lib/trendre-link/constants";
import { CREATOR_LINK_ITEM_COLOR_VALUES, getCreatorLinkSocialRenderStyle, isCreatorLinkSocialPlatform, normalizeCreatorLinkItemAppearance, resolveCreatorLinkItemShape, resolveCreatorLinkSocialAppearance, type CreatorLinkItemAppearance, type CreatorLinkItemStyle } from "@/lib/trendre-link/item-validation";
import { getCreatorLinkServiceKeyFromMetadata } from "@/lib/trendre-link/service-registry";
import type { CreatorLinkInquiryFormKind } from "@/lib/trendre-link/inquiry-forms";
import { inquiryDraftStorageKey, parseInquiryDraft, safeSessionStorageGet } from "@/lib/trendre-link/inquiry-return";
import { createCreatorLinkInquiryFormSelection } from "@/lib/trendre-link/public-inquiry-types";
import { parseCreatorLinkBackgroundReference } from "@/lib/trendre-link/background-selection";
import { normalizeCreatorLinkLayoutOrder, reorderVisibleCreatorLinkLayoutOrder, type CreatorLinkLayoutToken } from "@/lib/trendre-link/layout-order";
import { reorderCreatorLinkSocialItems } from "@/lib/trendre-link/social-order";

export const TRENDRE_LINK_LOGICAL_CANVAS_WIDTH = 480;
export const TRENDRE_LINK_LOGICAL_CANVAS_HEIGHT = 1040;

export type TrendreLinkCanvasMode = "edit" | "preview" | "public";
export type TrendreLinkEditableField = "displayName" | "bio" | null;
export type TrendreLinkCanvasSelection = { kind: "profile" | "social" | "link" | "work"; itemId?: string } | null;
export type TrendreLinkCanvasItem = { id?: string; sortOrder?: number; itemType: CreatorLinkItemType; platform: string | null; title: string | null; description: string | null; url: string | null; imageUrl: string | null; metadata: CreatorLinkItemAppearance };
export type TrendreLinkCanvasInquiryType = { id?: string; sortOrder?: number; templateKey: string | null; title: string; description: string | null; isCustom?: boolean };
export type TrendreLinkCanvasData = {
  page: { slug: string; displayName: string; displayNameColor: string | null; bio: string | null; avatarUrl: string | null; coverUrl: string | null; themeKey: CreatorLinkTheme; accentColor: string | null; buttonStyle: CreatorLinkButtonStyle; fontStyle: CreatorLinkFontStyle; isAcceptingInquiries: boolean; layoutOrder?: CreatorLinkLayoutToken[] | null };
  layoutLinkIds?: string[];
  items: TrendreLinkCanvasItem[];
  inquiryTypes: TrendreLinkCanvasInquiryType[];
};

type CanvasProps = {
  data: TrendreLinkCanvasData;
  mode: TrendreLinkCanvasMode;
  forceLogicalDimensions?: boolean;
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
  onReorderLayoutOrder?: (order: CreatorLinkLayoutToken[]) => void;
  onReorderSocialItems?: (items: TrendreLinkCanvasItem[]) => void;
  selectedTarget?: TrendreLinkCanvasSelection;
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
function explicitItemStyle(appearance: CreatorLinkItemAppearance, style: CreatorLinkItemStyle): CSSProperties {
  if (style === "glass") return { background: "rgba(255,255,255,.18)", borderColor: "rgba(255,255,255,.5)", color: "inherit", boxShadow: "inset 0 1px 0 rgba(255,255,255,.22), 0 10px 26px rgba(20,18,24,.12)", backdropFilter: "blur(14px)" };
  if (style === "outline") return appearanceStyle({ ...appearance, surface: "outline", depth: "normal" });
  if (style === "soft") return { ...appearanceStyle({ ...appearance, surface: "filled", depth: "soft" }), opacity: 0.88 };
  if (style === "shadow") return appearanceStyle({ ...appearance, surface: "filled", depth: "raised" });
  return appearanceStyle({ ...appearance, surface: "filled", depth: "normal" });
}
function itemShapeClass(appearance: CreatorLinkItemAppearance, buttonStyle: CreatorLinkButtonStyle) {
  const shape = resolveCreatorLinkItemShape(appearance, buttonStyle);
  return shape === "pill" ? "rounded-full" : shape === "rounded" ? "rounded-2xl" : shape === "soft-square" ? "rounded-lg" : "rounded-none";
}
function itemLabel(item: TrendreLinkCanvasItem) { if (item.itemType === "social") return item.platform === "instagram" ? "Instagram" : item.platform === "tiktok" ? "TikTok" : item.platform === "x" ? "X" : item.platform === "youtube" ? "YouTube" : "Social"; return item.title ?? "Link"; }
function itemWidth(appearance: CreatorLinkItemAppearance) { return appearance.layout === "wide" ? "w-full" : appearance.layout === "square" ? "w-[calc(50%-0.25rem)] max-w-[calc(50%-0.25rem)]" : "w-12"; }
const reorderStyles: CSSProperties = { userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none", touchAction: "none" };

function CanvasItem({ item, mode, buttonStyle, fontStyle, onEdit, selected = false }: { item: TrendreLinkCanvasItem; mode: TrendreLinkCanvasMode; buttonStyle: CreatorLinkButtonStyle; fontStyle: CreatorLinkFontStyle; onEdit?: () => void; selected?: boolean }) {
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
  const style: CSSProperties = appearance.style
    ? explicitItemStyle(appearance, appearance.style)
    : buttonStyle === "glass"
      ? { background: "rgba(255,255,255,.16)", borderColor: "rgba(255,255,255,.48)", color: "inherit", boxShadow: "inset 0 1px 0 rgba(255,255,255,.18)", backdropFilter: "blur(14px)" }
      : buttonStyle === "pill"
        ? { ...appearanceBaseStyle, opacity: 0.88, boxShadow: "0 8px 22px rgba(24,20,28,.10)" }
        : appearanceBaseStyle;
  const label = itemLabel(item);
  const platform = item.platform && isCreatorLinkSocialPlatform(item.platform) ? item.platform : null;
  const serviceKey = item.itemType === "link" ? getCreatorLinkServiceKeyFromMetadata(item.metadata) : null;
  const icon = platform ? <SocialBrandIcon platform={platform} color={appearance.iconColor} /> : serviceKey && serviceKey !== "custom" ? <ServiceIcon serviceKey={serviceKey} brand /> : <LinkGlyph className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />;
  const shapeClass = appearance.shape ? itemShapeClass(appearance, buttonStyle) : buttonStyle === "pill" ? "rounded-full" : buttonStyle === "square" ? "rounded-lg" : buttonStyle === "glass" ? "rounded-2xl" : "rounded-xl";
  const compactShapeClass = appearance.shape ? itemShapeClass(appearance, buttonStyle) : appearance.layout === "icon" ? "rounded-[14px]" : "rounded-2xl";
  const labelFontClass = fontStyle === "bold" ? "!font-black tracking-[-0.025em]" : fontStyle === "soft" ? "tracking-[0.045em]" : fontStyle === "serif" ? "font-serif" : "tracking-[-0.01em]";
  const content = appearance.layout === "icon"
    ? <div style={style} aria-label={label} className={`flex h-[48px] w-[48px] items-center justify-center border ${compactShapeClass}`}><span aria-hidden="true">{icon}</span><span className="sr-only">{label}</span></div>
    : appearance.layout === "square"
      ? <div style={style} className={`flex h-[120px] w-full flex-col items-center justify-center gap-2 border p-3 text-center ${compactShapeClass}`}><span>{icon}</span><span className="line-clamp-2 text-sm font-medium">{label}</span></div>
      : <div style={style} className={`flex min-h-[60px] w-full items-center gap-3 border px-4 py-2 transition-[background-color,border-color,border-radius,box-shadow,opacity] duration-300 motion-reduce:transition-none ${shapeClass}`}><span className="flex w-6 shrink-0 items-center justify-center">{icon}</span><span className={`min-w-0 flex-1 truncate text-center text-[15px] font-semibold ${labelFontClass}`}>{label}</span><span className="w-6 shrink-0" aria-hidden="true" /></div>;
  return mode === "edit" ? <button type="button" onClick={onEdit} className={`block h-full w-full rounded-[inherit] transition-shadow ${selected ? "ring-2 ring-current ring-offset-2 ring-offset-transparent" : ""}`}>{content}</button> : <a href={url} target="_blank" rel="noopener noreferrer" aria-label={label} className="block h-full w-full">{content}</a>;
}

function SortableShell({ id, width, children, label, handleOnly = false }: { id: string; width: string; children: ReactNode; label?: string; handleOnly?: boolean }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const shellListeners = handleOnly ? {} : listeners;
  const shellAttributes = handleOnly ? {} : attributes;
  return <div ref={setNodeRef} style={{ ...reorderStyles, transform: CSS.Transform.toString(transform), transition }} {...shellAttributes} {...shellListeners} aria-label={handleOnly ? undefined : label} onContextMenu={(event) => event.preventDefault()} className={`${width} relative rounded-[inherit] outline outline-1 outline-current/15 transition-[opacity,filter] ${handleOnly ? "" : "cursor-grab active:cursor-grabbing"} ${isDragging ? "z-20 -translate-y-px opacity-90 drop-shadow-sm" : "opacity-[0.96]"}`}>
    {children}{handleOnly ? <button ref={setActivatorNodeRef} type="button" {...attributes} {...listeners} aria-label={label} className="absolute right-1 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 touch-none items-center justify-center rounded-full text-current/55 outline-none hover:bg-current/10 focus-visible:ring-2 focus-visible:ring-current/40"><DragIcon /></button> : <span className="pointer-events-none absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-current/50" aria-hidden="true"><DragIcon /></span>}
  </div>;
}

function SortableSocialCanvasItem({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, touchAction: "pan-y" }} {...attributes} {...listeners} aria-label={`${label}を並び替え`} onContextMenu={(event) => event.preventDefault()} className={`relative cursor-grab rounded-[inherit] active:cursor-grabbing ${isDragging ? "z-30 -translate-y-px scale-[1.03] opacity-90 drop-shadow-md" : "transition-[opacity,filter]"}`}>{children}</div>;
}

export default function TrendreLinkCanvas({ data, mode, forceLogicalDimensions = false, locale = "ja", editingField = null, onEditingFieldChange, onDisplayNameChange, onEditProfile, onEditInquirySettings, onAddFirstLink, onEditItem, onReorderLayoutOrder, onReorderSocialItems, selectedTarget = null }: CanvasProps) {
  const { page, items } = data;
  const [selectedForm, setSelectedForm] = useState<{ id: string; kind: CreatorLinkInquiryFormKind; title: string } | null>(null);
  const [showFormChoices, setShowFormChoices] = useState(false);
  const suppressEditRef = useRef(false);
  const referencedBackground = parseCreatorLinkBackgroundReference(page.coverUrl);
  const preset = referencedBackground ?? findLinkDesignBackgroundPreset(page);
  const isEdit = mode === "edit";
  const avatarUrl = safeMediaUrl(page.avatarUrl, mode !== "public");
  const coverUrl = referencedBackground ? null : safeMediaUrl(page.coverUrl, mode !== "public");
  const baseTheme = THEMES[page.themeKey];
  const accentForeground = page.accentColor ? contrast(page.accentColor) : null;
  const theme = coverUrl
    ? baseTheme
    : preset
      ? (preset.foreground === "light" ? THEMES["minimal-black"] : THEMES["soft-ivory"])
      : accentForeground
        ? (accentForeground === "#29272A" ? THEMES["soft-ivory"] : THEMES["minimal-black"])
        : baseTheme;
  const fontClass = page.fontStyle === "serif" ? "font-serif" : page.fontStyle === "bold" ? "font-sans font-bold tracking-[-0.025em]" : page.fontStyle === "soft" ? "font-sans tracking-[0.035em]" : "font-sans tracking-[-0.01em]";
  const headingFontClass = page.fontStyle === "bold" ? "!font-black tracking-[-0.045em]" : page.fontStyle === "soft" ? "tracking-[0.035em]" : page.fontStyle === "serif" ? "font-serif" : "tracking-[-0.02em]";
  const displayNameStyle: CSSProperties = {
    ...(page.displayNameColor ? { color: page.displayNameColor } : {}),
    ...((coverUrl || preset?.backgroundImage) ? { textShadow: theme === THEMES["minimal-black"] ? "0 2px 12px rgba(0,0,0,.52)" : "0 2px 12px rgba(255,255,255,.62)" } : {}),
  };
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 240, tolerance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const socialSensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 240, tolerance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const socialItems = items.filter((item) => item.itemType === "social" && item.platform && safeUrl(item.url));
  const linkItems = items.filter((item) => item.itemType === "link" && item.id);
  const unmanagedContentItems = items.filter((item) => item.itemType !== "social" && item.itemType !== "link");
  const enabledForms = data.inquiryTypes.filter((type) => type.templateKey === null).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
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
  const copy = locale === "ja" ? { editName: "表示名を編集", editPhoto: "プロフィール写真を編集", addPhoto: "写真を追加", addName: "名前を追加", addBio: "自己紹介を追加", firstLinkTitle: "リンクを追加", firstLinkHelp: "あなたの活動が伝わるリンクを追加しましょう", inquiries: "仕事の相談", inquiryHelp: "お仕事やコラボレーションのご相談はこちら", chooseInquiry: "相談内容を選択", reorder: "並び替え", reordering: "並び替え中", done: "完了" } : { editName: "Edit display name", editPhoto: "Edit profile photo", addPhoto: "Add photo", addName: "Add name", addBio: "Add a bio", firstLinkTitle: "Add a link", firstLinkHelp: "Add a link that shows what you create", inquiries: "Work inquiries", inquiryHelp: "For work and collaboration inquiries", chooseInquiry: "Choose an inquiry type", reorder: "Reorder", reordering: "Reordering", done: "Done" };
  const usesLogicalSpacing = mode === "preview" || mode === "public";
  const usesLogicalDimensions = usesLogicalSpacing || forceLogicalDimensions;
  const profileTopPadding = usesLogicalSpacing ? "pt-[5.5rem]" : "pt-12";
  const canvasBottomPadding = usesLogicalSpacing ? "pb-6" : "pb-[calc(6.75rem+env(safe-area-inset-bottom))]";
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
  const effectiveLayoutOrder = normalizeCreatorLinkLayoutOrder(
    page.layoutOrder,
    data.layoutLinkIds ?? linkItems.map((item) => item.id!).filter(Boolean),
  );
  const linkItemsByToken = new Map(linkItems.map((item) => [`link:${item.id}` as const, item]));
  const visibleLayoutOrder = effectiveLayoutOrder.filter((token) => {
    if (token === "social") return socialItems.length > 0;
    if (token === "work") return page.isAcceptingInquiries && enabledForms.length > 0;
    return linkItemsByToken.has(token);
  });
  const finishTopLevelDrag = () => {
    window.setTimeout(() => { suppressEditRef.current = false; }, 80);
  };
  const renderSocialItem = (item: TrendreLinkCanvasItem, index: number) => {
    const platform = item.platform && isCreatorLinkSocialPlatform(item.platform) ? item.platform : null;
    const url = safeUrl(item.url);
    if (!platform || !url) return null;
    const label = itemLabel(item);
    const sample = item.id?.startsWith("guest-sample-social-") ?? false;
    const appearance = normalizeCreatorLinkItemAppearance(item.metadata);
    const resolvedSocial = resolveCreatorLinkSocialAppearance(appearance);
    const legacyStyle = appearance.socialStyle ?? "icons";
    const presentation = resolvedSocial?.shape ?? (legacyStyle === "glass" ? "circle" : legacyStyle);
    const iconColor = resolvedSocial?.iconColor ?? appearance.iconColor;
    const configuredSurface = appearance.socialSurface;
    const surfaceKind = configuredSurface ?? (legacyStyle === "glass" ? "glass" : null);
    const legacySurfaceColor = appearance.surfaceColor ?? CREATOR_LINK_ITEM_COLOR_VALUES[appearance.color];
    const surface = resolvedSocial ? "" : surfaceKind === "glass" ? "border border-white/45 shadow-sm backdrop-blur-md" : surfaceKind === "solid" ? "border border-transparent shadow-sm" : configuredSurface === "none" ? "border border-transparent" : legacyStyle === "circle" || legacyStyle === "pill" ? "border border-current/15 bg-current/10" : "";
    const surfaceStyle: CSSProperties | undefined = resolvedSocial ? getCreatorLinkSocialRenderStyle(resolvedSocial) : surfaceKind === "glass" ? { background: "rgba(255,255,255,.2)" } : surfaceKind === "solid" ? { background: legacySurfaceColor, color: appearance.iconColor ?? finishTextColor(appearance) } : undefined;
    const size = presentation === "pill" ? "min-h-11 rounded-full px-3" : presentation === "circle" ? "h-11 w-11 rounded-full" : "min-h-11 min-w-11";
    const selected = isEdit && selectedTarget?.kind === "social" && selectedTarget.itemId === item.id;
    const content = <><SocialBrandIcon platform={platform} brand={!iconColor} color={iconColor} className="h-[21px] w-[21px]" />{presentation === "pill" ? <span className="ml-2 text-xs font-semibold">{label}</span> : null}</>;
    const selectedClass = selected ? "relative after:pointer-events-none after:absolute after:-right-0.5 after:-top-0.5 after:h-2 after:w-2 after:rounded-full after:bg-[#ED5964] after:ring-2 after:ring-white after:content-['']" : "";
    const className = `flex items-center justify-center transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ED5964] ${size} ${surface} ${selectedClass} ${sample ? "opacity-35 grayscale" : ""}`;
    return isEdit ? <button key={item.id ?? `${platform}-${index}`} type="button" onClick={() => { if (!suppressEditRef.current) onEditItem?.(item); }} aria-label={`${label}を編集`} className={className} style={surfaceStyle}>{content}</button> : <a key={item.id ?? `${platform}-${index}`} href={url} target="_blank" rel="noopener noreferrer" aria-label={label} className={className} style={surfaceStyle}>{content}</a>;
  };
  const canReorderSocialItems = isEdit && Boolean(onReorderSocialItems) && socialItems.length > 1 && socialItems.every((item) => Boolean(item.id));
  const socialBlock = canReorderSocialItems
    ? <DndContext sensors={socialSensors} collisionDetection={closestCenter} onDragStart={() => { suppressEditRef.current = true; clearSelection(); }} onDragCancel={finishTopLevelDrag} onDragEnd={(event: DragEndEvent) => { const { active, over } = event; if (over && active.id !== over.id) onReorderSocialItems?.(reorderCreatorLinkSocialItems(socialItems, String(active.id), String(over.id))); finishTopLevelDrag(); }}><SortableContext items={socialItems.map((item) => item.id!)} strategy={horizontalListSortingStrategy}><div className="flex min-h-11 w-full flex-wrap items-center justify-center gap-2 px-10">{socialItems.map((item, index) => <SortableSocialCanvasItem key={item.id} id={item.id!} label={itemLabel(item)}>{renderSocialItem(item, index)}</SortableSocialCanvasItem>)}</div></SortableContext></DndContext>
    : <div className="flex min-h-11 w-full flex-wrap items-center justify-center gap-2 px-10">{socialItems.map(renderSocialItem)}</div>;
  const workBlock = isEdit
    ? <button type="button" onClick={() => { if (!suppressEditRef.current) onEditInquirySettings?.(); }} className={`flex min-h-[64px] w-full items-center gap-3 border px-4 pr-12 text-left transition ${theme.button} ${page.buttonStyle === "pill" ? "rounded-full" : page.buttonStyle === "square" ? "rounded-lg" : "rounded-2xl"}`}><BriefcaseBusiness className="h-5 w-5 shrink-0" aria-hidden="true" /><span className="min-w-0 flex-1"><strong className="block text-[15px] font-semibold">{copy.inquiries}</strong><span className="mt-0.5 block truncate text-xs opacity-70">{copy.inquiryHelp}</span></span></button>
    : <div><button type="button" onClick={() => enabledForms.length === 1 ? openForm(enabledForms[0]) : setShowFormChoices((value) => !value)} aria-expanded={enabledForms.length > 1 ? showFormChoices : undefined} className={`flex min-h-[64px] w-full items-center gap-3 border px-4 text-left transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${theme.button} ${page.buttonStyle === "pill" ? "rounded-full" : page.buttonStyle === "square" ? "rounded-lg" : "rounded-2xl"}`}><BriefcaseBusiness className="h-5 w-5 shrink-0" aria-hidden="true" /><span className="min-w-0 flex-1"><strong className="block text-[15px] font-semibold">{copy.inquiries}</strong><span className="mt-0.5 block truncate text-xs opacity-70">{copy.inquiryHelp}</span></span><ChevronRight className={`h-5 w-5 shrink-0 transition ${showFormChoices ? "rotate-90" : ""}`} aria-hidden="true" /></button>{showFormChoices && enabledForms.length > 1 ? <div className="mt-2 space-y-2" aria-label={copy.chooseInquiry}>{enabledForms.map((type, index) => <button key={type.id ?? `${type.templateKey ?? "simple"}-${index}`} type="button" onClick={() => openForm(type)} className={`flex min-h-[52px] w-full items-center justify-between rounded-xl border px-4 text-left text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${theme.panel}`}><span className="truncate">{type.title}</span><ChevronRight className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" /></button>)}</div> : null}</div>;
  const renderLayoutToken = (token: CreatorLinkLayoutToken) => {
    if (token === "social") return socialBlock;
    if (token === "work") return workBlock;
    const item = linkItemsByToken.get(token);
    return item ? <CanvasItem item={item} mode={mode} buttonStyle={page.buttonStyle} fontStyle={page.fontStyle} onEdit={() => { if (!suppressEditRef.current) onEditItem?.(item); }} selected={selectedTarget?.kind === "link" && selectedTarget.itemId === item.id} /> : null;
  };
  const tokenWidth = (token: CreatorLinkLayoutToken) => token.startsWith("link:") ? itemWidth(normalizeCreatorLinkItemAppearance(linkItemsByToken.get(token as `link:${string}`)?.metadata)) : "w-full";
  const topLevelBlocks = isEdit && onReorderLayoutOrder && visibleLayoutOrder.length > 0
    ? <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={() => { suppressEditRef.current = true; clearSelection(); }} onDragCancel={finishTopLevelDrag} onDragEnd={(event: DragEndEvent) => { const { active, over } = event; if (over && active.id !== over.id) { const from = visibleLayoutOrder.indexOf(active.id as CreatorLinkLayoutToken); const to = visibleLayoutOrder.indexOf(over.id as CreatorLinkLayoutToken); if (from >= 0 && to >= 0) onReorderLayoutOrder(reorderVisibleCreatorLinkLayoutOrder(effectiveLayoutOrder, arrayMove(visibleLayoutOrder, from, to))); } finishTopLevelDrag(); }}><SortableContext items={visibleLayoutOrder} strategy={rectSortingStrategy}><div className="flex flex-wrap gap-3">{visibleLayoutOrder.map((token) => <SortableShell key={token} id={token} width={tokenWidth(token)} label={`${token}を並び替え`} handleOnly={token === "social"}>{renderLayoutToken(token)}</SortableShell>)}</div></SortableContext></DndContext>
    : <div className={`flex flex-wrap gap-3 ${isEdit ? "opacity-[0.96]" : ""}`}>{visibleLayoutOrder.map((token) => <div key={token} className={tokenWidth(token)}>{renderLayoutToken(token)}</div>)}</div>;

  return <div style={{ ...backgroundStyle, ...(usesLogicalDimensions ? { minHeight: `${TRENDRE_LINK_LOGICAL_CANVAS_HEIGHT}px`, width: `${TRENDRE_LINK_LOGICAL_CANVAS_WIDTH}px` } : {}) }} className={`relative min-h-[100dvh] w-full overflow-x-hidden ${theme.shell} ${fontClass}`}>
    {!coverUrl && preset?.backgroundImage ? <div className={`pointer-events-none absolute inset-x-0 top-0 overflow-hidden ${usesLogicalDimensions ? "h-[1040px]" : "bottom-0"}`} aria-hidden="true"><img src={preset.backgroundImage} alt="" loading="lazy" decoding="async" draggable={false} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: preset.backgroundPosition ?? "center", filter: preset.backgroundFilter, transform: preset.backgroundScale ? `scale(${preset.backgroundScale})` : undefined }} />{preset.backgroundOverlay ? <div className="absolute inset-0" style={{ background: preset.backgroundOverlay }} /> : null}</div> : null}
    {coverUrl ? <div className={`pointer-events-none absolute inset-0 ${page.themeKey === "night-purple" || page.themeKey === "minimal-black" ? "bg-black/45" : "bg-white/40"}`} /> : null}
    <div style={forceLogicalDimensions ? { minHeight: `${TRENDRE_LINK_LOGICAL_CANVAS_HEIGHT}px` } : undefined} className={`relative z-[1] mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col ${usesLogicalDimensions ? "min-h-[1040px]" : ""} ${canvasBottomPadding}`}>
      <section className={`${profileTopPadding} px-[18px] text-center transition-[padding] duration-300 motion-reduce:transition-none ${isEdit && !editingField ? "opacity-[0.94] saturate-[0.94]" : ""}`}><div className="relative mx-auto w-fit"><div className={`flex h-[86px] w-[86px] items-center justify-center overflow-hidden rounded-full text-[29px] font-medium shadow-sm ring-1 ring-white/25 ${avatarUrl ? "" : theme.button}`}>{avatarUrl ? <img src={avatarUrl} alt={page.displayName || "Creator profile"} draggable={false} className="h-full w-full object-cover" /> : getInitial(page.displayName)}</div>{isEdit ? <button type="button" onClick={onEditProfile} className={`absolute -bottom-1 -right-1 flex h-11 w-11 items-center justify-center rounded-full ${theme.subtle}`} aria-label={copy.editPhoto}><span className={`flex h-7 w-7 items-center justify-center rounded-full border shadow-sm ${theme.edit}`}><PencilIcon /></span></button> : null}</div>
        {isEdit && !avatarUrl ? <button type="button" onClick={onEditProfile} className={`mt-1 min-h-11 px-3 text-xs font-medium ${theme.subtle}`}>{copy.addPhoto}</button> : null}
        <div className={`relative mx-auto max-w-sm ${isEdit && !avatarUrl ? "mt-0" : page.themeKey === "night-purple" ? "mt-5" : "mt-4"}`}>{isEdit && editingField === "displayName" ? <input autoFocus value={page.displayName} maxLength={80} onChange={(e) => onDisplayNameChange?.(e.target.value)} onBlur={() => onEditingFieldChange?.(null)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") onEditingFieldChange?.(null); }} style={displayNameStyle} className={`w-full rounded-xl border px-3 py-2 text-center text-[23px] font-medium outline-none ${theme.edit}`} /> : isEdit ? <button type="button" onClick={() => onEditingFieldChange?.("displayName")} style={displayNameStyle} className={`inline-flex min-h-11 max-w-full items-center gap-1.5 font-medium ${headingFontClass} ${page.themeKey === "minimal-black" ? "text-[27px] uppercase" : page.themeKey === "night-purple" ? "text-[25px]" : "text-[23px]"}`}><span className="truncate">{page.displayName || copy.addName}</span><span className={theme.subtle}><PencilIcon /></span></button> : <h1 style={displayNameStyle} className={`font-medium ${headingFontClass} ${page.themeKey === "minimal-black" ? "text-[27px] uppercase" : page.themeKey === "night-purple" ? "text-[25px]" : "text-[23px]"}`}>{page.displayName}</h1>}</div>
      </section>

      {(visibleLayoutOrder.length > 0 || unmanagedContentItems.length > 0 || isEdit) ? <section className="px-[18px] pt-7">
        {topLevelBlocks}
        {unmanagedContentItems.length > 0 ? <div className="mt-3 flex flex-wrap gap-3">{unmanagedContentItems.map((item, index) => <div key={item.id ?? `${item.itemType}-${index}`} className={itemWidth(normalizeCreatorLinkItemAppearance(item.metadata))}><CanvasItem item={item} mode={mode} buttonStyle={page.buttonStyle} fontStyle={page.fontStyle} onEdit={() => { if (!suppressEditRef.current) onEditItem?.(item); }} /></div>)}</div> : null}
        {isEdit && linkItems.length === 0 ? <button type="button" onClick={onAddFirstLink} className={`mt-3 flex min-h-[72px] w-full items-center gap-3 rounded-2xl border border-dashed px-4 py-3 text-left ${theme.edit}`}><span className="text-xl" aria-hidden="true">＋</span><span><strong className="block text-sm font-medium">{copy.firstLinkTitle}</strong><span className={`mt-0.5 block text-xs ${theme.subtle}`}>{copy.firstLinkHelp}</span></span></button> : null}
      </section> : null}
      <footer className={`mt-auto px-5 pb-1 pt-10 text-center text-xs font-medium ${theme.subtle}`}>Powered by Trendre</footer>
    </div>
    {selectedForm ? <InquiryFormModal key={`${selectedForm.id}-${selectedForm.kind}`} formId={selectedForm.id} kind={selectedForm.kind} title={selectedForm.title} slug={page.slug} mode={mode === "public" ? "public" : "preview"} locale={locale} onClose={() => setSelectedForm(null)} /> : null}
  </div>;
}

export { THEMES as TRENDRE_LINK_CANVAS_THEMES };
