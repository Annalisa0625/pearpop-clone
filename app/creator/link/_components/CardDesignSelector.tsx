"use client";

import type { CreatorLinkButtonStyle } from "@/lib/trendre-link/constants";
import {
  CREATOR_LINK_ITEM_COLORS,
  CREATOR_LINK_ITEM_COLOR_VALUES,
  CREATOR_LINK_ITEM_LAYOUTS,
  CREATOR_LINK_ITEM_SHAPES,
  CREATOR_LINK_ITEM_STYLES,
  applyCreatorLinkItemStyle,
  getCreatorLinkItemFinishForColor,
  resolveCreatorLinkItemShape,
  resolveCreatorLinkItemStyle,
  type CreatorLinkItemAppearance,
  type CreatorLinkItemShape,
  type CreatorLinkItemStyle,
} from "@/lib/trendre-link/item-validation";

function CheckIcon() {
  return <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden="true"><path d="m4.5 10.5 3.2 3.2 7.8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

const SHAPE_LABELS: Record<CreatorLinkItemShape, string> = {
  rounded: "Rounded",
  pill: "Pill",
  "soft-square": "Soft Square",
  square: "Square",
};

const STYLE_LABELS: Record<CreatorLinkItemStyle, string> = {
  solid: "Solid",
  outline: "Outline",
  glass: "Glass",
  soft: "Soft",
  shadow: "Shadow",
};

export default function CardDesignSelector({ value, onChange, locale, pageButtonStyle = "rounded" }: {
  value: CreatorLinkItemAppearance;
  onChange: (value: CreatorLinkItemAppearance) => void;
  locale: "ja" | "en";
  pageButtonStyle?: CreatorLinkButtonStyle;
}) {
  const selectedShape = resolveCreatorLinkItemShape(value, pageButtonStyle);
  const selectedStyle = resolveCreatorLinkItemStyle(value, pageButtonStyle);
  const selected = "border-rose-300 bg-rose-50/55 text-rose-700";
  const idle = "border-slate-200/80 bg-white/70 text-slate-600";

  return <div className="space-y-5 border-t border-slate-200/70 pt-5">
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-slate-700">Layout</legend>
      <div className="grid grid-cols-3 gap-2">
        {CREATOR_LINK_ITEM_LAYOUTS.map((layout) => <button key={layout} type="button" aria-pressed={value.layout === layout} onClick={() => onChange({ ...value, layout })} className={`flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-xl border px-1 text-xs font-medium transition ${value.layout === layout ? selected : idle}`}>
          <span className={`${layout === "wide" ? "h-4 w-12 rounded" : layout === "square" ? "h-7 w-7 rounded-md" : "h-7 w-7 rounded-full"} border border-current/35 bg-current/10`} />
          {layout === "wide" ? "Wide" : layout === "square" ? "Square" : "Icon"}
        </button>)}
      </div>
    </fieldset>

    <fieldset>
      <legend className="mb-2 text-sm font-medium text-slate-700">Shape</legend>
      <div className="grid grid-cols-2 gap-2">
        {CREATOR_LINK_ITEM_SHAPES.map((shape) => <button key={shape} type="button" aria-pressed={selectedShape === shape} onClick={() => onChange({ ...value, shape })} className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 text-left text-xs font-medium transition ${selectedShape === shape ? selected : idle}`}>
          <span className={`h-7 w-11 border border-current/40 bg-current/10 ${shape === "pill" ? "rounded-full" : shape === "rounded" ? "rounded-2xl" : shape === "soft-square" ? "rounded-lg" : "rounded-none"}`} />
          {SHAPE_LABELS[shape]}
        </button>)}
      </div>
    </fieldset>

    <fieldset>
      <legend className="mb-2 text-sm font-medium text-slate-700">Style</legend>
      <div className="grid grid-cols-2 gap-2">
        {CREATOR_LINK_ITEM_STYLES.map((style) => <button key={style} type="button" aria-pressed={selectedStyle === style} onClick={() => onChange(applyCreatorLinkItemStyle(value, style))} className={`flex min-h-12 items-center justify-between rounded-xl border px-3 text-xs font-medium transition ${selectedStyle === style ? selected : idle}`}>
          <span>{STYLE_LABELS[style]}</span>
          <span className={`h-6 w-10 rounded-lg ${style === "outline" ? "border-2 border-current bg-transparent" : style === "glass" ? "border border-current/40 bg-white/30 backdrop-blur" : style === "soft" ? "bg-current/10 shadow-sm" : style === "shadow" ? "bg-current/15 shadow-[0_4px_0_currentColor]" : "bg-current/20"}`} />
        </button>)}
      </div>
    </fieldset>

    <fieldset>
      <legend className="mb-2 text-sm font-medium text-slate-700">{locale === "ja" ? "カラー" : "Color"}</legend>
      <div className="flex flex-wrap gap-3">
        {CREATOR_LINK_ITEM_COLORS.map((color) => <button key={color} type="button" aria-label={color} aria-pressed={value.color === color} onClick={() => onChange({ ...value, color, finish: getCreatorLinkItemFinishForColor(color) })} style={{ background: CREATOR_LINK_ITEM_COLOR_VALUES[color] }} className={`flex h-10 w-10 items-center justify-center rounded-full border border-black/10 shadow-[0_1px_2px_rgba(15,23,42,0.08)] ${value.color === color ? "ring-2 ring-rose-400 ring-offset-2" : ""}`}>
          {value.color === color ? <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/85 text-slate-800"><CheckIcon /></span> : null}
        </button>)}
      </div>
    </fieldset>
  </div>;
}
