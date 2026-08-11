"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { signInWithGoogle } from "@/lib/auth/google-oauth";
import { createAnonymousLinkDraft, clearAnonymousLinkDraft, isCurrentAnonymousLinkMigration, loadAnonymousLinkDraft, saveAnonymousLinkDraft, type AnonymousLinkDraft } from "@/lib/trendre-link/anonymous-draft";
import { deleteAnonymousDraftImage, loadAnonymousDraftImage, saveAnonymousDraftImage } from "@/lib/trendre-link/anonymous-draft-images";
import { validateCreatorLinkSlug } from "@/lib/trendre-link/slug";
import DeferredLinkOnboarding from "./_components/DeferredLinkOnboarding";
import DeferredLinkAuthSheet from "./_components/DeferredLinkAuthSheet";
import ProfileImageCropModal from "@/app/creator/link/_components/ProfileImageCropModal";

type SlugState = "idle" | "checking" | "available" | "unavailable" | "invalid";
type Bootstrap = { ok: true; isNewLink: boolean; page: { id: string; slug: string } };

function errorMessage(error: unknown) { return error instanceof Error ? error.message : "処理を完了できませんでした。もう一度お試しください。"; }

function emailSignupErrorMessage(error: unknown) {
  const candidate = error && typeof error === "object" ? error as Record<string, unknown> : {};
  const code = typeof candidate.code === "string" ? candidate.code.toLowerCase() : "";
  const name = typeof candidate.name === "string" ? candidate.name : "";
  const message = typeof candidate.message === "string" ? candidate.message.toLowerCase() : "";
  if (code === "over_email_send_rate_limit" || /rate limit|too many requests/.test(message)) return "メール送信の上限に達しています。時間を置いてもう一度お試しください。";
  if (code === "user_already_exists" || code === "email_exists" || /already registered|user already exists/.test(message)) return "このメールアドレスはすでに登録されています。";
  if (code === "weak_password" || /password.*(short|weak)|weak.*password/.test(message)) return "パスワードは8文字以上で入力してください。";
  if (/invalid.*email|email.*invalid/.test(message)) return "メールアドレスを確認してください。";
  if (name === "AuthRetryableFetchError" || /fetch|network|load failed/.test(message)) return "メール登録を完了できませんでした。通信状況を確認してもう一度お試しください。";
  return "メール登録を完了できませんでした。入力内容を確認してもう一度お試しください。";
}

