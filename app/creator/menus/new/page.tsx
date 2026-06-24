// File: app/creator/menus/new/page.tsx
"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";
import {
  CreatorButton,
  CreatorField,
  CreatorInput,
  CreatorNotice,
  CreatorPage,
} from "@/app/creator/_components/CreatorDesignSystem";

type Locale = "ja" | "en";

type MenuOption = {
  value: string;
  labelJa: string;
  labelEn: string;
  helpJa: string;
  helpEn: string;
};

type CreatorLite = {
  id: string;
  category: string | null;
};

type SocialAccount = {
  platform: string;
  url: string;
};

const MENU_OPTIONS: MenuOption[] = [
  {
    value: "Instagram投稿",
    labelJa: "Instagram投稿",
    labelEn: "Instagram Feed Post",
    helpJa: "Instagramのフィード投稿として紹介します。",
    helpEn: "A feed post published on Instagram.",
  },
  {
    value: "Instagramリール",
    labelJa: "Instagramリール",
    labelEn: "Instagram Reel",
    helpJa: "Instagramリール動画として投稿します。",
    helpEn: "A short-form video published as an Instagram Reel.",
  },
  {
    value: "Instagramストーリーズ",
    labelJa: "Instagramストーリーズ",
    labelEn: "Instagram Stories",
    helpJa: "Instagramストーリーズで紹介します。",
    helpEn: "A story placement published on Instagram.",
  },
  {
    value: "TikTok投稿",
    labelJa: "TikTok投稿",
    labelEn: "TikTok Video",
    helpJa: "TikTok動画として投稿します。",
    helpEn: "A video published on TikTok.",
  },
  {
    value: "YouTubeショート",
    labelJa: "YouTubeショート",
    labelEn: "YouTube Short",
    helpJa: "YouTube Shortsとして投稿します。",
    helpEn: "A short-form video published on YouTube Shorts.",
  },
  {
    value: "YouTube動画",
    labelJa: "YouTube動画",
    labelEn: "YouTube Video",
    helpJa: "YouTube動画として投稿します。",
    helpEn: "A video published on YouTube.",
  },
  {
    value: "投稿なし・動画素材のみ納品",
    labelJa: "動画素材のみ納品",
    labelEn: "Video asset only",
    helpJa: "広告やSNSで使える動画素材だけを納品します。自分のアカウントには投稿しません。",
    helpEn: "Deliver video assets only. You do not post on your own account.",
  },
  {
    value: "投稿なし・写真素材のみ納品",
    labelJa: "写真素材のみ納品",
    labelEn: "Photo asset only",
    helpJa: "広告やSNSで使える写真素材だけを納品します。自分のアカウントには投稿しません。",
    helpEn: "Deliver photo assets only. You do not post on your own account.",
  },
  {
    value: "イベント訪問",
    labelJa: "イベント訪問",
    labelEn: "Event visit",
    helpJa: "店舗・イベント・展示会などに訪問して投稿または素材制作を行います。",
    helpEn: "Visit an event, store, or location for content creation.",
  },
  {
    value: "その他",
    labelJa: "その他",
    labelEn: "Other",
    helpJa: "上記以外のメニューです。",
    helpEn: "Use this for custom services.",
  },
];

function getMenuLabel(option: MenuOption, locale: Locale) {
  return locale === "ja" ? option.labelJa : option.labelEn;
}

function getMenuHelp(option: MenuOption, locale: Locale) {
  return locale === "ja" ? option.helpJa : option.helpEn;
}

