// File: app/creator/menus/new/page.tsx
"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";
import {
  CreatorBadge,
  CreatorButton,
  CreatorCard,
  CreatorField,
  CreatorHero,
  CreatorInput,
  CreatorNotice,
  CreatorPage,
  CreatorSelect,
} from "@/app/creator/_components/CreatorDesignSystem";

type LocaleOption = {
  value: string;
  ja: string;
  en: string;
};

const PLATFORM_OPTIONS: LocaleOption[] = [
  { value: "Instagram", ja: "Instagram", en: "Instagram" },
  { value: "TikTok", ja: "TikTok", en: "TikTok" },
  { value: "YouTube", ja: "YouTube", en: "YouTube" },
  { value: "X", ja: "X", en: "X" },
  { value: "UGC", ja: "UGC制作", en: "UGC creation" },
];

const MENU_TYPE_OPTIONS: LocaleOption[] = [
  { value: "post", ja: "投稿", en: "Post" },
  { value: "short_video", ja: "ショート動画", en: "Short video" },
  { value: "story", ja: "ストーリー", en: "Story" },
  { value: "video", ja: "動画", en: "Video" },
  { value: "ugc", ja: "UGC制作", en: "UGC creation" },
  { value: "package", ja: "セット", en: "Package" },
  { value: "other", ja: "その他", en: "Other" },
];

const CATEGORY_OPTIONS: LocaleOption[] = [
  { value: "美容", ja: "美容", en: "Beauty" },
  { value: "ファッション", ja: "ファッション", en: "Fashion" },
  { value: "グルメ", ja: "グルメ", en: "Food" },
  { value: "旅行", ja: "旅行", en: "Travel" },
  { value: "ライフスタイル", ja: "ライフスタイル", en: "Lifestyle" },
  { value: "フィットネス", ja: "フィットネス", en: "Fitness" },
  { value: "子育て", ja: "子育て", en: "Parenting" },
  { value: "ガジェット", ja: "ガジェット", en: "Gadgets" },
  { value: "エンタメ", ja: "エンタメ", en: "Entertainment" },
  { value: "ビジネス", ja: "ビジネス", en: "Business" },
  { value: "教育", ja: "教育", en: "Education" },
  { value: "その他", ja: "その他", en: "Other" },
];

const DELIVERY_OPTIONS = [3, 5, 7, 10, 14, 21, 30];

function optionLabel(option: LocaleOption, locale: "ja" | "en") {
  return locale === "ja" ? option.ja : option.en;
}

function findLabel(
  options: LocaleOption[],
  value: string,
  locale: "ja" | "en"
) {
  return (
    options.find((option) => option.value === value)?.[locale] ||
    options.find((option) => option.value === value)?.ja ||
    value
  );
}

function createMenuTitle({
  platform,
  menuType,
  locale,
}: {
  platform: string;
  menuType: string;
  locale: "ja" | "en";
}) {
  if (!platform || !menuType) {
    return locale === "ja" ? "メニュー名は自動生成されます" : "Menu title";
  }

  const menuTypeText = findLabel(MENU_TYPE_OPTIONS, menuType, locale);

  if (platform === "UGC") {
    return locale === "ja" ? "UGC制作" : "UGC creation";
  }

  return `${platform}${locale === "ja" ? menuTypeText : ` ${menuTypeText}`}`;
}

