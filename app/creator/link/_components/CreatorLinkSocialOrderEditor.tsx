"use client";

import { closestCenter, DndContext, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { sortableKeyboardCoordinates, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import SocialBrandIcon from "@/components/trendre-link/SocialBrandIcon";
import { isCreatorLinkSocialPlatform } from "@/lib/trendre-link/item-validation";
import { reorderCreatorLinkSocialItems } from "@/lib/trendre-link/social-order";
import type { CreatorLinkItem } from "@/lib/trendre-link/types";

function SocialRow({ item }: { item: CreatorLinkItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const platform = item.platform && isCreatorLinkSocialPlatform(item.platform) ? item.platform : null;
  if (!platform) return null;
  const label = platform === "x" ? "X" : `${platform.slice(0, 1).toUpperCase()}${platform.slice(1)}`;
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`flex min-h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-2 ${isDragging ? "z-20 shadow-lg" : ""}`}><button type="button" aria-label={`Reorder ${label}`} {...attributes} {...listeners} className="flex h-11 w-11 touch-none items-center justify-center rounded-xl text-slate-400 focus-visible:ring-4 focus-visible:ring-slate-200"><GripVertical className="h-5 w-5" /></button><SocialBrandIcon platform={platform} brand className="h-5 w-5" /><span className="text-sm font-semibold text-slate-800">{label}</span></div>;
}

export default function CreatorLinkSocialOrderEditor({ items, onReorder }: { items: CreatorLinkItem[]; onReorder: (items: CreatorLinkItem[]) => void }) {
  const socials = items.filter((item) => item.itemType === "social" && item.isVisible).sort((a, b) => a.sortOrder - b.sortOrder);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  if (socials.length < 2) return null;
  const dragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    onReorder(reorderCreatorLinkSocialItems(socials, String(active.id), String(over.id)));
  };
  return <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2"><summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-slate-700">Reorder social icons</summary><DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}><SortableContext items={socials.map((item) => item.id)} strategy={verticalListSortingStrategy}><div className="space-y-2 pb-2">{socials.map((item) => <SocialRow key={item.id} item={item} />)}</div></SortableContext></DndContext></details>;
}
