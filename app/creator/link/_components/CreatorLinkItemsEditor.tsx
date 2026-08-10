"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Link as LinkIcon, Pencil, Plus } from "lucide-react";

import SocialBrandIcon from "@/components/trendre-link/SocialBrandIcon";
import { isCreatorLinkSocialPlatform } from "@/lib/trendre-link/item-validation";
import type { CreatorLinkItem } from "@/lib/trendre-link/types";

type Props = {
  items: CreatorLinkItem[];
  busyItemId: string | null;
  onAdd: () => void;
  onEdit: (item: CreatorLinkItem) => void;
  onToggle: (item: CreatorLinkItem) => void;
  onReorder: (items: CreatorLinkItem[]) => void;
};

function displayUrl(value: string | null) {
  if (!value) return "URL未設定";
  try {
    const url = new URL(value);
    return `${url.hostname.replace(/^www\./, "")}${url.pathname === "/" ? "" : url.pathname}`;
  } catch {
    return value;
  }
}

function SortableItem({ item, busy, onEdit, onToggle }: {
  item: CreatorLinkItem;
  busy: boolean;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const platform = item.platform && isCreatorLinkSocialPlatform(item.platform) ? item.platform : null;
  const title = item.itemType === "social" ? (platform === "x" ? "X" : platform ? `${platform.slice(0, 1).toUpperCase()}${platform.slice(1)}` : "SNS") : item.title || "無題のリンク";
  const editable = item.itemType === "social" || item.itemType === "link";

  return (
    <article ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`grid min-h-[72px] grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl bg-white px-2.5 py-2 ring-1 ring-black/[0.055] transition ${isDragging ? "z-20 opacity-90 shadow-xl" : ""}`}>
      <button type="button" aria-label={`${title}を並べ替え`} {...attributes} {...listeners} className="flex h-11 w-11 touch-none items-center justify-center rounded-xl text-slate-400 outline-none hover:bg-slate-50 hover:text-slate-700 focus-visible:ring-4 focus-visible:ring-slate-200"><GripVertical className="h-5 w-5" aria-hidden="true" /></button>
      <button type="button" onClick={onEdit} disabled={!editable} className="min-w-0 py-1 text-left outline-none focus-visible:ring-4 focus-visible:ring-slate-200 disabled:cursor-default">
        <span className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">{platform ? <SocialBrandIcon platform={platform} brand className="h-[18px] w-[18px]" /> : <LinkIcon className="h-[17px] w-[17px]" aria-hidden="true" />}</span>
          <span className="min-w-0">
            <strong className="block truncate text-sm font-semibold text-slate-900">{title}</strong>
            <span className="mt-0.5 block truncate text-xs text-slate-400">{displayUrl(item.url)}</span>
          </span>
        </span>
      </button>
      <div className="flex items-center gap-1">
        <button type="button" role="switch" aria-checked={item.isVisible} aria-label={`${title}を${item.isVisible ? "非表示" : "表示"}にする`} disabled={busy || !editable} onClick={onToggle} className="flex h-11 w-12 items-center justify-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-rose-200 disabled:opacity-50"><span className={`relative block h-7 w-12 rounded-full transition ${item.isVisible ? "bg-[#242326]" : "bg-slate-200"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${item.isVisible ? "left-6" : "left-1"}`} /></span></button>
        {editable ? <button type="button" onClick={onEdit} aria-label={`${title}を編集`} className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 outline-none hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-slate-200"><Pencil className="h-4 w-4" aria-hidden="true" /></button> : null}
      </div>
    </article>
  );
}

export default function CreatorLinkItemsEditor({ items, busyItemId, onAdd, onEdit, onToggle, onReorder }: Props) {
  const orderedItems = items.filter((item) => item.itemType !== "social").sort((a, b) => a.sortOrder - b.sortOrder);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const dragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = orderedItems.findIndex((item) => item.id === active.id);
    const to = orderedItems.findIndex((item) => item.id === over.id);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(orderedItems, from, to));
  };

  return (
    <section aria-labelledby="creator-link-items-title" className="pt-3">
      <div className="mb-3 flex min-h-11 items-center justify-between gap-3">
        <div><h3 id="creator-link-items-title" className="text-[15px] font-semibold text-slate-950">リンク</h3><p className="mt-0.5 text-xs text-slate-400">長押しして並べ替え</p></div>
        <button type="button" onClick={onAdd} className="onboarding-press flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-[#242326] px-4 text-[13px] font-semibold text-white outline-none focus-visible:ring-4 focus-visible:ring-rose-200"><Plus className="h-4 w-4" aria-hidden="true" />追加</button>
      </div>
      {orderedItems.length ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}>
          <SortableContext items={orderedItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2.5">{orderedItems.map((item) => <SortableItem key={item.id} item={item} busy={Boolean(busyItemId)} onEdit={() => onEdit(item)} onToggle={() => onToggle(item)} />)}</div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="py-8 text-center">
          <p className="text-sm font-semibold text-slate-700">まだリンクがありません</p>
          <p className="mt-1 text-sm text-slate-400">最初のリンクを追加して、活動をひとつにまとめましょう。</p>
        </div>
      )}
    </section>
  );
}
