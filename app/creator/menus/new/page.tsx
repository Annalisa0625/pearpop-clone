// File: app/creator/menus/new/page.tsx
"use client";

import {
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Clapperboard, Circle, MapPin } from "lucide-react";
import { FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa6";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";
import {
  CreatorButton,
  CreatorField,
  CreatorInput,
  CreatorNotice,
  CreatorPage,
  CreatorStickyFooter,
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
  if (isMaterialOnlyMenu(menuValue)) return "UGC";
  if (menuValue === "イベント訪問") return "Visit";

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

function parseYenInput(value: string) {
  const digits = value.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
}

function formatYenInput(value: string) {
  const digits = value.replace(/[^0-9]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("ja-JP");
}

function formatPrice(value: string, locale: Locale) {
  const amount = parseYenInput(value);

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

function platformBadgeClass(platform: string, selected = false) {
  void platform;
  if (selected) {
    return "border-rose-300 bg-rose-50 text-slate-950";
  }
  return "border-slate-200 bg-white text-slate-700";
}

function platformIcon(platform: string) {
  if (platform === "Instagram") return <FaInstagram className="h-[19px] w-[19px]" aria-hidden="true" />;
  if (platform === "TikTok") return <FaTiktok className="h-[18px] w-[18px]" aria-hidden="true" />;
  if (platform === "YouTube") return <FaYoutube className="h-[19px] w-[19px]" aria-hidden="true" />;
  if (platform === "UGC") return <Clapperboard className="h-[19px] w-[19px]" aria-hidden="true" />;
  if (platform === "Visit") return <MapPin className="h-[19px] w-[19px]" aria-hidden="true" />;
  return <Circle className="h-[16px] w-[16px]" aria-hidden="true" />;
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
      className={`inline-flex h-7 items-center gap-1.5 rounded-[9px] border px-2.5 text-[11px] font-semibold ${platformBadgeClass(
        platform,
        selected,
      )}`}
    >
      <span className="flex h-5 w-5 items-center justify-center">
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
    <section className="px-1 pb-2 pt-2 sm:px-2 sm:pb-4">
      <div className="relative">
        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Menu setup
            </p>
            <h1 className="mt-1 text-[30px] font-semibold tracking-[-0.055em] text-slate-950 sm:text-[34px]">
              {title}
            </h1>
            <p className="mt-2 max-w-lg text-[14px] font-normal leading-6 text-slate-600">
              {subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="min-h-11 shrink-0 rounded-[13px] bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700 ring-1 ring-slate-200 outline-none transition focus-visible:ring-2 focus-visible:ring-rose-200 active:scale-[0.98]"
          >
            {backLabel}
          </button>
        </div>
      </div>
    </section>
  );
}

function SectionCard({
  step,
  title,
  description,
  children,
}: {
  step: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-slate-200/80 py-7 sm:py-9">
      <div className="mb-4">
        <p className="mb-1 text-[11px] font-semibold tracking-[0.14em] text-[#d92f50]">{step}</p>
        <div className="min-w-0">
          <h2 className="text-[18px] font-semibold tracking-[-0.04em] text-slate-950">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-[12px] font-medium leading-5 text-slate-500">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      {children}
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
  const selectedMenu = getSelectedMenu(value);

  return (
    <div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {MENU_OPTIONS.map((option) => {
          const active = value === option.value;
          const platform = derivePlatform(option.value);

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              className={`min-h-[76px] rounded-[14px] px-4 py-3 text-left outline-none transition duration-150 focus-visible:ring-2 focus-visible:ring-rose-200 active:scale-[0.99] motion-reduce:transition-none ${
                active
                  ? "bg-rose-50 text-slate-950 ring-2 ring-[#ed3155]"
                  : "bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex h-full flex-col justify-between gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex h-6 items-center rounded-full border px-2 text-[10px] font-semibold ${
                      active
                        ? "border-slate-200 bg-white text-slate-700"
                        : platformBadgeClass(platform, false)
                    }`}
                  >
                    {platformIcon(platform)}
                  </span>

                  {active ? (
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-[#ed3155] text-[11px] font-semibold text-white">
                      ✓
                    </span>
                  ) : null}
                </div>

                <p className="line-clamp-2 text-[12px] font-semibold leading-4 tracking-[-0.025em]">
                  {getMenuLabel(option, locale)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {selectedMenu ? (
        <div className="mt-4 border-l-2 border-rose-400 pl-4">
          <div className="flex items-start gap-2">
            <PlatformBadge platform={derivePlatform(selectedMenu.value)} />
            <p className="min-w-0 flex-1 text-[12px] font-medium leading-5 text-slate-600">
              {getMenuHelp(selectedMenu, locale)}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PreviewCard({
  selectedMenu,
  price,
  locale,
  statusLabel,
  body,
  secondaryUseDenied,
}: {
  selectedMenu: MenuOption | null;
  price: string;
  locale: Locale;
  statusLabel: string;
  body: string;
  secondaryUseDenied: boolean;
}) {
  const platform = selectedMenu ? derivePlatform(selectedMenu.value) : "Other";
  const isMaterial = selectedMenu ? isMaterialOnlyMenu(selectedMenu.value) : false;

  return (
    <section className="rounded-[22px] bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Preview
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

        <span className="shrink-0 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700">
          {statusLabel}
        </span>
      </div>

      <div className="mt-5 border-t border-slate-200/80 pt-5">
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
            <span
              className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                secondaryUseDenied
                  ? "border-amber-100 bg-amber-50 text-amber-700"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              {isMaterial
                ? locale === "ja"
                  ? "素材利用あり"
                  : "Asset use"
                : secondaryUseDenied
                  ? locale === "ja"
                    ? "二次利用不可"
                    : "No reuse"
                  : locale === "ja"
                    ? "二次利用可"
                    : "Reuse OK"}
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

  if (platform === "UGC" || platform === "Visit" || platform === "Other") {
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
            subtitle: "企業が注文しやすい形で、販売メニューを作成します。",
            back: "戻る",
            save: "作成する",
            saving: "作成中...",
            loginRequired: "ログインしてください",
            creatorNotFound: "クリエイター情報が見つかりません",
            saveFailed: "メニューの保存に失敗しました",
            menu: "SNS種別",
            menuHelp: "販売するSNS種別・納品内容を1つ選択します。",
            price: "価格",
            priceHelp: "企業が注文する際の基本価格です。",
            yenOnly: "JPY / 日本円",
            pricePlaceholder: "例）11,000",
            secondaryUseTitle: "二次利用",
            secondaryUseBody:
              "納品物は広告ブランドのSNSによって二次利用・引用されることがあります。",
            materialUseNote:
              "素材はブランドのSNSやHPにて使用されることがあります。",
            denySecondaryUse: "二次利用を認めない",
            menuRequired: "SNS種別を選択してください",
            priceRequired: "価格を入力してください",
            priceInvalid: "価格は1以上の数字で入力してください",
            previewBody: "メニューを選択してください",
            public: "公開中",
          }
        : {
            title: "Create menu",
            subtitle: "Create a clean, orderable menu for brands.",
            back: "Back",
            save: "Create",
            saving: "Creating...",
            loginRequired: "Please log in",
            creatorNotFound: "Creator information was not found",
            saveFailed: "Failed to save the menu",
            menu: "SNS type",
            menuHelp: "Choose one SNS type or deliverable you can offer.",
            price: "Price",
            priceHelp: "Base price brands will pay when ordering.",
            yenOnly: "JPY / Japanese yen",
            pricePlaceholder: "Example: 11,000",
            secondaryUseTitle: "Secondary use",
            secondaryUseBody:
              "Deliverables may be reused or quoted by the brand on its social accounts.",
            materialUseNote:
              "Assets may be used on the brand's social accounts or website.",
            denySecondaryUse: "Do not allow secondary use",
            menuRequired: "Please select a menu",
            priceRequired: "Please enter a price",
            priceInvalid: "Price must be a number greater than 0",
            previewBody: "Select a menu",
            public: "Public",
          },
    [safeLocale],
  );

  const [menuValue, setMenuValue] = useState("");
  const [price, setPrice] = useState("");
  const [secondaryUseDenied, setSecondaryUseDenied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMenu = getSelectedMenu(menuValue);

  const validate = () => {
    if (!selectedMenu) return copy.menuRequired;
    if (!price.trim()) return copy.priceRequired;

    const priceNumber = parseYenInput(price);

    if (priceNumber <= 0) {
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

    const priceNumber = parseYenInput(price);
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
      allow_secondary_use: isMaterialOnlyMenu(selectedMenu.value)
        ? true
        : !secondaryUseDenied,
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

      <form id="creator-menu-form" onSubmit={handleSubmit} className="space-y-3">
        <SectionCard step="1" title={copy.menu} description={copy.menuHelp}>
          <MenuChoiceGrid
            value={menuValue}
            locale={safeLocale}
            onChange={(nextValue) => {
              setMenuValue(nextValue);
              if (isMaterialOnlyMenu(nextValue)) {
                setSecondaryUseDenied(false);
              }
            }}
          />
        </SectionCard>

        <SectionCard step="2" title={copy.price} description={copy.priceHelp}>
          <CreatorField label={copy.price} help={copy.yenOnly}>
            <CreatorInput
              type="text"
              inputMode="numeric"
              value={price}
              onChange={(event) => setPrice(formatYenInput(event.target.value))}
              placeholder={copy.pricePlaceholder}
            />
          </CreatorField>
        </SectionCard>

        {selectedMenu ? (
          <SectionCard
            step="3"
            title={copy.secondaryUseTitle}
            description={
              isMaterialOnlyMenu(selectedMenu.value)
                ? copy.materialUseNote
                : copy.secondaryUseBody
            }
          >
            {isMaterialOnlyMenu(selectedMenu.value) ? (
              <p className="rounded-[18px] bg-[#f8f9fb] px-3 py-3 text-[12px] font-medium leading-5 text-slate-600 ring-1 ring-slate-100">
                {copy.materialUseNote}
              </p>
            ) : (
              <label className="flex items-start gap-3 rounded-[18px] bg-[#f8f9fb] px-3 py-3 ring-1 ring-slate-100">
                <input
                  type="checkbox"
                  checked={secondaryUseDenied}
                  onChange={(event) => setSecondaryUseDenied(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-950"
                />
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-slate-800">
                    {copy.denySecondaryUse}
                  </span>
                  <span className="mt-1 block text-[11px] font-medium leading-5 text-slate-500">
                    {copy.secondaryUseBody}
                  </span>
                </span>
              </label>
            )}
          </SectionCard>
        ) : null}

        <PreviewCard
          selectedMenu={selectedMenu}
          price={price}
          locale={safeLocale}
          statusLabel={copy.public}
          body={copy.previewBody}
          secondaryUseDenied={secondaryUseDenied}
        />
      </form>

      <CreatorStickyFooter>
        <CreatorButton
          type="submit"
          form="creator-menu-form"
          disabled={saving}
          className="w-full"
        >
          {saving ? copy.saving : copy.save}
        </CreatorButton>
      </CreatorStickyFooter>
    </CreatorPage>
  );
}
