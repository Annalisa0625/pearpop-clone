// File: app/creator/menus/[id]/edit/page.tsx
"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";
import {
  CreatorButton,
  CreatorField,
  CreatorInput,
  CreatorNotice,
  CreatorPage,
  CreatorSkeleton,
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

function platformBadgeClass(platform: string, selected = false) {
  if (selected) {
    return "border-slate-950 bg-slate-950 text-white shadow-[0_10px_22px_rgba(15,23,42,0.12)]";
  }

  if (platform === "Instagram") return "border-violet-200 bg-violet-50 text-violet-700";
  if (platform === "TikTok") return "border-slate-200 bg-white text-slate-900";
  if (platform === "YouTube") return "border-red-100 bg-red-50 text-red-700";
  if (platform === "UGC") return "border-indigo-100 bg-indigo-50 text-indigo-700";
  if (platform === "Visit") return "border-emerald-100 bg-emerald-50 text-emerald-700";

  return "border-slate-200 bg-white text-slate-700";
}

function platformIcon(platform: string) {
  if (platform === "Instagram") return "◎";
  if (platform === "TikTok") return "♪";
  if (platform === "YouTube") return "▶";
  if (platform === "UGC") return "UGC";
  if (platform === "Visit") return "✓";
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
      className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold ${platformBadgeClass(
        platform,
        selected,
      )}`}
    >
      <span className={platform === "UGC" ? "text-[9px]" : "text-[12px]"}>
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
    <section className="overflow-hidden rounded-[30px] bg-white ring-1 ring-slate-100">
      <div className="relative p-5">
        <div className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-gradient-to-br from-rose-100 via-violet-100 to-transparent blur-2xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Menu setup
            </p>
            <h1 className="mt-1 text-[24px] font-semibold tracking-[-0.055em] text-slate-950">
              {title}
            </h1>
            <p className="mt-1 text-[12px] font-medium leading-5 text-slate-500">
              {subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="shrink-0 rounded-full bg-white/80 px-4 py-2.5 text-[13px] font-semibold text-slate-700 ring-1 ring-slate-100 backdrop-blur transition active:scale-[0.98]"
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
    <section className="rounded-[26px] bg-white p-4 ring-1 ring-slate-100 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-950 text-[12px] font-semibold text-white">
          {step}
        </span>
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
      <div className="grid grid-cols-2 gap-2">
        {MENU_OPTIONS.map((option) => {
          const active = value === option.value;
          const platform = derivePlatform(option.value);

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`min-h-[60px] rounded-[20px] px-3 py-2.5 text-left ring-1 transition active:scale-[0.99] ${
                active
                  ? "bg-slate-950 text-white ring-slate-950 shadow-[0_12px_24px_rgba(15,23,42,0.14)]"
                  : "bg-white text-slate-800 ring-slate-100 hover:ring-slate-200"
              }`}
            >
              <div className="flex h-full flex-col justify-between gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex h-6 items-center rounded-full border px-2 text-[10px] font-semibold ${
                      active
                        ? "border-white/10 bg-white/10 text-white"
                        : platformBadgeClass(platform, false)
                    }`}
                  >
                    {platformIcon(platform)}
                  </span>

                  {active ? (
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-[11px] font-black text-slate-950">
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
        <div className="mt-3 rounded-[20px] bg-[#f8f9fb] px-3 py-3 ring-1 ring-slate-100">
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
    <section className="rounded-[28px] bg-white p-4 ring-1 ring-slate-100">
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

type MenuRow = {
  id: string;
  creator_id: string | null;
  title: string | null;
  description: string | null;
  platform: string | null;
  sns: string | null;
  price: number | null;
  currency: string | null;
  deliverables: string | null;
  delivery_days: number | null;
  is_active: boolean | null;
  category: string | null;
  tags: string | null;
  notes: string | null;
  account_url: string | null;
  reference_price_text: string | null;
  allow_secondary_use: boolean | null;
  menu_type: string | null;
};

function inferMenuValue(menu: MenuRow) {
  const title = normalizeText(menu.title);
  const deliverables = normalizeText(menu.deliverables);
  const description = normalizeText(menu.description);
  const platform = normalizeText(menu.platform || menu.sns);
  const menuType = normalizeText(menu.menu_type);
  const category = normalizeText(menu.category);

  const exact = MENU_OPTIONS.find((option) => {
    const value = normalizeText(option.value);
    const labelJa = normalizeText(option.labelJa);
    const labelEn = normalizeText(option.labelEn);

    return (
      title === value ||
      title === labelJa ||
      title === labelEn ||
      deliverables === value ||
      deliverables === labelJa ||
      deliverables === labelEn
    );
  });

  if (exact) return exact.value;

  if (platform.includes("instagram")) {
    if (menuType.includes("story")) return "Instagramストーリーズ";
    if (menuType.includes("short") || menuType.includes("reel")) {
      return "Instagramリール";
    }

    return "Instagram投稿";
  }

  if (platform.includes("tiktok")) return "TikTok投稿";

  if (platform.includes("youtube")) {
    if (menuType.includes("short")) return "YouTubeショート";
    return "YouTube動画";
  }

  if (
    platform.includes("ugc") ||
    category.includes("ugc") ||
    menuType.includes("ugc")
  ) {
    if (
      title.includes("写真") ||
      deliverables.includes("写真") ||
      description.includes("写真") ||
      title.includes("photo") ||
      deliverables.includes("photo") ||
      description.includes("photo")
    ) {
      return "投稿なし・写真素材のみ納品";
    }

    return "投稿なし・動画素材のみ納品";
  }

  if (
    title.includes("イベント") ||
    title.includes("来店") ||
    title.includes("訪問") ||
    platform.includes("event") ||
    platform.includes("イベント") ||
    category.includes("イベント")
  ) {
    return "イベント訪問";
  }

  return "その他";
}

function LoadingEditView() {
  return (
    <CreatorPage>
      <CreatorSkeleton className="h-24" />
      <CreatorSkeleton className="h-72" />
      <CreatorSkeleton className="h-28" />
    </CreatorPage>
  );
}

export default function EditMenuPage() {
  const router = useRouter();
  const params = useParams();
  const menuId = typeof params?.id === "string" ? params.id : "";
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale } = useAppLocale();
  const safeLocale: Locale = locale === "en" ? "en" : "ja";

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            title: "メニュー編集",
            subtitle: "企業に表示される内容を、わかりやすく整えます。",
            back: "戻る",
            save: "更新する",
            saving: "更新中...",
            loading: "読み込み中...",
            loginRequired: "ログインしてください",
            creatorNotFound: "クリエイター情報が見つかりません",
            notFound: "メニューが見つかりませんでした",
            updateFailed: "メニューの更新に失敗しました",
            menu: "メニュー内容",
            menuHelp: "提供できる内容を1つ選択します。",
            price: "価格",
            priceHelp:
              "企業が注文する際の基本価格です。あとからいつでも変更できます。",
            yenOnly: "JPY / 日本円",
            pricePlaceholder: "例：30000",
            secondaryUseTitle: "二次利用",
            secondaryUseBody:
              "納品物は広告ブランドのSNSによって二次利用・引用されることがあります。",
            materialUseNote:
              "素材はブランドのSNSやHPにて使用されることがあります。",
            denySecondaryUse: "二次利用を認めない",
            menuRequired: "メニュー内容を選択してください",
            priceRequired: "価格を入力してください",
            priceInvalid: "価格は1以上の数字で入力してください",
            previewBody: "メニューを選択してください",
            public: "公開中",
            private: "非公開",
          }
        : {
            title: "Edit menu",
            subtitle: "Polish the content shown to brands.",
            back: "Back",
            save: "Update",
            saving: "Updating...",
            loading: "Loading...",
            loginRequired: "Please log in",
            creatorNotFound: "Creator information was not found",
            notFound: "Menu was not found",
            updateFailed: "Failed to update the menu",
            menu: "Menu",
            menuHelp: "Choose one service you can offer.",
            price: "Price",
            priceHelp: "Base price brands will pay when ordering.",
            yenOnly: "JPY / Japanese yen",
            pricePlaceholder: "Example: 30000",
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
            private: "Private",
          },
    [safeLocale],
  );

  const [menuValue, setMenuValue] = useState("");
  const [price, setPrice] = useState("");
  const [secondaryUseDenied, setSecondaryUseDenied] = useState(false);
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const fetchMenu = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError(copy.loginRequired);
        router.push("/login");
        return;
      }

      const { data: creator, error: creatorError } = await supabase
        .from("creators")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (creatorError || !creator) {
        console.error("creator load error:", creatorError);
        setError(copy.creatorNotFound);
        router.push("/creator/menus");
        return;
      }

      const { data, error: menuError } = await supabase
        .from("creator_menus")
        .select("*")
        .eq("id", menuId)
        .eq("creator_id", creator.id)
        .maybeSingle();

      if (menuError || !data) {
        console.error("menu load error:", menuError);
        setError(copy.notFound);
        router.push("/creator/menus");
        return;
      }

      const menu = data as MenuRow;
      const inferredMenuValue = inferMenuValue(menu);

      setMenuValue(inferredMenuValue);
      setPrice(menu.price != null ? String(menu.price) : "");
      setSecondaryUseDenied(
        !isMaterialOnlyMenu(inferredMenuValue) &&
          menu.allow_secondary_use === false,
      );
      setIsActive(menu.is_active);

      setLoading(false);
    };

    if (menuId) {
      void fetchMenu();
    }
  }, [
    menuId,
    router,
    supabase,
    copy.loginRequired,
    copy.creatorNotFound,
    copy.notFound,
  ]);

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
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
      title: selectedMenu.labelJa,
      description: selectedMenu.helpJa,
      platform,
      sns: platform,
      price: priceNumber,
      currency: "JPY",
      deliverables: selectedMenu.labelJa,
      delivery_days: 7,
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

    const { error: updateError } = await supabase
      .from("creator_menus")
      .update(payload)
      .eq("id", menuId)
      .eq("creator_id", creator.id);

    if (updateError) {
      console.error("update error:", updateError);
      setError(copy.updateFailed);
      setSaving(false);
      return;
    }

    router.push("/creator/menus");
  };

  if (loading) {
    return <LoadingEditView />;
  }

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

      <form id="creator-menu-form" onSubmit={handleUpdate} className="space-y-3">
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
          statusLabel={isActive === false ? copy.private : copy.public}
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
