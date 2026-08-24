"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, Check, Copy, ExternalLink, Images, Link2, Pencil, Plus } from "lucide-react";
import SocialBrandIcon from "@/components/trendre-link/SocialBrandIcon";
import StylePresetGallery from "@/components/trendre-link/StylePresetGallery";
import TrendreLinkCanvas, { TRENDRE_LINK_LOGICAL_CANVAS_HEIGHT, TRENDRE_LINK_LOGICAL_CANVAS_WIDTH, type TrendreLinkCanvasData } from "@/components/trendre-link/TrendreLinkCanvas";
import type { CreatorLinkButtonStyle, CreatorLinkFontStyle, CreatorLinkTheme } from "@/lib/trendre-link/constants";
import type { CreatorLinkSocialPlatform } from "@/lib/trendre-link/item-validation";
import { CREATOR_LINK_SOCIAL_SERVICES, getCreatorLinkService, normalizeCreatorLinkServiceInput } from "@/lib/trendre-link/service-registry";
import { findMatchingOnboardingPreset, type CreatorLinkOnboardingPreset } from "@/lib/trendre-link/onboarding-presets";
import { OnboardingMotionStyles } from "./LinkOnboardingScene";

export type OnboardingLinkForm = {
  slug: string;
  displayName: string;
  displayNameColor: string | null;
  bio: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  themeKey: CreatorLinkTheme;
  accentColor: string | null;
  buttonStyle: CreatorLinkButtonStyle;
  fontStyle: CreatorLinkFontStyle;
};

type Props = {
  step: number;
  form: OnboardingLinkForm;
  previewData: TrendreLinkCanvasData;
  slugState: "idle" | "checking" | "available" | "unavailable" | "invalid";
  slugMessage: string;
  slugError: string | null;
  uploadingImage: boolean;
  completing: boolean;
  completionReady: boolean;
  publicUrl: string;
  socialInputs: Record<CreatorLinkSocialPlatform, string>;
  savedSocials: CreatorLinkSocialPlatform[];
  socialSaving: boolean;
  onStepChange: (step: number) => void;
  onChange: (patch: Partial<OnboardingLinkForm>) => void;
  onSelectAvatar: (file: File) => void;
  onSocialChange: (platform: CreatorLinkSocialPlatform, value: string) => void;
  onSaveSocial: (platform: CreatorLinkSocialPlatform) => Promise<boolean>;
  onAddLink: () => void;
  onApplyPreset: (preset: CreatorLinkOnboardingPreset) => Promise<boolean>;
  onComplete: () => Promise<boolean>;
  onCopyPublicUrl: () => void;
  onFinish: () => void;
};

const STEP_COUNT = 7;
const SOCIALS: CreatorLinkSocialPlatform[] = [...CREATOR_LINK_SOCIAL_SERVICES];

function PrimaryButton({ disabled, onClick, children = "続ける" }: { disabled?: boolean; onClick: () => void; children?: ReactNode }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="onboarding-press flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-white px-6 text-[15px] font-semibold text-[#171717] outline-none focus-visible:ring-4 focus-visible:ring-white/25 disabled:pointer-events-none disabled:bg-[#343434] disabled:text-white/[.38]">{children}</button>;
}

