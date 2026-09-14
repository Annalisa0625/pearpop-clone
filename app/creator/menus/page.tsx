// File: app/creator/menus/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clapperboard, Circle, MapPin } from "lucide-react";
import { FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa6";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";
import type { AppLocale } from "@/lib/i18n/types";
import { creatorLocaleTags } from "@/lib/i18n/creatorDashboard";
import { creatorMenuCommonDictionary, creatorMenuFormatDictionary, creatorMenuListDictionary, localizeCreatorMenuRecord } from "@/lib/i18n/creatorMenus";
import { useCreatorOnlyRelease } from "../CreatorReleaseMode";
import {
  CreatorNotice,
  CreatorPage,
  CreatorSkeleton,
} from "@/app/creator/_components/CreatorDesignSystem";
import { isCreatorPaidMarketplaceEnabled } from "@/lib/creator/marketplaceAvailability";

type CreatorMenu = {
  id: string;
  creator_id: string | null;
  title: string;
  description: string | null;
  platform: string | null;
  price: number | null;
  currency: string;
  deliverables: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  tags: string | null;
  category: string | null;
  delivery_days: number | null;
  sns: string | null;
  notes: string | null;
  account_url: string | null;
  reference_price_text: string | null;
  allow_secondary_use: boolean;
  menu_type: string | null;
  sort_order: number;
};

type SocialAccount = {
  platform: string;
  url: string;
};

function formatPrice(
  value: number | null,
  currency: string | null | undefined,
  legacyReferenceText: string | null,
  locale: AppLocale,
) {
  const safeCurrency = currency || "JPY";

  if (value != null) {
    try {
      return new Intl.NumberFormat(creatorLocaleTags[locale], {
        style: "currency",
        currency: safeCurrency,
        maximumFractionDigits: safeCurrency === "JPY" ? 0 : 2,
      }).format(value);
    } catch {
      if (safeCurrency === "USD") return `$${value.toLocaleString()}`;
      return `¥${value.toLocaleString()}`;
    }
  }

  if (legacyReferenceText?.trim()) return legacyReferenceText.trim();

  return creatorMenuCommonDictionary[locale].notSet;
}

function normalizePlatform(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function inferPlatform(menu: CreatorMenu) {
  const raw = `${menu.platform ?? ""} ${menu.sns ?? ""} ${menu.title ?? ""}`.toLowerCase();

  if (raw.includes("instagram")) return "Instagram";
  if (raw.includes("tiktok")) return "TikTok";
  if (raw.includes("youtube")) return "YouTube";
  if (raw.includes("ugc") || raw.includes("素材") || raw.includes("投稿なし")) return "UGC";
  if (raw.includes("event") || raw.includes("イベント") || raw.includes("訪問")) return "Visit";

  return menu.platform || menu.sns || "Menu";
}

function menuFormatLabel(menu: CreatorMenu, locale: AppLocale) {
  const title = menu.title ?? "";
  const labels = creatorMenuFormatDictionary[locale];

  if (title.includes("Instagram投稿")) return labels.post;
  if (title.includes("Instagramリール")) return labels.reel;
  if (title.includes("Instagramストーリーズ")) return labels.stories;
  if (title.includes("TikTok")) return labels.video;
  if (title.includes("YouTubeショート")) return labels.short;
  if (title.includes("YouTube動画")) return labels.video;
  if (title.includes("動画素材")) return labels.videoAsset;
  if (title.includes("写真素材")) return labels.photoAsset;
  if (title.includes("イベント")) return labels.visit;
  return labels[menu.menu_type ?? ""] || creatorMenuCommonDictionary[locale].genericMenu;
}

function platformBadgeClass(platform: string) {
  void platform;
  return "text-slate-600";
}

function platformIcon(platform: string) {
  if (platform === "Instagram") return <FaInstagram className="h-[19px] w-[19px]" aria-hidden="true" />;
  if (platform === "TikTok") return <FaTiktok className="h-[18px] w-[18px]" aria-hidden="true" />;
  if (platform === "YouTube") return <FaYoutube className="h-[19px] w-[19px]" aria-hidden="true" />;
  if (platform === "UGC") return <Clapperboard className="h-[19px] w-[19px]" aria-hidden="true" />;
  if (platform === "Visit") return <MapPin className="h-[19px] w-[19px]" aria-hidden="true" />;
  return <Circle className="h-[16px] w-[16px]" aria-hidden="true" />;
}

function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span
      className={`inline-flex h-7 items-center gap-1.5 text-[11px] font-semibold ${platformBadgeClass(
        platform,
      )}`}
    >
      <span className="flex h-5 w-5 items-center justify-center">
        {platformIcon(platform)}
      </span>
      {platform}
    </span>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="m9 5 7 7-7 7"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EmptyMenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
      <path
        d="M6 7h12M6 12h12M6 17h7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LoadingView() {
  return (
    <CreatorPage>
      <CreatorSkeleton className="h-24" />
      <CreatorSkeleton className="h-20" />
      <CreatorSkeleton className="h-32" />
      <CreatorSkeleton className="h-32" />
    </CreatorPage>
  );
}

function Header({
  title,
  subtitle,
  createLabel,
  menus,
  serviceCount,
}: {
  title: string;
  subtitle: string;
  createLabel: string;
  menus: CreatorMenu[];
  serviceCount: (all: number, live: number) => string;
}) {
  const publicCount = menus.filter((menu) => !!menu.is_active).length;

  return (
    <section className="px-1 pb-2 pt-2 sm:px-2 sm:pb-4">
      <div className="relative">

        <div className="relative flex items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0 sm:flex-1">
            <h1 className="text-[28px] font-semibold tracking-[-0.055em] text-slate-950 sm:text-[34px]">
              {title}
            </h1>
            <p className="mt-2 hidden max-w-lg text-[14px] font-normal leading-6 text-slate-600 sm:block">
              {subtitle}
            </p>
          </div>

          <Link
            href="/creator/menus/new"
            className="min-h-11 shrink-0 rounded-[13px] bg-slate-950 px-4 py-2.5 text-[13px] font-semibold text-white outline-none transition duration-150 focus-visible:ring-4 focus-visible:ring-slate-200 active:scale-[0.98] motion-reduce:transition-none"
          >
            + {createLabel}
          </Link>
        </div>

        <p className="mt-2 text-[12px] font-medium text-slate-500 sm:mt-4 sm:text-[13px]">
          {serviceCount(menus.length, publicCount)}
        </p>
      </div>
    </section>
  );
}

function MenuCard({
  menu,
  locale,
  copy,
  accountUrl,
  isLoading,
  onToggle,
  onDelete,
}: {
  menu: CreatorMenu;
  locale: AppLocale;
  copy: {
    price: string;
    viewAccount: string;
    edit: string;
    delete: string;
    deleting: string;
    updating: string;
    makePrivate: string;
    makePublic: string;
    secondaryUseDenied: string;
    legacyPriceNotice: string;
  };
  accountUrl: string | null;
  isLoading: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const isPublic = !!menu.is_active;
  const commonCopy = creatorMenuCommonDictionary[locale];
  const visibilityLabel = isPublic ? commonCopy.live : commonCopy.private;
  const inferredPlatform = inferPlatform(menu);
  const platform = inferredPlatform === "Menu" ? commonCopy.genericMenu : inferredPlatform;
  const localizedMenu = localizeCreatorMenuRecord(locale, menu.title, menu.description);
  const hasLegacyReferenceOnly =
    menu.price == null && !!menu.reference_price_text?.trim();
  const deniedSecondaryUse = menu.allow_secondary_use === false;

  return (
    <article className="group flex min-h-[176px] flex-col rounded-[22px] bg-white p-4 transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] motion-reduce:transition-none">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <PlatformBadge platform={platform} />
            <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-slate-500">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isPublic ? "bg-emerald-500" : "bg-slate-300"}`} aria-hidden="true" />
              <span className="truncate">{visibilityLabel} · {menuFormatLabel(menu, locale)}</span>
            </div>
          </div>

          <div className="mt-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="line-clamp-1 text-[17px] font-semibold leading-6 tracking-[-0.04em] text-slate-950">
                {localizedMenu.title}
              </h2>

            {localizedMenu.description?.trim() ? (
                <p className="mt-0.5 line-clamp-1 text-[12px] font-normal leading-5 text-slate-600">
                  {localizedMenu.description.trim()}
                </p>
              ) : null}
            </div>

            <Link
              href={`/creator/menus/${menu.id}/edit`}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-slate-50 text-slate-400 ring-1 ring-slate-200/70 outline-none transition focus-visible:ring-2 focus-visible:ring-rose-200 active:scale-95"
              aria-label={copy.edit}
            >
              <ChevronIcon />
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3 pb-2 pt-1">
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-slate-500">{copy.price}</p>
          <p className="mt-0.5 whitespace-nowrap text-[24px] font-semibold tracking-[-0.06em] tabular-nums text-slate-950">
            {formatPrice(
              menu.price,
              menu.currency,
              menu.reference_price_text,
              locale,
            )}
          </p>
        </div>

        {deniedSecondaryUse ? (
          <span className="shrink-0 text-[11px] font-medium text-amber-700">
            {copy.secondaryUseDenied}
          </span>
        ) : null}
      </div>

      <details className="group/manage border-t border-slate-100 pt-1">
        <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between text-[12px] font-medium text-slate-500 outline-none focus-visible:ring-2 focus-visible:ring-rose-200 [&::-webkit-details-marker]:hidden">
          <span>{commonCopy.manage}</span>
          <span className="text-lg leading-none tracking-[0.12em] text-slate-400" aria-hidden="true">•••</span>
        </summary>

        {(accountUrl || hasLegacyReferenceOnly) && (
          <div className="mb-3 flex flex-wrap gap-2">
          {accountUrl ? (
            <a
              href={accountUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200 transition active:scale-[0.98]"
            >
              {copy.viewAccount}
            </a>
          ) : null}

          {hasLegacyReferenceOnly ? (
            <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-800">
              {copy.legacyPriceNotice}
            </span>
          ) : null}
          </div>
        )}

        <div className="grid grid-cols-[minmax(0,1fr)_86px] gap-2 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={onToggle}
          disabled={isLoading}
          className={`h-11 rounded-[12px] text-[12px] font-semibold outline-none transition duration-150 focus-visible:ring-2 focus-visible:ring-slate-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none ${
            isPublic
              ? "bg-slate-50 text-slate-700"
              : "bg-slate-950 text-white shadow-[0_12px_22px_rgba(15,23,42,0.12)]"
          }`}
        >
          {isLoading
            ? copy.updating
            : isPublic
              ? copy.makePrivate
              : copy.makePublic}
        </button>

        <button
          type="button"
          onClick={onDelete}
          disabled={isLoading}
          className="h-11 rounded-[12px] text-[12px] font-medium text-slate-400 outline-none transition duration-150 hover:bg-rose-50 hover:text-rose-700 focus-visible:ring-2 focus-visible:ring-rose-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
        >
          {isLoading ? copy.deleting : copy.delete}
        </button>
        </div>
      </details>
    </article>
  );
}

function EmptyState({
  title,
  body,
  createLabel,
}: {
  title: string;
  body: string;
  createLabel: string;
}) {
  return (
    <section className="rounded-[24px] border border-slate-200/70 bg-white px-5 py-10 text-center shadow-[0_2px_12px_rgba(15,23,42,0.03)]">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-slate-50 text-slate-300 ring-1 ring-slate-100">
        <EmptyMenuIcon />
      </div>

      <h2 className="mt-5 text-[17px] font-semibold tracking-[-0.04em] text-slate-950">
        {title}
      </h2>

      <p className="mx-auto mt-2 max-w-sm text-[13px] font-medium leading-6 text-slate-500">
        {body}
      </p>

      <Link
        href="/creator/menus/new"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-[13px] bg-slate-950 px-5 text-[13px] font-semibold text-white outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
      >
        + {createLabel}
      </Link>
    </section>
  );
}

export default function CreatorMenusPage() {
  const [menus, setMenus] = useState<CreatorMenu[]>([]);
  const [socials, setSocials] = useState<SocialAccount[]>([]);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [paidMarketplaceEnabled, setPaidMarketplaceEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale } = useAppLocale();
  const isCreatorOnly = useCreatorOnlyRelease();

  const listCopy = creatorMenuListDictionary[locale];
  const copy = {
    ...listCopy,
    empty: isCreatorOnly ? listCopy.emptyCreatorOnly : listCopy.emptyMarketplace,
    legacyPriceNotice: isCreatorOnly ? listCopy.legacyCreatorOnly : listCopy.legacyMarketplace,
    errorTitle: creatorMenuCommonDictionary[locale].errorTitle,
  };

  const fetchMenus = async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.alert(copy.loginRequired);
      router.push("/login");
      setLoading(false);
      return;
    }

    const { data: creator, error: creatorError } = await supabase
      .from("creators")
      .select("id, country")
      .eq("user_id", user.id)
      .maybeSingle();

    if (creatorError || !creator) {
      console.error("creator load error:", creatorError);
      setError(copy.creatorNotFound);
      setLoading(false);
      return;
    }

    if (!isCreatorPaidMarketplaceEnabled(creator.country)) {
      setPaidMarketplaceEnabled(false);
      setLoading(false);
      router.replace("/creator/profile");
      return;
    }

    setCreatorId(creator.id);
    setPaidMarketplaceEnabled(true);

    const [
      { data: menuRows, error: menuError },
      { data: socialRows, error: socialError },
    ] = await Promise.all([
      supabase
        .from("creator_menus")
        .select("*")
        .eq("creator_id", creator.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase
        .from("creator_social_accounts")
        .select("platform, url")
        .eq("creator_id", creator.id)
        .order("created_at", { ascending: true }),
    ]);

    if (menuError || socialError) {
      console.error("menu/social load error:", { menuError, socialError });
      setError(copy.loadFailed);
      setMenus([]);
      setSocials([]);
      setLoading(false);
      return;
    }

    setMenus((menuRows || []) as CreatorMenu[]);
    setSocials((socialRows || []) as SocialAccount[]);
    setLoading(false);
  };

  useEffect(() => {
    void fetchMenus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canMutatePaidMenu = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data: creator } = await supabase
      .from("creators")
      .select("id, country")
      .eq("user_id", user.id)
      .maybeSingle();
    return creator?.id === creatorId &&
      isCreatorPaidMarketplaceEnabled(creator?.country);
  };

  const toggleActive = async (id: string, current: boolean | null) => {
    if (!paidMarketplaceEnabled) return;
    if (!(await canMutatePaidMenu())) {
      router.replace("/creator/profile");
      return;
    }
    setActionLoadingId(id);

    let query = supabase
      .from("creator_menus")
      .update({
        is_active: !current,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (creatorId) {
      query = query.eq("creator_id", creatorId);
    }

    const { error: updateError } = await query;

    setActionLoadingId(null);

    if (updateError) {
      console.error("visibility toggle error:", updateError);
      window.alert(copy.toggleFailed);
      return;
    }

    void fetchMenus();
  };

  const handleDelete = async (id: string) => {
    if (!paidMarketplaceEnabled) return;
    if (!(await canMutatePaidMenu())) {
      router.replace("/creator/profile");
      return;
    }
    if (!window.confirm(copy.confirmDelete)) return;

    setActionLoadingId(id);

    let query = supabase.from("creator_menus").delete().eq("id", id);

    if (creatorId) {
      query = query.eq("creator_id", creatorId);
    }

    const { error: deleteError } = await query;

    setActionLoadingId(null);

    if (deleteError) {
      console.error("delete error:", deleteError);
      window.alert(copy.deleteFailed);
      return;
    }

    setMenus((prev) => prev.filter((menu) => menu.id !== id));
  };

  const socialMap = useMemo(() => {
    const map = new Map<string, string[]>();

    for (const social of socials) {
      const key = normalizePlatform(social.platform);
      const current = map.get(key) ?? [];
      current.push(social.url);
      map.set(key, current);
    }

    return map;
  }, [socials]);

  const resolveAccountUrl = (menu: CreatorMenu) => {
    if (menu.account_url?.trim()) return menu.account_url.trim();

    const matchedByPlatform = socialMap.get(normalizePlatform(menu.platform));
    if (matchedByPlatform && matchedByPlatform.length > 0) {
      return matchedByPlatform[0];
    }

    const matchedBySns = socialMap.get(normalizePlatform(menu.sns));
    if (matchedBySns && matchedBySns.length > 0) {
      return matchedBySns[0];
    }

    const inferred = inferPlatform(menu);
    const matchedByInferred = socialMap.get(normalizePlatform(inferred));
    if (matchedByInferred && matchedByInferred.length > 0) {
      return matchedByInferred[0];
    }

    return null;
  };

  if (loading) {
    return <LoadingView />;
  }

  return (
    <CreatorPage>
      <Header
        title={copy.title}
        subtitle={copy.subtitle}
        createLabel={copy.createNew}
        menus={menus}
        serviceCount={copy.serviceCount}
      />

      {error ? (
        <CreatorNotice
          tone="red"
          title={copy.errorTitle}
          description={error}
        />
      ) : null}

      {menus.length === 0 ? (
        <EmptyState
          title={copy.emptyTitle}
          body={copy.empty}
          createLabel={copy.createNew}
        />
      ) : (
        <section className="grid gap-3 md:grid-cols-2">
          {menus.map((menu) => (
            <MenuCard
              key={menu.id}
              menu={menu}
              locale={locale}
              copy={copy}
              accountUrl={resolveAccountUrl(menu)}
              isLoading={actionLoadingId === menu.id}
              onToggle={() => toggleActive(menu.id, menu.is_active)}
              onDelete={() => handleDelete(menu.id)}
            />
          ))}
        </section>
      )}
    </CreatorPage>
  );
}