function formatPrice(value: string, locale: "ja" | "en") {
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

function PlatformIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="2" />
      <path
        d="M16.8 7.2h.01"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PriceIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="m7 5 5 7 5-7M12 12v7M8 13h8M8 16h8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="m6 12 4 4 8-8"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function NewMenuPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale } = useAppLocale();
  const safeLocale: "ja" | "en" = locale === "en" ? "en" : "ja";

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            title: "メニュー作成",
            subtitle:
              "企業が注文できる投稿メニューを作成します。必要な情報だけをシンプルに登録します。",
            back: "戻る",
            save: "作成する",
            saving: "作成中...",
            loginRequired: "ログインしてください",
            creatorNotFound: "クリエイター情報が見つかりません",
            saveFailed: "メニューの保存に失敗しました",
            saveSuccess: "メニューを作成しました",
            platform: "対応SNS",
            menuType: "メニュー種別",
            category: "ジャンル",
            price: "価格",
            deliveryDays: "目安",
            deliveryHelp:
              "企業には、注文後どれくらいで投稿・納品できるかの目安として表示されます。",
            secondaryUse: "二次利用",
            secondaryUseHelp:
              "企業が投稿内容を広告やLPなどで再利用できるかを選びます。",
            publicStatus: "公開状態",
            publicHelp:
              "公開すると、企業側のクリエイター詳細ページに表示されます。",
            publicOn: "公開する",
            publicOff: "下書きにする",
            allow: "許可する",
            disallow: "許可しない",
            selectPlease: "選択してください",
            yenOnly: "JPY / 日本円",
            pricePlaceholder: "例：30000",
            platformRequired: "対応SNSを選択してください",
            menuTypeRequired: "メニュー種別を選択してください",
            categoryRequired: "ジャンルを選択してください",
            priceRequired: "価格を入力してください",
            priceInvalid: "価格は1以上の数字で入力してください",
            deliveryDaysRequired: "目安を選択してください",
            preview: "プレビュー",
            previewBody:
              "企業側にはこのようなメニューとして表示されます。",
            menuName: "メニュー名",
            notSet: "未設定",
            visible: "公開中",
            draft: "下書き",
          }
        : {
            title: "Create menu",
            subtitle:
              "Create a simple orderable menu for brands with only the necessary details.",
            back: "Back",
            save: "Create",
            saving: "Creating...",
            loginRequired: "Please log in",
            creatorNotFound: "Creator information was not found",
            saveFailed: "Failed to save the menu",
            saveSuccess: "Menu created successfully",
            platform: "Platform",
            menuType: "Menu type",
            category: "Genre",
            price: "Price",
            deliveryDays: "Delivery estimate",
            deliveryHelp:
              "Shown to brands as an estimate for posting or delivery after ordering.",
            secondaryUse: "Secondary use",
            secondaryUseHelp:
              "Choose whether brands can reuse delivered content in ads or landing pages.",
            publicStatus: "Visibility",
            publicHelp:
              "Public menus are shown on the brand-facing creator detail page.",
            publicOn: "Publish",
            publicOff: "Save as draft",
            allow: "Allow",
            disallow: "Do not allow",
            selectPlease: "Please select",
            yenOnly: "JPY / Japanese yen",
            pricePlaceholder: "Example: 30000",
            platformRequired: "Please select a platform",
            menuTypeRequired: "Please select a menu type",
            categoryRequired: "Please select a genre",
            priceRequired: "Please enter a price",
            priceInvalid: "Price must be a number greater than 0",
            deliveryDaysRequired: "Please select a delivery estimate",
            preview: "Preview",
            previewBody: "This is how the menu will appear to brands.",
            menuName: "Menu name",
            notSet: "Not set",
            visible: "Public",
            draft: "Draft",
          },
    [safeLocale]
  );

  const [platform, setPlatform] = useState("");
  const [menuType, setMenuType] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("");
  const [allowSecondaryUse, setAllowSecondaryUse] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const menuTitle = createMenuTitle({
    platform,
    menuType,
    locale: safeLocale,
  });

  const validate = () => {
    if (!platform) return copy.platformRequired;
    if (!menuType) return copy.menuTypeRequired;
    if (!category) return copy.categoryRequired;
    if (!price.trim()) return copy.priceRequired;

    const priceNumber = Number(price);

    if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
      return copy.priceInvalid;
    }

    if (!deliveryDays) return copy.deliveryDaysRequired;

    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationMessage = validate();

    if (validationMessage) {
      window.alert(validationMessage);
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.alert(copy.loginRequired);
      setSaving(false);
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
      window.alert(copy.creatorNotFound);
      setSaving(false);
      return;
    }

    const priceNumber = Number(price);
    const deliveryNumber = Number(deliveryDays);
    const now = new Date().toISOString();
    const title = createMenuTitle({
      platform,
      menuType,
      locale: "ja",
    });

    const payload = {
      creator_id: creator.id,
      title,
      description: null,
      platform,
      sns: platform,
      price: priceNumber,
      currency: "JPY",
      deliverables: title,
      delivery_days: deliveryNumber,
      is_active: isActive,
      category,
      tags: null,
      notes: null,
      account_url: null,
      reference_price_text: null,
      allow_secondary_use: allowSecondaryUse,
      menu_type: menuType,
      updated_at: now,
    };

    const { error } = await supabase.from("creator_menus").insert([payload]);

    if (error) {
      console.error("save error:", error);
      window.alert(copy.saveFailed);
      setSaving(false);
      return;
    }

    window.alert(copy.saveSuccess);
    router.push("/creator/menus");
  };

  return (
    <CreatorPage>
      <CreatorHero
        title={copy.title}
        description={copy.subtitle}
        right={
          <CreatorButton
            type="button"
            variant="secondary"
            onClick={() => router.push("/creator/menus")}
            className="px-4 py-2.5"
          >
            {copy.back}
          </CreatorButton>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-3">
        <CreatorCard className="p-5">
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-rose-50 text-[#FF3B5C] ring-1 ring-rose-100">
              <PlatformIcon />
            </div>

            <div className="min-w-0">
              <h2 className="text-[20px] font-black tracking-[-0.055em] text-slate-950">
                {copy.menuName}
              </h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                {menuTitle}
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <CreatorField label={copy.platform}>
              <CreatorSelect
                value={platform}
                onChange={(event) => {
                  const nextPlatform = event.target.value;
                  setPlatform(nextPlatform);

                  if (nextPlatform === "UGC") {
                    setMenuType("ugc");
                  }
                }}
              >
                <option value="">{copy.selectPlease}</option>
                {PLATFORM_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {optionLabel(option, safeLocale)}
                  </option>
                ))}
              </CreatorSelect>
            </CreatorField>

            <CreatorField label={copy.menuType}>
              <CreatorSelect
                value={menuType}
                onChange={(event) => setMenuType(event.target.value)}
              >
                <option value="">{copy.selectPlease}</option>
                {MENU_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {optionLabel(option, safeLocale)}
                  </option>
                ))}
              </CreatorSelect>
            </CreatorField>

            <CreatorField label={copy.category}>
              <CreatorSelect
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="">{copy.selectPlease}</option>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {optionLabel(option, safeLocale)}
                  </option>
                ))}
              </CreatorSelect>
            </CreatorField>
          </div>
        </CreatorCard>

        <CreatorCard className="p-5">
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-slate-50 text-slate-700 ring-1 ring-slate-100">
              <PriceIcon />
            </div>

            <div className="min-w-0">
              <h2 className="text-[20px] font-black tracking-[-0.055em] text-slate-950">
                {copy.price}
              </h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                {copy.yenOnly}
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <CreatorField label={copy.price}>
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

            <CreatorField label={copy.deliveryDays} help={copy.deliveryHelp}>
              <CreatorSelect
                value={deliveryDays}
                onChange={(event) => setDeliveryDays(event.target.value)}
              >
                <option value="">{copy.selectPlease}</option>
                {DELIVERY_OPTIONS.map((day) => (
                  <option key={day} value={String(day)}>
                    {safeLocale === "ja" ? `${day}日` : `${day} days`}
                  </option>
                ))}
              </CreatorSelect>
            </CreatorField>
          </div>
        </CreatorCard>

        <CreatorCard className="p-5">
          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => setAllowSecondaryUse(false)}
              className={`rounded-[22px] px-4 py-4 text-left ring-1 transition active:scale-[0.98] ${
                !allowSecondaryUse
                  ? "bg-slate-950 text-white ring-slate-950"
                  : "bg-white text-slate-700 ring-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    !allowSecondaryUse
                      ? "bg-white/15 text-white"
                      : "bg-slate-50 text-slate-400"
                  }`}
                >
                  <CheckIcon />
                </span>
                <div>
                  <p className="text-sm font-black">{copy.disallow}</p>
                  <p
                    className={`mt-1 text-xs font-semibold leading-5 ${
                      !allowSecondaryUse ? "text-white/65" : "text-slate-400"
                    }`}
                  >
                    {copy.secondaryUseHelp}
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setAllowSecondaryUse(true)}
              className={`rounded-[22px] px-4 py-4 text-left ring-1 transition active:scale-[0.98] ${
                allowSecondaryUse
                  ? "bg-slate-950 text-white ring-slate-950"
                  : "bg-white text-slate-700 ring-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    allowSecondaryUse
                      ? "bg-white/15 text-white"
                      : "bg-slate-50 text-slate-400"
                  }`}
                >
                  <CheckIcon />
                </span>
                <div>
                  <p className="text-sm font-black">{copy.allow}</p>
                  <p
                    className={`mt-1 text-xs font-semibold leading-5 ${
                      allowSecondaryUse ? "text-white/65" : "text-slate-400"
                    }`}
                  >
                    {copy.secondaryUseHelp}
                  </p>
                </div>
              </div>
            </button>
          </div>
        </CreatorCard>

        <CreatorCard className="p-5">
          <CreatorField label={copy.publicStatus} help={copy.publicHelp}>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setIsActive(true)}
                className={`rounded-full px-4 py-3 text-sm font-black ring-1 transition active:scale-[0.98] ${
                  isActive
                    ? "bg-[#FF3B5C] text-white ring-[#FF3B5C]"
                    : "bg-white text-slate-600 ring-slate-200"
                }`}
              >
                {copy.publicOn}
              </button>

              <button
                type="button"
                onClick={() => setIsActive(false)}
                className={`rounded-full px-4 py-3 text-sm font-black ring-1 transition active:scale-[0.98] ${
                  !isActive
                    ? "bg-slate-950 text-white ring-slate-950"
                    : "bg-white text-slate-600 ring-slate-200"
                }`}
              >
                {copy.publicOff}
              </button>
            </div>
          </CreatorField>
        </CreatorCard>

        <CreatorCard className="p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#FF3B5C]">
                {copy.preview}
              </p>

              <h2 className="mt-2 text-[22px] font-black tracking-[-0.06em] text-slate-950">
                {menuTitle}
              </h2>

              <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                {copy.previewBody}
              </p>
            </div>

            <CreatorBadge tone={isActive ? "green" : "slate"}>
              {isActive ? copy.visible : copy.draft}
            </CreatorBadge>
          </div>

          <div className="grid gap-2.5 rounded-[24px] bg-[#F8F9FA] p-4 ring-1 ring-slate-100">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
              <span className="text-xs font-black text-slate-400">
                {copy.platform}
              </span>
              <span className="text-sm font-black text-slate-950">
                {platform || copy.notSet}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3">
              <span className="text-xs font-black text-slate-400">
                {copy.menuType}
              </span>
              <span className="text-sm font-black text-slate-950">
                {menuType
                  ? findLabel(MENU_TYPE_OPTIONS, menuType, safeLocale)
                  : copy.notSet}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3">
              <span className="text-xs font-black text-slate-400">
                {copy.price}
              </span>
              <span className="text-sm font-black text-slate-950">
                {formatPrice(price, safeLocale)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 pt-3">
              <span className="text-xs font-black text-slate-400">
                {copy.deliveryDays}
              </span>
              <span className="text-sm font-black text-slate-950">
                {deliveryDays
                  ? safeLocale === "ja"
                    ? `${deliveryDays}日`
                    : `${deliveryDays} days`
                  : copy.notSet}
              </span>
            </div>
          </div>
        </CreatorCard>

        <CreatorButton type="submit" disabled={saving} className="w-full">
          {saving ? copy.saving : copy.save}
        </CreatorButton>
      </form>
    </CreatorPage>
  );
}