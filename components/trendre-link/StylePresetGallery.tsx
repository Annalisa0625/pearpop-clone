"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import TrendreLinkCanvas, { TRENDRE_LINK_LOGICAL_CANVAS_HEIGHT, TRENDRE_LINK_LOGICAL_CANVAS_WIDTH, type TrendreLinkCanvasData, type TrendreLinkCanvasItem } from "./TrendreLinkCanvas";
import { CREATOR_LINK_ONBOARDING_PRESETS, type CreatorLinkOnboardingPreset } from "@/lib/trendre-link/link-design-presets";

type Props = {
  data: TrendreLinkCanvasData;
  selectedPresetId: string | null;
  onSelect: (preset: CreatorLinkOnboardingPreset) => void;
};

const SAMPLE_SOCIALS = ["instagram", "tiktok", "youtube"] as const;
const SAMPLE_LINKS = ["Latest post", "Work with me"] as const;

function recipeItems(items: TrendreLinkCanvasItem[], preset: CreatorLinkOnboardingPreset) {
  const socials = items.filter((item) => item.itemType === "social").map((item) => ({ ...item, metadata: { ...item.metadata, iconColor: preset.socialIconColor } }));
  const links = items.filter((item) => item.itemType !== "social").map((item) => item.itemType === "link" ? { ...item, metadata: { ...preset.linkAppearance } } : item);
  if (!socials.length) {
    socials.push(...SAMPLE_SOCIALS.map((platform, index) => ({ id: `guest-sample-social-${platform}`, sortOrder: index, itemType: "social" as const, platform, title: null, description: null, url: "https://example.com/", imageUrl: null, metadata: { ...preset.linkAppearance, iconColor: preset.socialIconColor } })));
  }
  if (!links.some((item) => item.itemType === "link")) {
    links.push(...SAMPLE_LINKS.map((title, index) => ({ id: `guest-preset-sample-${index}`, sortOrder: index, itemType: "link" as const, platform: null, title, description: null, url: "https://example.com/", imageUrl: null, metadata: { ...preset.linkAppearance } })));
  }
  return [...socials, ...links];
}

const MiniCanvas = memo(function MiniCanvas({ data }: { data: TrendreLinkCanvasData }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const update = () => setScale(Math.min(frame.clientWidth / TRENDRE_LINK_LOGICAL_CANVAS_WIDTH, frame.clientHeight / TRENDRE_LINK_LOGICAL_CANVAS_HEIGHT));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);
  return <div ref={frameRef} className="relative aspect-[3/5] w-full overflow-hidden rounded-[inherit] bg-[#f4f3f1]"><div className="link-preset-renderer pointer-events-none absolute left-1/2 top-0 w-[480px] origin-top" style={{ transform: `translateX(-50%) scale(${scale})` }} aria-hidden="true"><TrendreLinkCanvas data={data} mode="preview" locale="ja" /></div></div>;
});

type PresetCardProps = {
  preset: CreatorLinkOnboardingPreset;
  preview: TrendreLinkCanvasData;
  selected: boolean;
  contentKey: string;
  onSelect: (preset: CreatorLinkOnboardingPreset) => void;
};

const PresetCard = memo(function PresetCard({ preset, preview, selected, onSelect }: PresetCardProps) {
  return <article className={`link-preset-card relative min-w-0 overflow-hidden rounded-[20px] bg-white shadow-[0_8px_24px_rgba(42,35,31,.09)] outline transition-[transform,outline-color,box-shadow] duration-200 [contain:layout_paint_style] [content-visibility:auto] [contain-intrinsic-size:180px_300px] ${selected ? "outline-[3px] outline-offset-1 outline-[#242326] shadow-[0_13px_32px_rgba(42,35,31,.2)]" : "outline-1 outline-offset-[-1px] outline-black/10"}`}>
    <div className="link-preset-visual transition-[transform,opacity] duration-200"><MiniCanvas data={preview} /></div>
    <span className="pointer-events-none absolute bottom-2 left-2 max-w-[calc(100%-16px)] rounded-full bg-black/72 px-2.5 py-1.5 text-left text-white shadow-sm backdrop-blur-md"><span className="mr-1 text-[7px] font-bold uppercase tracking-[.1em] text-white/55">{preset.category}</span><strong className="text-[10px] font-semibold leading-none">{preset.name}</strong></span>
    {selected ? <span className="pointer-events-none absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#242326] text-white shadow-md ring-2 ring-white/90"><Check className="h-3.5 w-3.5" strokeWidth={2.8} /></span> : null}
    <button type="button" role="radio" aria-checked={selected} aria-label={`${preset.name}を選択`} onClick={() => onSelect(preset)} className="link-preset-hitbox absolute inset-0 rounded-[20px] outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#f4b5bc]" />
  </article>;
}, (previous, next) => previous.preset === next.preset && previous.selected === next.selected && previous.contentKey === next.contentKey && previous.onSelect === next.onSelect);

export default function StylePresetGallery({ data, selectedPresetId, onSelect }: Props) {
  const contentKey = JSON.stringify({
    page: { avatarUrl: data.page.avatarUrl, bio: data.page.bio, displayName: data.page.displayName, slug: data.page.slug },
    items: data.items.map(({ id, itemType, platform, title, description, url, imageUrl, sortOrder }) => ({ id, itemType, platform, title, description, url, imageUrl, sortOrder })),
  });
  const previews = useMemo(() => CREATOR_LINK_ONBOARDING_PRESETS.map((preset) => ({
    preset,
    data: {
      ...data,
      page: { ...data.page, ...preset.page, coverUrl: null },
      items: recipeItems(data.items, preset),
      inquiryTypes: [],
    } satisfies TrendreLinkCanvasData,
  })), [data]);

  return <div className="grid grid-cols-2 gap-x-2 gap-y-2.5 px-1 pb-2 min-[390px]:gap-x-2.5 min-[390px]:gap-y-3" role="radiogroup" aria-label="Linkのスタイル">
    {previews.map(({ preset, data: preview }) => <PresetCard key={preset.id} preset={preset} preview={preview} selected={selectedPresetId === preset.id} contentKey={contentKey} onSelect={onSelect} />)}
  </div>;
}