function getSelectedMenu(value: string) {
  return MENU_OPTIONS.find((option) => option.value === value) ?? null;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function derivePlatform(menuValue: string) {
  if (menuValue.startsWith("Instagram")) return "Instagram";
  if (menuValue.startsWith("TikTok")) return "TikTok";
  if (menuValue.startsWith("YouTube")) return "YouTube";

  if (isMaterialOnlyMenu(menuValue)) {
    return "UGC";
  }

  if (menuValue === "イベント訪問") return "Event";

  return "Other";
}

function deriveMenuType(menuValue: string) {
  if (menuValue === "Instagram投稿") return "post";
  if (menuValue === "Instagramリール") return "short_video";
  if (menuValue === "Instagramストーリーズ") return "story";
  if (menuValue === "TikTok投稿") return "short_video";
  if (menuValue === "YouTubeショート") return "short_video";
  if (menuValue === "YouTube動画") return "video";
  if (menuValue === "投稿なし・動画素材のみ納品") return "ugc_video";
  if (menuValue === "投稿なし・写真素材のみ納品") return "ugc_photo";
  if (menuValue === "イベント訪問") return "event_visit";

  return "other";
}

function isMaterialOnlyMenu(menuValue: string) {
  return (
    menuValue === "投稿なし・動画素材のみ納品" ||
    menuValue === "投稿なし・写真素材のみ納品"
  );
}

function formatPrice(value: string, locale: Locale) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    return locale === "ja" ? "未設定" : "Not set";
  }

  try {
    return new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `¥${amount.toLocaleString()}`;
  }
}

function platformTone(platform: string, selected = false) {
  if (platform === "Instagram") {
    return selected
      ? "bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 text-white ring-transparent shadow-[0_10px_24px_rgba(244,63,94,0.18)]"
      : "bg-white text-rose-600 ring-rose-100";
  }

  if (platform === "TikTok") {
    return selected
      ? "bg-slate-950 text-white ring-slate-950"
      : "bg-white text-slate-900 ring-slate-200";
  }

  if (platform === "YouTube") {
    return selected
      ? "bg-red-600 text-white ring-red-600"
      : "bg-white text-red-600 ring-red-100";
  }

  if (platform === "UGC") {
    return selected
      ? "bg-violet-600 text-white ring-violet-600"
      : "bg-white text-violet-700 ring-violet-100";
  }

  if (platform === "Event") {
    return selected
      ? "bg-emerald-600 text-white ring-emerald-600"
      : "bg-white text-emerald-700 ring-emerald-100";
  }

  return selected
    ? "bg-slate-950 text-white ring-slate-950"
    : "bg-white text-slate-600 ring-slate-200";
}

function platformIcon(platform: string) {
  if (platform === "Instagram") return "◎";
  if (platform === "TikTok") return "♪";
  if (platform === "YouTube") return "▶";
  if (platform === "UGC") return "UGC";
  if (platform === "Event") return "✓";
  return "•";
}

