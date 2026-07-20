"use client";

import {
  CREATOR_LINK_ITEM_COLOR_VALUES,
  CREATOR_LINK_ITEM_FINISHES,
  CREATOR_LINK_ITEM_LAYOUTS,
  CREATOR_LINK_ITEM_SURFACES,
  getCreatorLinkItemColors,
  type CreatorLinkItemAppearance,
  type CreatorLinkItemFinish,
} from "@/lib/trendre-link/item-validation";

function CheckIcon() { return <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden="true"><path d="m4.5 10.5 3.2 3.2 7.8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
const FINISH_LABELS: Record<CreatorLinkItemFinish, { ja: string; en: string }> = { solid: { ja: "単色", en: "Solid" }, gradient: { ja: "グラデーション", en: "Gradient" }, metallic: { ja: "メタル", en: "Metallic" } };

export default function CardDesignSelector({ value, onChange, locale }: { value: CreatorLinkItemAppearance; onChange: (value: CreatorLinkItemAppearance) => void; locale: "ja" | "en" }) {
  const chooseFinish = (finish: CreatorLinkItemFinish) => { const colors = getCreatorLinkItemColors(finish); onChange({ ...value, finish, color: colors[0] }); };
  const selected = "border-rose-300 bg-rose-50/55 text-rose-700";
  const idle = "border-slate-200/80 bg-white/70 text-slate-600";
  return <div className="space-y-5 border-t border-slate-200/70 pt-5">
    <fieldset><legend className="mb-2 text-sm font-medium text-slate-700">{locale === "ja" ? "形" : "Shape"}</legend><div className="grid grid-cols-3 gap-2">{CREATOR_LINK_ITEM_LAYOUTS.map((layout) => <button key={layout} type="button" aria-pressed={value.layout === layout} onClick={() => onChange({ ...value, layout })} className={`flex h-[72px] flex-col items-center justify-center gap-2 rounded-xl border text-xs font-medium transition ${value.layout === layout ? selected : idle}`}><span className={`${layout === "wide" ? "h-4 w-12 rounded" : layout === "square" ? "h-7 w-7 rounded-md" : "h-7 w-7 rounded-full"} border border-current/35 bg-current/10`} />{layout === "wide" ? (locale === "ja" ? "横長" : "Wide") : layout === "square" ? (locale === "ja" ? "正方形" : "Square") : (locale === "ja" ? "アイコン" : "Icon")}</button>)}</div></fieldset>
    <fieldset><legend className="mb-2 text-sm font-medium text-slate-700">{locale === "ja" ? "見た目" : "Surface"}</legend><div className="grid grid-cols-2 gap-2">{CREATOR_LINK_ITEM_SURFACES.map((surface) => <button key={surface} type="button" aria-pressed={value.surface === surface} onClick={() => onChange({ ...value, surface })} className={`flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition ${value.surface === surface ? selected : idle}`}><span className={`h-4 w-8 rounded border border-current/45 ${surface === "filled" ? "bg-current/25" : "bg-transparent"}`} />{surface === "filled" ? (locale === "ja" ? "塗りつぶし" : "Filled") : (locale === "ja" ? "外枠のみ" : "Outline")}</button>)}</div></fieldset>
    <fieldset><legend className="mb-2 text-sm font-medium text-slate-700">{locale === "ja" ? "カラー・質感" : "Color & finish"}</legend><div className="grid grid-cols-3 gap-2">{CREATOR_LINK_ITEM_FINISHES.map((finish) => <button key={finish} type="button" aria-pressed={value.finish === finish} onClick={() => chooseFinish(finish)} className={`h-10 rounded-xl border text-xs font-medium transition ${value.finish === finish ? selected : idle}`}>{FINISH_LABELS[finish][locale]}</button>)}</div><div className="mt-3 flex flex-wrap gap-3">{getCreatorLinkItemColors(value.finish).map((color) => <button key={color} type="button" aria-label={color} aria-pressed={value.color === color} onClick={() => onChange({ ...value, color })} style={{ background: CREATOR_LINK_ITEM_COLOR_VALUES[color] }} className={`flex h-9 w-9 items-center justify-center rounded-full border border-black/10 shadow-[0_1px_2px_rgba(15,23,42,0.08)] ${value.color === color ? "ring-2 ring-rose-400 ring-offset-2" : ""}`}>{value.color === color ? <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/85 text-slate-800"><CheckIcon /></span> : null}</button>)}</div></fieldset>
  </div>;
}
