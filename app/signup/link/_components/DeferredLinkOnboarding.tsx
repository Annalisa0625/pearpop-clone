"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type ReactNode } from "react";
import { ArrowLeft, Camera, Check, CheckCircle2, Copy, ExternalLink, ImagePlus, Images, Link2, LockKeyhole, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import SocialBrandIcon from "@/components/trendre-link/SocialBrandIcon";
import TrendreLinkCanvas, { TRENDRE_LINK_LOGICAL_CANVAS_WIDTH, type TrendreLinkCanvasData, type TrendreLinkCanvasItem } from "@/components/trendre-link/TrendreLinkCanvas";
import DeferredLinkPresetGrid from "./DeferredLinkPresetGrid";
import {
  DEFAULT_CREATOR_LINK_ITEM_APPEARANCE,
  normalizeSocialProfile,
  validateGeneralLink,
  type CreatorLinkSocialPlatform,
} from "@/lib/trendre-link/item-validation";
import type { AnonymousLinkDraft } from "@/lib/trendre-link/anonymous-draft";
import { INQUIRY_FORM_DEFAULTS } from "@/lib/trendre-link/inquiry-forms";
import {
  findMatchingOnboardingPreset,
  type CreatorLinkOnboardingPreset,
} from "@/lib/trendre-link/onboarding-presets";
import { applyLinkDesignPreset } from "@/lib/trendre-link/link-design-presets";

type Props = {
  draft: AnonymousLinkDraft;
  avatarPreviewUrl: string | null;
  slugState: "idle" | "checking" | "available" | "unavailable" | "invalid";
  slugMessage: string;
  publishedSlug?: string | null;
  onChange: (next: AnonymousLinkDraft) => void;
  onAvatar: (file: File) => void;
  onRequireAuth: () => void;
};

const STEP_COUNT = 7;
const SOCIALS: CreatorLinkSocialPlatform[] = ["instagram", "tiktok", "x", "youtube"];
const socialLabel = (platform: CreatorLinkSocialPlatform) => platform === "instagram" ? "Instagram" : platform === "tiktok" ? "TikTok" : platform === "x" ? "X" : "YouTube";
const socialPrefix = (platform: CreatorLinkSocialPlatform) => platform === "instagram" ? "instagram.com/" : platform === "tiktok" ? "tiktok.com/@" : platform === "x" ? "x.com/" : "youtube.com/@";
const createId = () => typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

function socialInputValue(value: string) {
  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    const candidate = parts[0] === "channel" || parts[0] === "c" || parts[0] === "user" ? parts.slice(0, 2).join("/") : parts[0] ?? "";
    return decodeURIComponent(candidate).replace(/^@/, "");
  } catch {
    return value.trim().replace(/^@/, "");
  }
}

function toCanvasItems(draft: AnonymousLinkDraft): TrendreLinkCanvasItem[] {
  const socials: TrendreLinkCanvasItem[] = draft.socials.filter((item) => item.isVisible).map((item, index) => ({
    id: item.clientId,
    sortOrder: index,
    itemType: "social",
    platform: item.platform,
    title: null,
    description: null,
    url: item.url,
    imageUrl: null,
    metadata: item.metadata,
  }));
  const links: TrendreLinkCanvasItem[] = draft.links.filter((item) => item.isVisible).map((item) => ({
    id: item.clientId,
    sortOrder: item.sortOrder,
    itemType: "link",
    platform: null,
    title: item.title,
    description: null,
    url: item.url,
    imageUrl: null,
    metadata: item.metadata,
  }));
  return [...socials, ...links];
}

