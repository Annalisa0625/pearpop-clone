"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Link as LinkGlyph } from "lucide-react";
import InquiryFormModal from "@/components/trendre-link/InquiryFormModal";
import SocialBrandIcon from "@/components/trendre-link/SocialBrandIcon";
import { findCreatorLinkBackgroundPreset } from "@/lib/trendre-link/background-presets";
import type { CreatorLinkButtonStyle, CreatorLinkFontStyle, CreatorLinkItemType, CreatorLinkTheme } from "@/lib/trendre-link/constants";
import { CREATOR_LINK_ITEM_COLOR_VALUES, isCreatorLinkSocialPlatform, normalizeCreatorLinkItemAppearance, type CreatorLinkItemAppearance } from "@/lib/trendre-link/item-validation";
import type { CreatorLinkInquiryFormKind } from "@/lib/trendre-link/inquiry-forms";

export type TrendreLinkCanvasMode = "edit" | "preview" | "public";
export type TrendreLinkEditableField = "displayName" | "bio" | null;
export type TrendreLinkCanvasItem = { id?: string; sortOrder?: number; itemType: CreatorLinkItemType; platform: string | null; title: string | null; description: string | null; url: string | null; imageUrl: string | null; metadata: CreatorLinkItemAppearance };
export type TrendreLinkCanvasInquiryType = { id?: string; sortOrder?: number; templateKey: string | null; title: string; description: string | null; isCustom?: boolean };
export type TrendreLinkCanvasData = {
  page: { slug: string; displayName: string; bio: string | null; avatarUrl: string | null; coverUrl: string | null; themeKey: CreatorLinkTheme; accentColor: string | null; buttonStyle: CreatorLinkButtonStyle; fontStyle: CreatorLinkFontStyle; isAcceptingInquiries: boolean };
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
function contrast(hex: string) { const n = Number.parseInt(hex.slice(1), 16); return (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 155 ? "#29272A" : "#FAF9F7"; }
function finishTextColor(appearance: CreatorLinkItemAppearance) {
  if (appearance.finish === "solid") return contrast(CREATOR_LINK_ITEM_COLOR_VALUES[appearance.color]);
  return ["champagne", "champagne-gold", "rose-gold", "silver"].includes(appearance.color) ? "#29272A" : "#FAF9F7";
}
function appearanceStyle(appearance: CreatorLinkItemAppearance): CSSProperties {
  const paint = CREATOR_LINK_ITEM_COLOR_VALUES[appearance.color];
  const text = finishTextColor(appearance);
  if (appearance.surface === "filled") return { background: paint, borderColor: "transparent", color: text, boxShadow: appearance.finish === "metallic" ? "inset 0 1px 0 rgba(255,255,255,.3)" : undefined };
  return { background: `linear-gradient(rgba(255,255,255,.10), rgba(255,255,255,.10)) padding-box, ${paint} border-box`, borderColor: "transparent", color: text, boxShadow: appearance.finish === "metallic" ? "inset 0 1px 0 rgba(255,255,255,.18)" : undefined };
}
function itemLabel(item: TrendreLinkCanvasItem) { if (item.itemType === "social") return item.platform === "instagram" ? "Instagram" : item.platform === "tiktok" ? "TikTok" : item.platform === "x" ? "X" : item.platform === "youtube" ? "YouTube" : "Social"; return item.title ?? "Link"; }
function itemWidth(appearance: CreatorLinkItemAppearance) { return appearance.layout === "wide" ? "w-full" : appearance.layout === "square" ? "w-[calc(50%-0.25rem)] max-w-[calc(50%-0.25rem)]" : "w-12"; }
const reorderStyles: CSSProperties = { userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none", touchAction: "none" };

function CanvasItem({ item, mode, onEdit }: { item: TrendreLinkCanvasItem; mode: TrendreLinkCanvasMode; onEdit?: () => void }) {
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
  const style = appearanceStyle(appearance);
  const label = itemLabel(item);
  const platform = item.platform && isCreatorLinkSocialPlatform(item.platform) ? item.platform : null;
  const icon = platform ? <SocialBrandIcon platform={platform} /> : <LinkGlyph className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />;
  const content = appearance.layout === "icon"
    ? <div style={style} aria-label={label} className="flex h-[48px] w-[48px] items-center justify-center rounded-[14px] border"><span aria-hidden="true">{icon}</span><span className="sr-only">{label}</span></div>
    : appearance.layout === "square"
      ? <div style={style} className="flex h-[120px] w-full flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center"><span>{icon}</span><span className="line-clamp-2 text-sm font-medium">{label}</span></div>
      : <div style={style} className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl border px-4 py-2"><span className="flex w-6 shrink-0 items-center justify-center">{icon}</span><span className="min-w-0 flex-1 truncate text-left text-[15px] font-medium">{label}</span></div>;
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
  const [selectedForm, setSelectedForm] = useState<{ kind: CreatorLinkInquiryFormKind; title: string } | null>(null);
  useEffect(() => { if (mode !== "edit") setReorderMode(false); }, [mode]);
  const preset = findCreatorLinkBackgroundPreset(page);
  const baseTheme = THEMES[page.themeKey];
  const theme = page.coverUrl ? baseTheme : preset ? (preset.foreground === "light" ? THEMES["minimal-black"] : THEMES["soft-ivory"]) : baseTheme;
  const isEdit = mode === "edit";
  const avatarUrl = safeUrl(page.avatarUrl);
  const coverUrl = safeUrl(page.coverUrl);
  const fontClass = page.fontStyle === "serif" ? "font-serif" : page.fontStyle === "bold" ? "font-semibold" : page.fontStyle === "soft" ? "tracking-[0.01em]" : "";
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 10 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const canSortItems = reorderMode && items.length > 0 && items.every((item) => Boolean(item.id));
  const enabledForms = data.inquiryTypes.filter((type) => (type.templateKey === null && type.isCustom !== false) || type.templateKey === "pr_post").sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const canSortForms = reorderMode && enabledForms.length > 1 && enabledForms.every((type) => Boolean(type.id));
  const copy = locale === "ja" ? { editName: "表示名を編集", editPhoto: "プロフィール写真を編集", addPhoto: "写真を追加", addName: "名前を追加", addBio: "自己紹介を追加", firstLinkTitle: "SNSやリンクを追加", firstLinkHelp: "上のメニューから追加できます", inquiries: "お問い合わせ", reorder: "並び替え", reordering: "並び替え中", done: "完了" } : { editName: "Edit display name", editPhoto: "Edit profile photo", addPhoto: "Add photo", addName: "Add name", addBio: "Add a bio", firstLinkTitle: "Add social profiles or links", firstLinkHelp: "Use the menu above to add one", inquiries: "Work inquiries", reorder: "Reorder", reordering: "Reordering", done: "Done" };
  const profileTopPadding = mode === "public"
    ? "pt-[calc(env(safe-area-inset-top,0px)+clamp(4rem,9vh,5.5rem))]"
    : mode === "preview"
      ? "pt-[clamp(4rem,9vh,5.5rem)]"
      : "pt-12";
  const backgroundStyle = coverUrl ? { backgroundImage: `url(${JSON.stringify(coverUrl).slice(1, -1)})`, backgroundSize: "cover", backgroundPosition: "center" } : preset ? { background: preset.background, color: preset.foreground === "light" ? "#FAF9F7" : "#29272A" } : undefined;
  const clearSelection = () => document.getSelection()?.removeAllRanges();
  const openForm = (type: TrendreLinkCanvasInquiryType) => { if (isEdit) onEditInquirySettings?.(); else setSelectedForm({ kind: type.templateKey === "pr_post" ? "pr" : "simple", title: type.title }); };

  return <div style={backgroundStyle} className={`relative min-h-[100dvh] w-full overflow-x-hidden ${theme.shell} ${fontClass}`}>
    {coverUrl ? <div className={`pointer-events-none absolute inset-0 ${page.themeKey === "night-purple" || page.themeKey === "minimal-black" ? "bg-black/45" : "bg-white/40"}`} /> : null}
    <div className={`relative z-[1] mx-auto flex min-h-[100dvh] w-full max-w-[520px] flex-col ${isEdit ? "pb-[calc(6.75rem+env(safe-area-inset-bottom))]" : "pb-[max(1.5rem,env(safe-area-inset-bottom))]"}`}>
      <section className={`${profileTopPadding} px-4 text-center ${isEdit && !editingField ? "opacity-[0.94] saturate-[0.94]" : ""}`}><div className="relative mx-auto w-fit"><div className={`flex h-20 w-20 items-center justify-center overflow-hidden rounded-full text-[27px] font-medium shadow-sm ring-1 ring-white/25 ${avatarUrl ? "" : theme.button}`}>{avatarUrl ? <img src={avatarUrl} alt={page.displayName} draggable={false} className="h-full w-full object-cover" /> : getInitial(page.displayName)}</div>{isEdit ? <button type="button" onClick={onEditProfile} className={`absolute -bottom-1 -right-1 flex h-11 w-11 items-center justify-center rounded-full ${theme.subtle}`} aria-label={copy.editPhoto}><span className={`flex h-7 w-7 items-center justify-center rounded-full border shadow-sm ${theme.edit}`}><PencilIcon /></span></button> : null}</div>
        {isEdit && !avatarUrl ? <button type="button" onClick={onEditProfile} className={`mt-1 min-h-11 px-3 text-xs font-medium ${theme.subtle}`}>{copy.addPhoto}</button> : null}
        <div className={`relative mx-auto max-w-sm ${isEdit && !avatarUrl ? "mt-0" : "mt-4"}`}>{isEdit && editingField === "displayName" ? <input autoFocus value={page.displayName} maxLength={80} onChange={(e) => onDisplayNameChange?.(e.target.value)} onBlur={() => onEditingFieldChange?.(null)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") onEditingFieldChange?.(null); }} className={`w-full rounded-xl border px-3 py-2 text-center text-[23px] font-medium outline-none ${theme.edit}`} /> : isEdit ? <button type="button" onClick={() => onEditingFieldChange?.("displayName")} className="inline-flex min-h-11 max-w-full items-center gap-1.5 text-[23px] font-medium"><span className="truncate">{page.displayName || copy.addName}</span><span className={theme.subtle}><PencilIcon /></span></button> : <h1 className="text-[23px] font-medium">{page.displayName}</h1>}</div>
        <div className="relative mx-auto mt-2.5 max-w-sm">{isEdit && editingField === "bio" ? <textarea autoFocus value={page.bio ?? ""} maxLength={500} rows={3} onChange={(e) => onBioChange?.(e.target.value)} onBlur={() => onEditingFieldChange?.(null)} className={`w-full resize-none rounded-xl border px-3 py-2 text-center text-sm leading-6 outline-none ${theme.edit}`} /> : isEdit && !page.bio ? <button type="button" onClick={() => onEditingFieldChange?.("bio")} className={`min-h-10 rounded-xl border border-dashed px-4 text-sm ${theme.edit}`}>{copy.addBio}</button> : page.bio ? <button type="button" disabled={!isEdit} onClick={() => onEditingFieldChange?.("bio")} className={`inline-flex items-start gap-1.5 whitespace-pre-line text-sm leading-6 ${theme.muted}`}>{page.bio}{isEdit ? <span className="mt-1.5"><PencilIcon /></span> : null}</button> : null}</div>
      </section>

      {(items.length > 0 || isEdit) ? <section className="px-4 pt-7">{isEdit && (items.length > 0 || enabledForms.length > 1) ? <div className="mb-2 flex h-9 items-center justify-end gap-2"><span className={`text-xs ${theme.subtle}`}>{reorderMode ? copy.reordering : ""}</span><button type="button" onClick={() => setReorderMode((value) => !value)} className={`flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-medium ${theme.subtle}`}>{reorderMode ? copy.done : <><DragIcon />{copy.reorder}</>}</button></div> : null}
        {items.length > 0 ? canSortItems ? <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={clearSelection} onDragEnd={(event: DragEndEvent) => { clearSelection(); const { active, over } = event; if (!over || active.id === over.id) return; const from = items.findIndex((item) => item.id === active.id); const to = items.findIndex((item) => item.id === over.id); if (from >= 0 && to >= 0) onReorderItems?.(arrayMove(items, from, to)); }}><SortableContext items={items.map((item) => item.id ?? "")} strategy={rectSortingStrategy}><div className="flex flex-wrap gap-2">{items.map((item) => <SortableShell key={item.id} id={item.id!} width={itemWidth(normalizeCreatorLinkItemAppearance(item.metadata))}><CanvasItem item={item} mode="edit" /></SortableShell>)}</div></SortableContext></DndContext> : <div className={`flex flex-wrap gap-2 ${isEdit ? "opacity-[0.94] saturate-[0.94]" : ""}`}>{items.map((item, index) => <div key={item.id ?? `${item.itemType}-${index}`} className={itemWidth(normalizeCreatorLinkItemAppearance(item.metadata))}><CanvasItem item={item} mode={mode} onEdit={() => onEditItem?.(item)} /></div>)}</div> : isEdit ? <button type="button" onClick={onAddFirstLink} className={`flex min-h-[72px] w-full items-center gap-3 rounded-2xl border border-dashed px-4 py-3 text-left ${theme.edit}`}><span className="text-xl" aria-hidden="true">＋</span><span><strong className="block text-sm font-medium">{copy.firstLinkTitle}</strong><span className={`mt-0.5 block text-xs ${theme.subtle}`}>{copy.firstLinkHelp}</span></span></button> : null}
      </section> : null}

      {page.isAcceptingInquiries && enabledForms.length ? <section className="px-4 pt-7"><h2 className="mb-2 px-1 text-base font-medium">{copy.inquiries}</h2>{canSortForms ? <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={clearSelection} onDragEnd={(event: DragEndEvent) => { clearSelection(); const { active, over } = event; if (!over || active.id === over.id) return; const from = enabledForms.findIndex((type) => type.id === active.id); const to = enabledForms.findIndex((type) => type.id === over.id); if (from >= 0 && to >= 0) onReorderInquiryTypes?.(arrayMove(enabledForms, from, to)); }}><SortableContext items={enabledForms.map((type) => type.id!)} strategy={rectSortingStrategy}><div className="space-y-2">{enabledForms.map((type) => <SortableShell key={type.id} id={type.id!} width="w-full"><FormCard type={type} theme={theme} reorder /></SortableShell>)}</div></SortableContext></DndContext> : <div className={`space-y-2 ${isEdit ? "opacity-[0.94] saturate-[0.94]" : ""}`}>{enabledForms.map((type, index) => <FormCard key={type.id ?? `${type.templateKey ?? "simple"}-${index}`} type={type} theme={theme} onClick={() => openForm(type)} />)}</div>}</section> : null}
      <footer className={`mt-auto px-5 pb-1 pt-10 text-center text-xs font-medium ${theme.subtle}`}>Powered by Trendre</footer>
    </div>
    {selectedForm ? <InquiryFormModal key={`${selectedForm.kind}-${selectedForm.title}`} kind={selectedForm.kind} title={selectedForm.title} slug={page.slug} mode={mode === "public" ? "public" : "preview"} locale={locale} onClose={() => setSelectedForm(null)} /> : null}
  </div>;
}

export { THEMES as TRENDRE_LINK_CANVAS_THEMES };