export default function SignupLinkClient() {
  const params = useSearchParams();
  const [draft, setDraft] = useState<AnonymousLinkDraft | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const avatarUrlRef = useRef<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [slugState, setSlugState] = useState<SlugState>("idle");
  const [slugMessage, setSlugMessage] = useState("公開URLを入力してください");
  const [authOpen, setAuthOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const emailSignupInFlightRef = useRef(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);

  const replaceAvatarPreview = (file: File | null) => {
    if (avatarUrlRef.current) URL.revokeObjectURL(avatarUrlRef.current);
    const next = file ? URL.createObjectURL(file) : null;
    avatarUrlRef.current = next;
    setAvatarUrl(next);
  };

  useEffect(() => {
    const initial = loadAnonymousLinkDraft() ?? createAnonymousLinkDraft();
    setDraft(initial);
    void (async () => { if (initial.page.avatarAssetId) replaceAvatarPreview(await loadAnonymousDraftImage(initial.page.avatarAssetId)); })();
    return () => { if (avatarUrlRef.current) URL.revokeObjectURL(avatarUrlRef.current); };
  }, []);

  useEffect(() => { if (draft) saveAnonymousLinkDraft(draft); }, [draft]);

  useEffect(() => {
    if (!draft) return;
    const result = validateCreatorLinkSlug(draft.page.slug);
    if (!result.valid) { setSlugState("invalid"); setSlugMessage(result.reason === "required" ? "公開URLを入力してください" : "3〜30文字の英小文字・数字・ハイフンを使えます"); return; }
    setSlugState("checking"); setSlugMessage("確認中…");
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/creator/link/slug-availability?slug=${encodeURIComponent(result.normalizedSlug)}`, { signal: controller.signal });
        const data = await response.json() as { ok?: boolean; available?: boolean };
        if (!response.ok || !data.ok) throw new Error();
        setSlugState(data.available ? "available" : "unavailable");
        setSlugMessage(data.available ? "利用できます" : "このURLはすでに使用されています");
      } catch { if (!controller.signal.aborted) { setSlugState("unavailable"); setSlugMessage("URLを確認できませんでした"); } }
    }, 350);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [draft?.page.slug]);

  const updateDraft = (next: AnonymousLinkDraft) => setDraft({ ...next, updatedAt: new Date().toISOString() });
  const selectAvatar = (file: File) => {
    const type = file.type.toLowerCase();
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (["image/heic", "image/heif"].includes(type) || extension === "heic" || extension === "heif") {
      setNotice("HEIC・HEIF形式には対応していません。JPEGまたはPNGに変換して選択してください。");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(type) || file.size > 5 * 1024 * 1024) { setNotice("JPEG、PNG、WebPの5MB以下の画像を選んでください。"); return; }
    setCropFile(file);
  };
  const persistAvatar = async (file: File) => {
    if (!draft) return false;
    const assetId = draft.page.avatarAssetId ?? `${draft.draftId}:avatar`;
    try {
      await saveAnonymousDraftImage(assetId, file, file.name);
    } catch (error) {
      throw new Error("anonymous_avatar_indexeddb_save_failed", { cause: error });
    }
    try {
      replaceAvatarPreview(file);
    } catch (error) {
      throw new Error("anonymous_avatar_preview_url_failed", { cause: error });
    }
    updateDraft({ ...draft, page: { ...draft.page, avatarAssetId: assetId } });
    return true;
  };

  const migrateAndPublish = async ({ allowBusy = false }: { allowBusy?: boolean } = {}) => {
    if (!draft || (busy && !allowBusy)) return;
    setBusy(true); setAuthError(null); setNotice("Linkを保存しています…");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) throw new Error("認証が完了していません。メール確認後、同じブラウザで戻ってください。");
      const bootstrapResponse = await fetch("/api/creator/link/bootstrap", { method: "POST", credentials: "include" });
      const bootstrap = await bootstrapResponse.json() as Bootstrap | { ok?: false; error?: string };
      if (!bootstrapResponse.ok || !("ok" in bootstrap) || !bootstrap.ok) throw new Error("error" in bootstrap ? bootstrap.error : "Linkページを準備できませんでした。");
      const userId = sessionData.session.user.id;
      const isValidResume = isCurrentAnonymousLinkMigration(draft.migration, userId, bootstrap.page.id);
      if (!bootstrap.isNewLink && !isValidResume) throw new Error("既存のLinkページは上書きしません。作成中の下書きはこの端末に残っています。");
      const pageId = bootstrap.page.id;
      const bootstrappedDraft = { ...draft, migration: { phase: "bootstrapped" as const, pageId, userId: sessionData.session.user.id } };
      updateDraft(bootstrappedDraft);
      let uploadedAvatarUrl: string | null = null;
      if (draft.page.avatarAssetId) {
        const file = await loadAnonymousDraftImage(draft.page.avatarAssetId);
        if (!file) throw new Error("プロフィール画像を復元できませんでした。画像をもう一度選択してください。");
        updateDraft({ ...bootstrappedDraft, migration: { phase: "uploading", pageId, userId: sessionData.session.user.id } });
        const form = new FormData(); form.append("file", file); form.append("kind", "avatar");
        const imageResponse = await fetch("/api/creator/link/images", { method: "POST", credentials: "include", body: form });
        const image = await imageResponse.json() as { ok?: boolean; url?: string; error?: string };
        if (!imageResponse.ok || !image.ok || !image.url) throw new Error(image.error ?? "画像を保存できませんでした。");
        uploadedAvatarUrl = image.url;
      }
      const current = { ...bootstrappedDraft, migration: { phase: "hydrating" as const, pageId, userId: sessionData.session.user.id } };
      updateDraft(current);
      const hydrateResponse = await fetch("/api/creator/link/hydrate-draft", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pageId, draft: { ...current, avatarUrl: uploadedAvatarUrl, coverUrl: null } }) });
      const hydrated = await hydrateResponse.json() as { ok?: boolean; slug?: string; error?: string };
      if (!hydrateResponse.ok || !hydrated.ok || !hydrated.slug) throw new Error(hydrated.error ?? "下書きを反映できませんでした。");
      const publishResponse = await fetch("/api/creator/link/page", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pageId, displayName: draft.page.displayName, displayNameColor: draft.page.displayNameColor, bio: draft.page.bio, slug: hydrated.slug, themeKey: draft.page.themeKey, accentColor: draft.page.accentColor, buttonStyle: draft.page.buttonStyle, fontStyle: draft.page.fontStyle, avatarUrl: uploadedAvatarUrl, coverUrl: null, isAcceptingInquiries: draft.page.isAcceptingInquiries, status: "published" }) });
      const published = await publishResponse.json() as { ok?: boolean; error?: string };
      if (!publishResponse.ok || !published.ok) throw new Error(published.error ?? "公開できませんでした。");
      await deleteAnonymousDraftImage(draft.page.avatarAssetId);
      clearAnonymousLinkDraft();
      setAuthOpen(false);
      setNotice(null);
      setPublishedSlug(hydrated.slug);
    } catch (error) { setAuthError(errorMessage(error)); setNotice(null); setAuthOpen(true); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    if (!draft) return;
    const returnFromAuth = params.get("oauth") === "1" || params.get("email-confirmed") === "1";
    if (!returnFromAuth) return;
    void (async () => { const { data } = await supabase.auth.getSession(); if (data.session?.user) await migrateAndPublish(); else setNotice("メール確認を完了した後、同じブラウザでこの画面に戻ってください。下書きは保存されています。"); })();
  // Only handle an OAuth/email return once after draft hydration.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.draftId, params]);

  const startGoogle = async () => {
    if (!draft) return;
    saveAnonymousLinkDraft({ ...draft, migration: { ...draft.migration, phase: "auth" } });
    setBusy(true); setAuthError(null);
    const { error } = await signInWithGoogle(`${window.location.origin}/signup/link?oauth=1&draft=1`);
    if (error) { setBusy(false); setAuthError("Googleログインを開始できませんでした。"); }
  };
  const startEmail = async (email: string, password: string) => {
    if (!draft || busy || emailSignupInFlightRef.current) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) { setAuthError("メールアドレスを確認してください。"); return; }
    if (password.length < 8) { setAuthError("パスワードは8文字以上で入力してください。"); return; }
    saveAnonymousLinkDraft({ ...draft, migration: { ...draft.migration, phase: "auth" } });
    emailSignupInFlightRef.current = true;
    setEmailSubmitting(true); setBusy(true); setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { emailRedirectTo: `${window.location.origin}/signup/link?email-confirmed=1&draft=1` },
      });
      if (error) {
        setAuthError(emailSignupErrorMessage(error));
        return;
      }
      if (data.session) {
        await migrateAndPublish({ allowBusy: true });
        return;
      }
      setAuthOpen(false);
      setNotice("確認メールを送信しました。同じ端末・同じブラウザでメール確認を完了してください。下書きは保存されています。");
    } catch (error) {
      setAuthError(emailSignupErrorMessage(error));
    } finally {
      emailSignupInFlightRef.current = false;
      setEmailSubmitting(false); setBusy(false);
    }
  };

  if (!draft) return <main className="grid min-h-dvh place-items-center bg-[#141414] text-sm text-white/60">読み込み中…</main>;
  return <><DeferredLinkOnboarding draft={draft} avatarPreviewUrl={avatarUrl} slugState={slugState} slugMessage={slugMessage} publishedSlug={publishedSlug} onChange={updateDraft} onAvatar={selectAvatar} onRequireAuth={() => { setAuthError(null); setAuthOpen(true); }} />{notice ? <div className="fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-[110] mx-auto max-w-md rounded-2xl bg-[#242326] px-4 py-3 text-sm text-white shadow-xl" role="status">{notice}</div> : null}<DeferredLinkAuthSheet open={authOpen} busy={busy} emailSubmitting={emailSubmitting} error={authError} onClose={() => setAuthOpen(false)} onGoogle={() => void startGoogle()} onEmail={(email, password) => void startEmail(email, password)} />{cropFile ? <ProfileImageCropModal file={cropFile} locale="ja" onCancel={() => setCropFile(null)} onConfirm={async (file) => { const saved = await persistAvatar(file); if (saved) setCropFile(null); return saved; }} /> : null}</>;
}