function PrimaryButton({ disabled, onClick, children }: { disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="link-onboarding-press flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#242326] px-6 text-[15px] font-semibold text-white outline-none hover:bg-black focus-visible:ring-4 focus-visible:ring-[#f4b5bc] disabled:pointer-events-none disabled:bg-[#e5e3df] disabled:text-[#9d9994]">{children}</button>;
}

function StepShell({ step, title, description, onBack, onSkip, galleryMode = false, children, footer }: { step: number; title: string; description: string; onBack: () => void; onSkip?: () => void; galleryMode?: boolean; children: ReactNode; footer: ReactNode }) {
  return <main className="trendre-link-minimal-onboarding mx-auto flex h-[100dvh] min-h-0 w-full max-w-[456px] flex-col overflow-hidden bg-[#fbfaf8] text-[#242326]">
    <header className={`flex shrink-0 items-end gap-2 px-3 pb-1.5 pt-[env(safe-area-inset-top)] min-[390px]:px-4 ${galleryMode ? "h-[calc(52px+env(safe-area-inset-top))]" : "h-[calc(60px+env(safe-area-inset-top))]"}`}>
      <button type="button" onClick={onBack} aria-label="戻る" className="link-onboarding-press flex h-10 w-10 shrink-0 items-center justify-center rounded-full outline-none hover:bg-black/[.05] focus-visible:ring-4 focus-visible:ring-rose-100"><ArrowLeft className="h-5 w-5" /></button>
      <div className="mb-[17px] flex h-1 flex-1 gap-1" aria-label={`${step + 1}/${STEP_COUNT}`} role="progressbar" aria-valuemin={1} aria-valuemax={STEP_COUNT} aria-valuenow={step + 1}>{Array.from({ length: STEP_COUNT }, (_, index) => <span key={index} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${index <= step ? "bg-[#e95563]" : "bg-[#e7e3df]"}`} />)}</div>
      {onSkip ? <button type="button" onClick={onSkip} className="link-onboarding-press flex h-11 min-w-11 items-center justify-center rounded-full px-2 text-[13px] font-semibold text-[#69645f] outline-none hover:bg-black/[.05] focus-visible:ring-4 focus-visible:ring-rose-100">スキップ</button> : <span className="h-11 w-11 shrink-0" aria-hidden="true" />}
    </header>
    <section className={`min-h-0 flex-1 ${galleryMode ? "flex flex-col overflow-hidden px-3 pb-1 pt-1 min-[390px]:px-4" : "overflow-y-auto overscroll-contain px-5 pb-5 pt-[clamp(1rem,4.2vh,2.6rem)] [scrollbar-width:none] min-[390px]:px-7"}`}>
      <div className="link-onboarding-enter mx-auto w-full max-w-[400px] shrink-0">
        <h1 className={`text-balance font-bold tracking-[-.045em] ${galleryMode ? "text-[24px] leading-tight min-[390px]:text-[26px]" : "text-[32px] leading-[1.08] min-[390px]:text-[36px]"}`}>{title}</h1>
        <p className={`max-w-[360px] text-[#716c67] ${galleryMode ? "mt-1 text-[12px] leading-5" : "mt-3 text-[14px] leading-6"}`}>{description}</p>
      </div>
      <div className={`link-onboarding-enter mx-auto w-full max-w-[428px] [animation-delay:80ms] ${galleryMode ? "mt-2 min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain py-1 [scrollbar-width:none] [scrollbar-gutter:stable]" : "mt-[clamp(2rem,7vh,4.75rem)] max-w-[400px]"}`}>{children}</div>
    </section>
    <footer className={`shrink-0 bg-gradient-to-t from-[#fbfaf8] via-[#fbfaf8] to-[#fbfaf8]/80 ${galleryMode ? "px-3 pb-[max(.65rem,env(safe-area-inset-bottom))] pt-2 min-[390px]:px-4" : "px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 min-[390px]:px-7"}`}><div className="mx-auto w-full max-w-[428px]">{footer}</div></footer>
  </main>;
}

function CompletePhone({ data, compact = false }: { data: TrendreLinkCanvasData; compact?: boolean }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const update = () => {
      setScale((frame.clientWidth - 10) / TRENDRE_LINK_LOGICAL_CANVAS_WIDTH);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);
  return <div className="mx-auto w-fit" aria-label="完成した公開ページのプレビュー">
    <div ref={frameRef} className={`link-complete-phone relative overflow-hidden border-2 border-black bg-[#090909] p-[5px] shadow-[0_28px_70px_rgba(30,25,22,.24),0_8px_22px_rgba(30,25,22,.16)] ${compact ? "link-complete-phone--compact" : ""}`}>
      <div className="link-complete-renderer pointer-events-none w-[480px] origin-top-left" style={{ transform: `scale(${scale})` } as CSSProperties} aria-hidden="true"><TrendreLinkCanvas data={data} mode="preview" locale="ja" /></div>
      <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[10px] z-10 h-[7px] w-[54px] -translate-x-1/2 rounded-full bg-black/80 shadow-[0_1px_0_rgba(255,255,255,.16)]" />
      <span aria-hidden="true" className="pointer-events-none absolute left-[calc(50%+34px)] top-[11px] z-10 h-[5px] w-[5px] rounded-full bg-[#1f2730] ring-1 ring-black/70" />
      <span aria-hidden="true" className="pointer-events-none absolute inset-[5px] rounded-[34px] ring-1 ring-inset ring-white/20" />
    </div>
  </div>;
}

function CompleteScreen({ data, slug, onBack, onPublish }: { data: TrendreLinkCanvasData; slug: string; onBack: () => void; onPublish: () => void }) {
  const completeData: TrendreLinkCanvasData = {
    ...data,
    page: { ...data.page, isAcceptingInquiries: true },
    inquiryTypes: [{ id: "standard-inquiry-preview", sortOrder: 0, templateKey: null, title: INQUIRY_FORM_DEFAULTS.simple.title, description: INQUIRY_FORM_DEFAULTS.simple.description, isCustom: false }],
  };
  return <main className="trendre-link-minimal-onboarding mx-auto flex h-[100dvh] min-h-0 w-full max-w-[456px] flex-col overflow-hidden bg-[#fbfaf8] text-[#242326]">
    <header className="flex h-[calc(52px+env(safe-area-inset-top))] shrink-0 items-end gap-2 px-3 pb-1.5 pt-[env(safe-area-inset-top)] min-[390px]:px-4">
      <button type="button" onClick={onBack} aria-label="戻る" className="link-onboarding-press flex h-10 w-10 shrink-0 items-center justify-center rounded-full outline-none hover:bg-black/[.05] focus-visible:ring-4 focus-visible:ring-rose-100"><ArrowLeft className="h-5 w-5" /></button>
      <div className="mb-[17px] flex h-1 flex-1 gap-1" aria-label="7/7" role="progressbar" aria-valuemin={1} aria-valuemax={STEP_COUNT} aria-valuenow={STEP_COUNT}>{Array.from({ length: STEP_COUNT }, (_, index) => <span key={index} className="h-1 flex-1 rounded-full bg-[#e95563]" />)}</div>
      <span className="h-10 w-10 shrink-0" aria-hidden="true" />
    </header>
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-1 pt-1 min-[390px]:px-4">
      <div className="link-onboarding-enter shrink-0 text-center"><span className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-[#d84757]"><Sparkles className="h-3.5 w-3.5" /></span><h1 className="mt-1 text-[22px] font-bold leading-tight tracking-[-.05em] min-[390px]:text-[24px]">あなたのLinkが完成しました</h1><p className="mt-0.5 text-[11px] leading-4 text-[#716c67]">デザインを確認して、公開へ進みましょう。</p></div>
      <div className="link-complete-hero link-onboarding-enter mt-6 shrink-0 [animation-delay:70ms]"><CompletePhone data={completeData} compact /></div>
      <div className="link-onboarding-enter mx-auto mt-1.5 w-full max-w-[360px] shrink-0 [animation-delay:120ms]"><div aria-label="公開前のURL" className="flex min-h-11 items-center gap-2 rounded-2xl border border-[#e1ddd8] bg-white px-3.5"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f1eeea] text-[#69645f]"><LockKeyhole className="h-3.5 w-3.5" /></span><span className="min-w-0 flex-1"><span className="block text-[9px] font-semibold uppercase tracking-[.08em] text-[#928b84]">公開後のURL</span><span className="block truncate text-[12px] font-semibold">trendre.jp/in/{slug}</span></span></div><button type="button" onClick={onBack} className="link-onboarding-press mx-auto flex min-h-6 items-center justify-center px-4 text-[11px] font-semibold text-[#77716b]">デザインを選び直す</button></div>
    </section>
    <footer className="shrink-0 bg-gradient-to-t from-[#fbfaf8] via-[#fbfaf8] to-[#fbfaf8]/80 px-3 pb-[max(.4rem,env(safe-area-inset-bottom))] pt-1 min-[390px]:px-4"><div className="mx-auto w-full max-w-[428px]"><PrimaryButton onClick={onPublish}>Linkを公開する</PrimaryButton></div></footer>
  </main>;
}

function PublishedScreen({ data, slug }: { data: TrendreLinkCanvasData; slug: string }) {
  const [copied, setCopied] = useState(false);
  const publicUrl = `trendre.jp/in/${slug}`;
  const copy = async () => {
    await navigator.clipboard.writeText(`https://${publicUrl}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  return <main className="trendre-link-minimal-onboarding mx-auto flex h-[100dvh] min-h-0 w-full max-w-[456px] flex-col overflow-hidden bg-[#fbfaf8] text-[#242326]">
    <section className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-[max(2rem,env(safe-area-inset-top))] min-[390px]:px-7">
      <div className="link-onboarding-enter text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-6 w-6" /></span><h1 className="mt-4 text-[32px] font-bold tracking-[-.05em]">公開しました</h1><p className="mt-2 text-sm text-[#716c67]">あなたのLinkをシェアできます。</p></div>
      <div className="link-onboarding-enter mt-6 [animation-delay:80ms]"><CompletePhone data={data} /></div>
    </section>
    <footer className="shrink-0 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 min-[390px]:px-7"><div className="mx-auto max-w-[400px]"><div className="mb-3 flex min-h-14 items-center gap-2 rounded-2xl border border-[#e4e0dc] bg-white p-2 pl-4"><span className="min-w-0 flex-1 truncate text-[13px] font-medium">{publicUrl}</span><button type="button" onClick={() => void copy()} className="link-onboarding-press flex min-h-11 items-center gap-1.5 rounded-xl bg-[#f2efeb] px-3 text-xs font-semibold"><Copy className="h-4 w-4" />{copied ? "コピー済み" : "コピー"}</button></div><div className="grid grid-cols-2 gap-2"><Link href={`/in/${slug}`} target="_blank" className="link-onboarding-press flex min-h-12 items-center justify-center gap-1.5 rounded-full border border-[#dcd8d4] bg-white px-3 text-[13px] font-semibold"><ExternalLink className="h-4 w-4" />公開ページを見る</Link><Link href="/creator/link" className="link-onboarding-press flex min-h-12 items-center justify-center rounded-full bg-[#242326] px-3 text-[13px] font-semibold text-white">デザインを編集</Link></div></div></footer>
  </main>;
}

export default function DeferredLinkOnboarding({ draft, avatarPreviewUrl, slugState, slugMessage, publishedSlug, onChange, onAvatar, onRequireAuth }: Props) {
  const step = Math.min(Math.max(draft.step, 0), STEP_COUNT - 1);
  const [activeSocial, setActiveSocial] = useState<CreatorLinkSocialPlatform>("instagram");
  const [socialValue, setSocialValue] = useState("");
  const [socialError, setSocialError] = useState<string | null>(null);
  const [linkTitle, setLinkTitle] = useState(draft.links[0]?.title ?? "");
  const [linkUrl, setLinkUrl] = useState(draft.links[0]?.url ?? "");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<CreatorLinkOnboardingPreset["id"] | null>(() =>
    draft.step >= 6 ? findMatchingOnboardingPreset({ page: draft.page, socials: draft.socials, links: draft.links })?.id ?? null : null
  );

  useEffect(() => {
    const saved = draft.socials.find((item) => item.platform === activeSocial);
    setSocialValue(saved ? socialInputValue(saved.url) : "");
    setSocialError(null);
  }, [activeSocial, draft.socials]);

  useEffect(() => {
    if (selectedPresetId || draft.step < 5 || typeof window === "undefined") return;
    const stored = window.sessionStorage.getItem(`trendre-link:preset:${draft.draftId}`);
    const preset = findMatchingOnboardingPreset({ page: draft.page, socials: draft.socials, links: draft.links });
    if (preset && (stored === preset.id || draft.step >= 6)) setSelectedPresetId(preset.id);
  }, [draft.draftId, draft.page, draft.step, selectedPresetId]);

  const data = useMemo<TrendreLinkCanvasData>(() => ({
    page: {
      slug: draft.page.slug || "your-link",
      displayName: draft.page.displayName || "Your name",
      displayNameColor: draft.page.displayNameColor,
      bio: draft.page.bio,
      avatarUrl: avatarPreviewUrl,
      coverUrl: null,
      themeKey: draft.page.themeKey,
      accentColor: draft.page.accentColor,
      buttonStyle: draft.page.buttonStyle,
      fontStyle: draft.page.fontStyle,
      isAcceptingInquiries: draft.page.isAcceptingInquiries,
    },
    items: toCanvasItems(draft),
    inquiryTypes: [],
  }), [avatarPreviewUrl, draft]);

  const setPage = (patch: Partial<AnonymousLinkDraft["page"]>) => onChange({ ...draft, page: { ...draft.page, ...patch } });
  const go = (next: number) => onChange({ ...draft, step: Math.min(Math.max(next, 0), STEP_COUNT - 1) });
  const back = () => step === 0 ? window.history.back() : go(step - 1);

  const saveSocial = () => {
    const normalized = normalizeSocialProfile(activeSocial, socialValue);
    if (!normalized.ok) { setSocialError(normalized.error); return; }
    const found = draft.socials.find((item) => item.platform === activeSocial);
    const next = { clientId: found?.clientId ?? createId(), platform: activeSocial, url: normalized.value.url, metadata: found?.metadata ?? DEFAULT_CREATOR_LINK_ITEM_APPEARANCE, isVisible: true };
    onChange({ ...draft, socials: found ? draft.socials.map((item) => item.platform === activeSocial ? next : item) : [...draft.socials, next] });
    setSocialValue(socialInputValue(normalized.value.url));
    setSocialError(null);
  };
  const removeSocial = (platform: CreatorLinkSocialPlatform) => {
    onChange({ ...draft, socials: draft.socials.filter((item) => item.platform !== platform) });
    if (platform === activeSocial) setSocialValue("");
  };
  const saveLink = () => {
    const result = validateGeneralLink({ title: linkTitle, url: linkUrl });
    if (!result.ok) { setLinkError(result.error); return; }
    const existing = draft.links[0];
    const next = { clientId: existing?.clientId ?? createId(), title: result.value.title, url: result.value.url, metadata: existing?.metadata ?? DEFAULT_CREATOR_LINK_ITEM_APPEARANCE, isVisible: true, sortOrder: 0 };
    onChange({ ...draft, step: 5, links: existing ? [next, ...draft.links.slice(1)] : [next] });
    setLinkError(null);
  };
  const selectPreset = (preset: CreatorLinkOnboardingPreset) => {
    setSelectedPresetId(preset.id);
    window.sessionStorage.setItem(`trendre-link:preset:${draft.draftId}`, preset.id);
    onChange({ ...draft, ...applyLinkDesignPreset(preset, { page: draft.page, socials: draft.socials, links: draft.links }) });
  };
  const normalizedSocial = normalizeSocialProfile(activeSocial, socialValue);
  const validLink = validateGeneralLink({ title: linkTitle, url: linkUrl }).ok;

  if (publishedSlug) return <><PublishedScreen data={{ ...data, page: { ...data.page, slug: publishedSlug } }} slug={publishedSlug} /><MinimalMotionStyles /></>;

  let scene: ReactNode;
  if (step === 0) {
    scene = <StepShell step={0} title="あなたの名前を教えてください" description="公開ページに表示する名前です。あとから変更できます。" onBack={back} footer={<PrimaryButton disabled={!draft.page.displayName.trim()} onClick={() => go(1)}>続ける</PrimaryButton>}><label htmlFor="guest-display-name" className="block text-[13px] font-semibold text-[#5d5853]">表示名<input id="guest-display-name" autoFocus value={draft.page.displayName} maxLength={80} onChange={(event) => setPage({ displayName: event.target.value })} placeholder="例：Anna" className="mt-2 h-16 w-full rounded-2xl border border-[#d9d5d0] bg-white px-5 text-[18px] font-semibold outline-none placeholder:text-[#b8b3ae] focus:border-[#242326] focus:ring-4 focus:ring-black/[.05]" /></label></StepShell>;
  } else if (step === 1) {
    scene = <StepShell step={1} title="公開URLを決めましょう" description="あなた専用のURLです。英小文字・数字・ハイフンが使えます。" onBack={back} footer={<PrimaryButton disabled={slugState !== "available"} onClick={() => go(2)}>続ける</PrimaryButton>}><label htmlFor="guest-link-slug" className="block text-[13px] font-semibold text-[#5d5853]">公開URL<div className="mt-2 flex h-16 overflow-hidden rounded-2xl border border-[#d9d5d0] bg-white focus-within:border-[#242326] focus-within:ring-4 focus-within:ring-black/[.05]"><span className="flex shrink-0 items-center border-r border-[#e7e3df] bg-[#f5f3f0] px-3 text-[13px] text-[#77716b] min-[390px]:px-4">trendre.jp/in/</span><input id="guest-link-slug" value={draft.page.slug} maxLength={30} autoCapitalize="none" autoCorrect="off" spellCheck={false} onChange={(event) => setPage({ slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} className="min-w-0 flex-1 bg-transparent px-3 text-[17px] font-semibold outline-none" /></div></label><p role="status" className={`mt-3 flex min-h-6 items-center gap-1.5 text-[13px] font-medium ${slugState === "available" ? "text-emerald-700" : slugState === "checking" || slugState === "idle" ? "text-[#77716b]" : "text-rose-600"}`}>{slugState === "available" ? <Check className="h-4 w-4" /> : null}{slugMessage}</p></StepShell>;
  } else if (step === 2) {
    const selectAvatar = (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) onAvatar(file);
      event.currentTarget.value = "";
    };
    scene = <StepShell step={2} title="プロフィール写真を追加" description="あなたらしさが伝わる写真を選びましょう。あとから変更できます。" onBack={back} onSkip={() => go(3)} footer={<PrimaryButton onClick={() => go(3)}>{avatarPreviewUrl ? "続ける" : "スキップして続ける"}</PrimaryButton>}><div className="flex flex-col items-center"><div className="relative flex h-[172px] w-[172px] items-center justify-center overflow-hidden rounded-full bg-[#eeeae5] text-[#625d57] ring-1 ring-black/[.06] min-[390px]:h-[184px] min-[390px]:w-[184px]">{avatarPreviewUrl ? <img src={avatarPreviewUrl} alt="プロフィール画像のプレビュー" className="h-full w-full object-cover" /> : <span className="flex flex-col items-center gap-3"><ImagePlus className="h-9 w-9" /><span className="text-sm font-semibold">写真を追加</span></span>}{avatarPreviewUrl ? <span className="absolute bottom-2 right-2 flex h-11 w-11 items-center justify-center rounded-full bg-[#242326] text-white shadow-lg"><Pencil className="h-4 w-4" /></span> : null}</div><div className="mt-6 grid w-full max-w-[340px] gap-2.5"><label className="link-onboarding-press flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#242326] px-5 text-[14px] font-semibold text-white outline-none focus-within:ring-4 focus-within:ring-[#f4b5bc]"><Images className="h-[18px] w-[18px]" /><span>写真ライブラリから選ぶ</span><input type="file" accept="image/*" className="sr-only" onChange={selectAvatar} /></label><label className="link-onboarding-press flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-full border border-[#d9d5d0] bg-white px-5 text-[14px] font-semibold text-[#3f3b37] outline-none focus-within:ring-4 focus-within:ring-[#f4b5bc]"><Camera className="h-[18px] w-[18px]" /><span>写真を撮る</span><input type="file" accept="image/*" capture="user" className="sr-only" onChange={selectAvatar} /></label></div><p className="mt-4 text-center text-[12px] text-[#837d77]">JPEG・PNG・WebP、5MBまで</p></div></StepShell>;
  } else if (step === 3) {
    const savedSocial = draft.socials.find((item) => item.platform === activeSocial);
    scene = <StepShell step={3} title="SNSをつなぎましょう" description="プロフィールに表示したいSNSを追加してください。複数追加できます。" onBack={back} onSkip={() => go(4)} footer={<PrimaryButton onClick={() => go(4)}>{draft.socials.length ? "続ける" : "スキップして続ける"}</PrimaryButton>}><div className="grid grid-cols-4 gap-2" role="tablist" aria-label="SNSを選択">{SOCIALS.map((platform) => { const connected = draft.socials.some((item) => item.platform === platform); const selected = activeSocial === platform; return <button key={platform} type="button" role="tab" aria-selected={selected} onClick={() => setActiveSocial(platform)} className={`link-onboarding-press relative flex min-h-[82px] min-w-0 flex-col items-center justify-center gap-2 rounded-2xl border px-1 outline-none focus-visible:ring-4 focus-visible:ring-rose-100 ${selected ? "border-[#242326] bg-white ring-1 ring-[#242326]" : "border-[#ddd9d4] bg-white"}`}><SocialBrandIcon platform={platform} className="h-6 w-6" /><span className="truncate text-[11px] font-semibold">{socialLabel(platform)}</span>{connected ? <CheckCircle2 className="absolute right-1.5 top-1.5 h-4 w-4 fill-emerald-600 text-white" /> : null}</button>; })}</div><div className="mt-5 rounded-[22px] border border-[#dedad5] bg-white p-3"><label htmlFor="guest-social" className="px-1 text-[12px] font-semibold text-[#5d5853]">{socialLabel(activeSocial)}<div className="mt-2 flex h-14 items-center overflow-hidden rounded-2xl bg-[#f5f3f0] ring-1 ring-inset ring-[#e4e0dc] focus-within:ring-2 focus-within:ring-[#242326]"><span className="shrink-0 pl-3 text-[12px] text-[#77716b]">{socialPrefix(activeSocial)}</span><input id="guest-social" value={socialValue} onChange={(event) => { const raw = event.target.value.trimStart(); setSocialValue(/^https?:\/\//i.test(raw) ? socialInputValue(raw) : raw.replace(/^@/, "")); setSocialError(null); }} placeholder="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} className="h-14 min-w-0 flex-1 bg-transparent px-1.5 pr-3 text-[15px] font-medium outline-none placeholder:text-[#aaa49e]" /></div></label>{socialError ? <p role="alert" className="mt-2 px-1 text-xs text-rose-600">{socialError}</p> : null}<div className="mt-3 flex gap-2"><button type="button" onClick={saveSocial} disabled={!normalizedSocial.ok} className="link-onboarding-press flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#242326] px-4 text-sm font-semibold text-white disabled:pointer-events-none disabled:bg-[#ddd9d4] disabled:text-[#9b958f]">{savedSocial ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{savedSocial ? "更新" : "追加"}</button>{savedSocial ? <button type="button" onClick={() => removeSocial(activeSocial)} className="link-onboarding-press flex h-12 w-12 items-center justify-center rounded-full border border-[#ddd9d4] text-[#77716b]" aria-label={`${socialLabel(activeSocial)}を削除`}><Trash2 className="h-4 w-4" /></button> : null}</div></div>{draft.socials.length ? <div className="mt-3 flex flex-wrap gap-2">{draft.socials.map((item) => <button type="button" key={item.clientId} onClick={() => setActiveSocial(item.platform)} className="link-onboarding-press flex min-h-10 items-center gap-2 rounded-full bg-emerald-50 px-3 text-xs font-semibold text-emerald-800"><SocialBrandIcon platform={item.platform} className="h-4 w-4" />{socialLabel(item.platform)}<Check className="h-3.5 w-3.5" /></button>)}</div> : null}</StepShell>;
  } else if (step === 4) {
    scene = <StepShell step={4} title="最初のリンクを追加" description="活動やコンテンツが伝わるリンクを1つ追加しましょう。" onBack={back} footer={<div><PrimaryButton disabled={!validLink} onClick={saveLink}><Link2 className="h-4 w-4" />リンクを追加して続ける</PrimaryButton><button type="button" onClick={() => go(5)} className="link-onboarding-press mx-auto mt-1 flex min-h-11 items-center justify-center px-5 text-[13px] font-semibold text-[#77716b]">あとで追加する</button></div>}><div className="space-y-4 rounded-[24px] border border-[#dedad5] bg-white p-4"><label className="block text-[12px] font-semibold text-[#5d5853]">リンク名<input value={linkTitle} onChange={(event) => { setLinkTitle(event.target.value); setLinkError(null); }} placeholder="例：最新の投稿を見る" className="mt-2 h-14 w-full rounded-2xl bg-[#f5f3f0] px-4 text-[15px] font-medium outline-none ring-1 ring-inset ring-[#e4e0dc] placeholder:text-[#aaa49e] focus:ring-2 focus:ring-[#242326]" /></label><label className="block text-[12px] font-semibold text-[#5d5853]">URL<input value={linkUrl} onChange={(event) => { setLinkUrl(event.target.value); setLinkError(null); }} placeholder="https://" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} className="mt-2 h-14 w-full rounded-2xl bg-[#f5f3f0] px-4 text-[15px] font-medium outline-none ring-1 ring-inset ring-[#e4e0dc] placeholder:text-[#aaa49e] focus:ring-2 focus:ring-[#242326]" /></label>{linkError ? <p role="alert" className="text-xs text-rose-600">{linkError}</p> : draft.links[0] ? <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" />追加済みのリンクを編集しています</p> : null}</div></StepShell>;
  } else if (step === 5) {
    scene = <StepShell step={5} galleryMode title="好きなスタイルを選ぶ" description="完成デザインから、好きな世界観を1つ選んでください。" onBack={back} footer={<PrimaryButton disabled={!selectedPresetId} onClick={() => go(6)}>このデザインで続ける</PrimaryButton>}><DeferredLinkPresetGrid draft={draft} avatarPreviewUrl={avatarPreviewUrl} selectedPresetId={selectedPresetId} onSelect={selectPreset} /></StepShell>;
  } else {
    scene = <CompleteScreen data={data} slug={draft.page.slug} onBack={back} onPublish={onRequireAuth} />;
  }

  return <><div key={step} className="h-full w-full">{scene}</div><MinimalMotionStyles /></>;
}

function MinimalMotionStyles() {
  return <style jsx global>{`
    @keyframes link-onboarding-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes link-auth-sheet-in{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
    .trendre-link-minimal-onboarding *{box-sizing:border-box}
    .link-onboarding-enter{animation:link-onboarding-in 460ms cubic-bezier(.22,1,.36,1) both}
    .link-onboarding-press{transition:transform 160ms ease,background-color 180ms ease,border-color 180ms ease,color 180ms ease}
    .link-onboarding-press:active:not(:disabled){transform:scale(.98)}
    .link-preset-card:has(.link-preset-hitbox:active){transform:scale(.985)}
    .link-preset-card:has([aria-checked="true"]) .link-preset-visual{transform:scale(1.012);opacity:1}
    .link-preset-visual{opacity:.96}
    .trendre-auth-sheet{animation:link-auth-sheet-in 300ms cubic-bezier(.22,1,.36,1) both}
    .link-complete-phone{width:clamp(220px,66.667vw,294px);height:auto;aspect-ratio:9/19.5;border-radius:42px}
    .link-complete-phone--compact{width:clamp(204px,59vw,268px)}
    .link-complete-hero{display:flex;align-items:center;justify-content:center}
    body:has(.trendre-link-minimal-onboarding){overflow:hidden;overscroll-behavior:none}
    @media(max-height:760px){.link-complete-phone:not(.link-complete-phone--compact){width:clamp(220px,68.75vw,240px)}}
    @media(prefers-reduced-motion:reduce){.link-onboarding-enter,.trendre-auth-sheet{animation:none!important}.link-onboarding-press,.link-preset-card,.link-preset-visual{transition:none!important}.link-onboarding-press:active:not(:disabled),.link-preset-card:has(.link-preset-hitbox:active),.link-preset-card:has([aria-checked="true"]) .link-preset-visual{transform:none!important}}
  `}</style>;
}