function PlatformBadge({
  platform,
  selected = false,
}: {
  platform: string;
  selected?: boolean;
}) {
  return (
    <span
      className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold ring-1 ${platformTone(
        platform,
        selected,
      )}`}
    >
      <span className={platform === "UGC" ? "text-[10px]" : "text-[13px]"}>
        {platformIcon(platform)}
      </span>
      {platform}
    </span>
  );
}

function Header({
  title,
  subtitle,
  backLabel,
  onBack,
}: {
  title: string;
  subtitle: string;
  backLabel: string;
  onBack: () => void;
}) {
  return (
    <section className="rounded-[28px] bg-white p-4 ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold tracking-[-0.045em] text-slate-950">
            {title}
          </h1>
          <p className="mt-1 text-[12px] font-medium leading-5 text-slate-500">
            {subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="shrink-0 rounded-full bg-slate-50 px-4 py-2.5 text-[13px] font-semibold text-slate-700 ring-1 ring-slate-100 transition active:scale-[0.98]"
        >
          {backLabel}
        </button>
      </div>
    </section>
  );
}

function MenuChoiceGrid({
  value,
  locale,
  onChange,
}: {
  value: string;
  locale: Locale;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      {MENU_OPTIONS.map((option) => {
        const active = value === option.value;
        const platform = derivePlatform(option.value);

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-[22px] p-4 text-left ring-1 transition active:scale-[0.99] ${
              active
                ? "bg-slate-950 text-white ring-slate-950"
                : "bg-white text-slate-700 ring-slate-100"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-2">
                  <PlatformBadge platform={platform} selected={active} />
                </div>

                <p className="text-[15px] font-semibold tracking-[-0.035em]">
                  {getMenuLabel(option, locale)}
                </p>

                <p
                  className={`mt-1 text-[12px] font-medium leading-5 ${
                    active ? "text-white/65" : "text-slate-500"
                  }`}
                >
                  {getMenuHelp(option, locale)}
                </p>
              </div>

              {active ? (
                <span className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-white">
                  SELECT
                </span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[24px] bg-white p-4 ring-1 ring-slate-100 sm:p-5">
      <div className="mb-4">
        <h2 className="text-[18px] font-semibold tracking-[-0.04em] text-slate-950">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-[12px] font-medium leading-5 text-slate-500">
            {description}
          </p>
        ) : null}
      </div>

      {children}
    </section>
  );
}

function PreviewCard({
  selectedMenu,
  price,
  locale,
  statusLabel,
  body,
}: {
  selectedMenu: MenuOption | null;
  price: string;
  locale: Locale;
  statusLabel: string;
  body: string;
}) {
  const platform = selectedMenu ? derivePlatform(selectedMenu.value) : "Other";

  return (
    <section className="rounded-[26px] bg-white p-4 ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ff3860]">
            PREVIEW
          </p>
          <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.055em] text-slate-950">
            {selectedMenu ? getMenuLabel(selectedMenu, locale) : body}
          </h2>

          {selectedMenu ? (
            <p className="mt-1 text-[12px] font-medium leading-5 text-slate-500">
              {getMenuHelp(selectedMenu, locale)}
            </p>
          ) : null}
        </div>

        <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
          {statusLabel}
        </span>
      </div>

      <div className="mt-4 rounded-[22px] bg-[#f8f9fb] px-4 py-4 ring-1 ring-slate-100">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <PlatformBadge platform={platform} />
            <p className="mt-3 text-[11px] font-medium text-slate-500">
              {locale === "ja" ? "表示価格" : "Display price"}
            </p>
            <p className="mt-1 whitespace-nowrap text-[28px] font-semibold tracking-[-0.06em] text-slate-950">
              {formatPrice(price, locale)}
            </p>
          </div>

          {selectedMenu ? (
            <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-100">
              {isMaterialOnlyMenu(selectedMenu.value)
                ? locale === "ja"
                  ? "広告素材利用OK"
                  : "Ad usage OK"
                : locale === "ja"
                  ? "広告素材利用なし"
                  : "No ad usage"}
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}

async function getCreatorAndSocials(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  userId: string,
) {
  const { data: creator, error: creatorError } = await supabase
    .from("creators")
    .select("id, category")
    .eq("user_id", userId)
    .maybeSingle();

  if (creatorError || !creator) {
    return { creator: null, socials: [], error: creatorError };
  }

  const { data: socials, error: socialError } = await supabase
    .from("creator_social_accounts")
    .select("platform, url")
    .eq("creator_id", creator.id)
    .order("created_at", { ascending: true });

  return {
    creator: creator as CreatorLite,
    socials: (socials ?? []) as SocialAccount[],
    error: socialError,
  };
}

function resolveAccountUrl(platform: string, socials: SocialAccount[]) {
  const normalizedPlatform = platform.trim().toLowerCase();

  const matched =
    socials.find(
      (social) => social.platform.trim().toLowerCase() === normalizedPlatform,
    ) ?? null;

  if (matched?.url) return matched.url;

  if (platform === "UGC" || platform === "Event" || platform === "Other") {
    return socials[0]?.url ?? null;
  }

  return null;
}

export default function NewMenuPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale } = useAppLocale();
  const safeLocale: Locale = locale === "en" ? "en" : "ja";

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            title: "メニュー作成",
            subtitle:
              "サインアップ時と同じ形式で、企業が注文できるメニューを作成します。",
            back: "戻る",
            save: "作成する",
            saving: "作成中...",
            loginRequired: "ログインしてください",
            creatorNotFound: "クリエイター情報が見つかりません",
            saveFailed: "メニューの保存に失敗しました",
            saveSuccess: "メニューを作成しました",
            menu: "メニュー内容",
            menuHelp: "企業に提供できる内容を1つ選んでください。",
            price: "価格",
            priceHelp:
              "企業が注文する際の基本価格です。あとから編集できます。",
            yenOnly: "JPY / 日本円",
            pricePlaceholder: "例：30000",
            menuRequired: "メニュー内容を選択してください",
            priceRequired: "価格を入力してください",
            priceInvalid: "価格は1以上の数字で入力してください",
            previewBody: "メニューを選択してください",
            public: "公開中",
            autoPublic:
              "作成したメニューは公開中として保存されます。非公開にしたい場合は、一覧から切り替えできます。",
          }
        : {
            title: "Create menu",
            subtitle:
              "Create an orderable menu using the same format as creator signup.",
            back: "Back",
            save: "Create",
            saving: "Creating...",
            loginRequired: "Please log in",
            creatorNotFound: "Creator information was not found",
            saveFailed: "Failed to save the menu",
            saveSuccess: "Menu created successfully",
            menu: "Menu",
            menuHelp: "Choose one service you can offer to brands.",
            price: "Price",
            priceHelp: "Base price brands will pay when ordering.",
            yenOnly: "JPY / Japanese yen",
            pricePlaceholder: "Example: 30000",
            menuRequired: "Please select a menu",
            priceRequired: "Please enter a price",
            priceInvalid: "Price must be a number greater than 0",
            previewBody: "Select a menu",
            public: "Public",
            autoPublic:
              "The menu will be saved as public. You can make it private from the menu list.",
          },
    [safeLocale],
  );

  const [menuValue, setMenuValue] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMenu = getSelectedMenu(menuValue);

  const validate = () => {
    if (!selectedMenu) return copy.menuRequired;
    if (!price.trim()) return copy.priceRequired;

    const priceNumber = Number(price);

    if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
      return copy.priceInvalid;
    }

    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const validationMessage = validate();

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    if (!selectedMenu) return;

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError(copy.loginRequired);
      setSaving(false);
      router.push("/login");
      return;
    }

    const {
      creator,
      socials,
      error: loadError,
    } = await getCreatorAndSocials(supabase, user.id);

    if (loadError || !creator) {
      console.error("creator/social load error:", loadError);
      setError(copy.creatorNotFound);
      setSaving(false);
      return;
    }

    const priceNumber = Number(price);
    const now = new Date().toISOString();
    const platform = derivePlatform(selectedMenu.value);
    const menuType = deriveMenuType(selectedMenu.value);

    const payload = {
      creator_id: creator.id,
      title: selectedMenu.labelJa,
      description: selectedMenu.helpJa,
      platform,
      sns: platform,
      price: priceNumber,
      currency: "JPY",
      deliverables: selectedMenu.labelJa,
      delivery_days: 7,
      is_active: true,
      category: creator.category || null,
      tags: null,
      notes: null,
      account_url: resolveAccountUrl(platform, socials),
      reference_price_text: null,
      allow_secondary_use: isMaterialOnlyMenu(selectedMenu.value),
      menu_type: menuType,
      updated_at: now,
    };

    const { error: insertError } = await supabase
      .from("creator_menus")
      .insert([payload]);

    if (insertError) {
      console.error("save error:", insertError);
      setError(copy.saveFailed);
      setSaving(false);
      return;
    }

    router.push("/creator/menus");
  };

  return (
    <CreatorPage>
      <Header
        title={copy.title}
        subtitle={copy.subtitle}
        backLabel={copy.back}
        onBack={() => router.push("/creator/menus")}
      />

      {error ? (
        <CreatorNotice tone="red" title="Error" description={error} />
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-3">
        <SectionCard title={copy.menu} description={copy.menuHelp}>
          <MenuChoiceGrid
            value={menuValue}
            locale={safeLocale}
            onChange={setMenuValue}
          />
        </SectionCard>

        <SectionCard title={copy.price} description={copy.priceHelp}>
          <CreatorField label={copy.price} help={copy.yenOnly}>
            <CreatorInput
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder={copy.pricePlaceholder}
            />
          </CreatorField>
        </SectionCard>

        <PreviewCard
          selectedMenu={selectedMenu}
          price={price}
          locale={safeLocale}
          statusLabel={copy.public}
          body={copy.previewBody}
        />

        <p className="px-1 text-[12px] font-medium leading-5 text-slate-500">
          {copy.autoPublic}
        </p>

        <CreatorButton type="submit" disabled={saving} className="w-full">
          {saving ? copy.saving : copy.save}
        </CreatorButton>
      </form>
    </CreatorPage>
  );
}