function StepShell({ step, title, description, galleryMode = false, onBack, children, footer }: { step: number; title: string; description: string; galleryMode?: boolean; onBack: () => void; children: ReactNode; footer: ReactNode }) {
  return <div className="trendre-link-onboarding relative mx-auto flex h-[100dvh] min-h-0 w-full max-w-[456px] flex-col overflow-hidden bg-[#141414] text-white">
    <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-[-9rem] h-80 w-80 rounded-full bg-[#ed5964]/12 blur-3xl" />
    <header className="relative z-10 flex h-[calc(58px+env(safe-area-inset-top))] shrink-0 items-end gap-3 px-4 pb-2 pt-[env(safe-area-inset-top)]"><button type="button" onClick={onBack} aria-label="戻る" className="onboarding-press flex h-11 w-11 items-center justify-center rounded-full text-white/75 outline-none focus-visible:ring-4 focus-visible:ring-white/20"><ArrowLeft className="h-5 w-5" /></button><div className="mb-5 flex h-1 flex-1 gap-1" role="progressbar" aria-valuemin={1} aria-valuemax={STEP_COUNT} aria-valuenow={step + 1}>{Array.from({ length: STEP_COUNT }, (_, index) => <span key={index} className={`h-1 flex-1 rounded-full transition-colors duration-200 ${index <= step ? "bg-[#ed5964]" : "bg-white/14"}`} />)}</div><span className="flex h-11 w-11 items-center justify-center text-xs tabular-nums text-white/45">{step + 1}/{STEP_COUNT}</span></header>
    <main className={`relative z-10 min-h-0 flex-1 px-5 pb-4 pt-3 ${galleryMode ? "flex flex-col overflow-hidden" : "overflow-y-auto overscroll-contain [scrollbar-width:none]"}`}><div className="onboarding-enter mx-auto w-full max-w-[400px] shrink-0 text-center"><h1 className="text-balance text-[29px] font-bold leading-[1.14] tracking-[-.045em]">{title}</h1><p className="mx-auto mt-2 max-w-[370px] text-[13px] leading-[1.6] text-white/55">{description}</p></div><div className={`onboarding-enter mx-auto w-full max-w-[400px] [animation-delay:80ms] ${galleryMode ? "mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2 [scrollbar-width:none]" : "mt-7"}`}>{children}</div></main>
    <footer className="relative z-20 shrink-0 bg-gradient-to-t from-[#141414] via-[#141414] to-[#141414]/85 px-5 pb-[max(.9rem,env(safe-area-inset-bottom))] pt-3"><div className="mx-auto max-w-[400px]">{footer}</div></footer>
  </div>;
}

function Phone({ data }: { data: TrendreLinkCanvasData }) {
  const width = 180;
  const scale = width / TRENDRE_LINK_LOGICAL_CANVAS_WIDTH;
  const height = TRENDRE_LINK_LOGICAL_CANVAS_HEIGHT * scale;

  return <div style={{ width, height }} className="mx-auto overflow-hidden rounded-[30px] border-[5px] border-black bg-black shadow-[0_25px_65px_rgba(0,0,0,.42)]"><div style={{ width: TRENDRE_LINK_LOGICAL_CANVAS_WIDTH, transform: `scale(${scale})` }} className="pointer-events-none origin-top-left"><TrendreLinkCanvas data={data} mode="preview" locale="ja" /></div></div>;
}

export default function CreatorLinkOnboarding(props: Props) {
  const step = Math.min(Math.max(props.step, 0), STEP_COUNT - 1);
  const [activeSocial, setActiveSocial] = useState<CreatorLinkSocialPlatform>("instagram");
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(() => findMatchingOnboardingPreset({ page: props.form, socials: props.previewData.items.filter((item) => item.itemType === "social"), links: props.previewData.items.filter((item) => item.itemType === "link") })?.id ?? null);
  useEffect(() => { document.body.classList.add("trendre-link-onboarding-active"); return () => document.body.classList.remove("trendre-link-onboarding-active"); }, []);
  const back = () => step > 0 ? props.onStepChange(step - 1) : props.onFinish();
  const styles = <><OnboardingMotionStyles /><style jsx global>{`body.trendre-link-onboarding-active .creator-link-workspace>nav{display:none!important}.link-preset-renderer>div,.link-preset-renderer>div>div{min-height:854px!important}.link-preset-card:has(.link-preset-hitbox:active){transform:scale(.985)}@media(prefers-reduced-motion:reduce){.link-preset-card{transition:none!important}.link-preset-card:has(.link-preset-hitbox:active){transform:none!important}}`}</style></>;

  let scene: ReactNode;
  if (step === 0) {
    scene = <StepShell step={step} title="表示名を決めましょう" description="公開ページに表示する名前です。あとから変更できます。" onBack={back} footer={<PrimaryButton disabled={!props.form.displayName.trim()} onClick={() => props.onStepChange(1)} />}><label className="block text-[13px] font-medium text-white/60">表示名<input autoFocus value={props.form.displayName} maxLength={80} onChange={(event) => props.onChange({ displayName: event.target.value })} className="mt-2 h-16 w-full rounded-2xl border border-white/14 bg-white/[.08] px-5 text-lg font-semibold text-white outline-none focus:border-white/45" /></label></StepShell>;
  } else if (step === 1) {
    const available = props.slugState === "available" && !props.slugError;
    scene = <StepShell step={step} title="公開URLを決めましょう" description="あなた専用のURLです。公開後も変更できます。" onBack={back} footer={<PrimaryButton disabled={!available} onClick={() => props.onStepChange(2)} />}><div className="flex h-16 overflow-hidden rounded-2xl border border-white/14 bg-white/[.08] focus-within:border-white/45"><span className="flex items-center border-r border-white/10 px-3 text-[13px] text-white/45">trendre.jp/in/</span><input value={props.form.slug} maxLength={30} onChange={(event) => props.onChange({ slug: event.target.value })} className="min-w-0 flex-1 bg-transparent px-3 text-[17px] font-semibold text-white outline-none" /></div><p className={`mt-3 text-[13px] ${available ? "text-emerald-300" : "text-rose-300"}`}>{props.slugMessage}</p></StepShell>;
  } else if (step === 2) {
    scene = <StepShell step={step} title="プロフィール写真を追加" description="すべてのスタイルで、写真は見やすい丸型に表示されます。" onBack={back} footer={<PrimaryButton onClick={() => props.onStepChange(3)}>{props.form.avatarUrl ? "続ける" : "あとで追加する"}</PrimaryButton>}><div className="flex flex-col items-center"><label className="onboarding-press relative flex h-44 w-44 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-white/10 ring-1 ring-white/20 focus-within:ring-4 focus-within:ring-white/25">{props.form.avatarUrl ? <img src={props.form.avatarUrl} alt="プロフィール写真" className="h-full w-full object-cover" /> : <span className="flex flex-col items-center gap-2 text-white/60"><Plus className="h-8 w-8" />写真を選択</span>}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={props.uploadingImage} onChange={(event) => { const file = event.target.files?.[0]; if (file) props.onSelectAvatar(file); event.currentTarget.value = ""; }} />{props.form.avatarUrl ? <span className="absolute bottom-2 right-2 flex h-11 w-11 items-center justify-center rounded-full bg-white text-black"><Pencil className="h-4 w-4" /></span> : null}</label><p className="mt-5 flex items-center gap-2 text-xs text-white/45"><Images className="h-4 w-4" />JPEG・PNG・WebP / 5MBまで</p></div></StepShell>;
  } else if (step === 3) {
    const saved = props.savedSocials.includes(activeSocial);
    const service = getCreatorLinkService(activeSocial);
    scene = <StepShell step={step} title="SNSをつなぎましょう" description="複数追加できます。あとから追加・編集もできます。" onBack={back} footer={<PrimaryButton onClick={() => props.onStepChange(4)}>{props.savedSocials.length ? "続ける" : "スキップして続ける"}</PrimaryButton>}><div className="space-y-5"><div className="flex justify-center gap-2">{SOCIALS.map((platform) => <button key={platform} type="button" onClick={() => setActiveSocial(platform)} aria-label={getCreatorLinkService(platform).labelEn} className={`onboarding-press relative flex h-12 w-12 items-center justify-center rounded-full ${activeSocial === platform ? "bg-white text-black" : "bg-white/10 text-white"}`}><SocialBrandIcon platform={platform} />{props.savedSocials.includes(platform) ? <Check className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-emerald-400 p-0.5 text-black" /> : null}</button>)}</div><div className="flex gap-2"><div className="flex h-14 min-w-0 flex-1 overflow-hidden rounded-2xl border border-white/14 bg-white/[.08] focus-within:border-white/45"><span className="flex shrink-0 items-center border-r border-white/10 px-2.5 text-xs text-white/45">{service.displayPrefix}</span><input value={props.socialInputs[activeSocial]} onChange={(event) => { const raw = event.target.value; const normalized = normalizeCreatorLinkServiceInput(activeSocial, raw); props.onSocialChange(activeSocial, normalized.ok ? normalized.value.editableValue : raw.replace(/^@+/, "")); }} placeholder={service.placeholder} autoCapitalize="none" autoCorrect="off" spellCheck={false} className="min-w-0 flex-1 bg-transparent px-3 text-white outline-none" /></div><button type="button" disabled={props.socialSaving || !props.socialInputs[activeSocial].trim()} onClick={() => void props.onSaveSocial(activeSocial)} className="onboarding-press min-w-[78px] rounded-2xl bg-white px-3 text-sm font-semibold text-black disabled:bg-white/15 disabled:text-white/30">{saved ? "更新" : "追加"}</button></div></div></StepShell>;
  } else if (step === 4) {
    scene = <StepShell step={step} title="最初のリンクを追加" description="活動やコンテンツが伝わるリンクを、まずは1つだけ。" onBack={back} footer={<div className="space-y-1"><PrimaryButton onClick={props.onAddLink}><Link2 className="h-4 w-4" />リンクを追加</PrimaryButton><button type="button" onClick={() => props.onStepChange(5)} className="min-h-11 w-full text-sm text-white/50">あとで追加する</button></div>}><Phone data={props.previewData} /></StepShell>;
  } else if (step === 5) {
    scene = <StepShell step={step} galleryMode title="スタイルを選びましょう" description="完成デザインを1つ選ぶだけ。細かな調整は公開後にできます。" onBack={back} footer={<PrimaryButton disabled={!selectedPresetId} onClick={() => props.onStepChange(6)}>このスタイルで続ける</PrimaryButton>}><StylePresetGallery data={props.previewData} selectedPresetId={selectedPresetId} onSelect={(preset) => { const previousPresetId = selectedPresetId; setSelectedPresetId(preset.id); void props.onApplyPreset(preset).then((saved) => { if (!saved) setSelectedPresetId(previousPresetId); }); }} /></StepShell>;
  } else {
    scene = <StepShell step={step} title="あなたのLinkができました" description="選んだスタイルと実際のプロフィール内容を確認して公開できます。" onBack={back} footer={props.completionReady ? <div className="space-y-1"><PrimaryButton onClick={props.onFinish}>編集を続ける</PrimaryButton><Link href={`/in/${props.form.slug}`} target="_blank" className="flex min-h-11 items-center justify-center gap-2 text-sm font-semibold text-white/65"><ExternalLink className="h-4 w-4" />公開ページを見る</Link></div> : <PrimaryButton disabled={props.completing} onClick={() => void props.onComplete()}>{props.completing ? "公開しています…" : "Linkを公開する"}</PrimaryButton>}><div><Phone data={props.previewData} /><div className="mx-auto mt-4 flex max-w-[330px] items-center gap-2 rounded-2xl border border-white/12 bg-white/[.07] p-2 pl-4"><span className="min-w-0 flex-1 truncate text-xs text-white/60">{props.publicUrl}</span><button type="button" onClick={props.onCopyPublicUrl} className="flex h-10 items-center gap-1 rounded-xl bg-white/10 px-3 text-xs"><Copy className="h-3.5 w-3.5" />コピー</button></div></div></StepShell>;
  }
  return <>{styles}{scene}</>;
}
