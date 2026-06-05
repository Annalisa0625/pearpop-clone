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
  CreatorPage,
} from "@/app/creator/_components/CreatorDesignSystem";

type MenuOption = {
  value: string;
  labelJa: string;
  labelEn: string;
  helpJa: string;
  helpEn: string;
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
    labelJa: "投稿なし・動画素材のみ納品",
    labelEn: "Video asset only, no posting",
    helpJa: "広告やSNSで使える動画素材だけを納品します。",
    helpEn: "Deliver video assets only. You do not post on your own account.",
  },
  {
    value: "投稿なし・写真素材のみ納品",
    labelJa: "投稿なし・写真素材のみ納品",
    labelEn: "Photo asset only, no posting",
    helpJa: "広告やSNSで使える写真素材だけを納品します。",
    helpEn: "Deliver photo assets only. You do not post on your own account.",
  },
  {
    value: "イベント訪問",
    labelJa: "イベント訪問",
    labelEn: "Event visit",
    helpJa:
      "店舗・イベント・展示会などに訪問して投稿または素材制作を行います。",
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

function getMenuLabel(option: MenuOption, locale: "ja" | "en") {
  return locale === "ja" ? option.labelJa : option.labelEn;
}

function getMenuHelp(option: MenuOption, locale: "ja" | "en") {
  return locale === "ja" ? option.helpJa : option.helpEn;
}

function getSelectedMenu(value: string) {
  return MENU_OPTIONS.find((option) => option.value === value) ?? null;
}

function derivePlatform(menuValue: string) {
  if (menuValue.startsWith("Instagram")) return "Instagram";
  if (menuValue.startsWith("TikTok")) return "TikTok";
  if (menuValue.startsWith("YouTube")) return "YouTube";

  if (
    menuValue === "投稿なし・動画素材のみ納品" ||
    menuValue === "投稿なし・写真素材のみ納品"
  ) {
    return "UGC";
  }

  if (menuValue === "イベント訪問") return "イベント訪問";

  return "その他";
}

function deriveMenuType(menuValue: string) {
  if (menuValue === "Instagram投稿") return "post";
  if (menuValue === "Instagramリール") return "short_video";
  if (menuValue === "Instagramストーリーズ") return "story";
  if (menuValue === "TikTok投稿") return "short_video";
  if (menuValue === "YouTubeショート") return "short_video";
  if (menuValue === "YouTube動画") return "video";

  if (
    menuValue === "投稿なし・動画素材のみ納品" ||
    menuValue === "投稿なし・写真素材のみ納品"
  ) {
    return "ugc";
  }

  return "other";
}

function deriveCategory(menuValue: string) {
  if (
    menuValue === "投稿なし・動画素材のみ納品" ||
    menuValue === "投稿なし・写真素材のみ納品"
  ) {
    return "UGC";
  }

  if (menuValue === "イベント訪問") return "イベント";

  return null;
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
              "企業が注文できるメニューを作成します。サインアップ時と同じ項目で、シンプルに登録できます。",
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
            preview: "プレビュー",
            previewBody: "企業側にはこの内容で表示されます。",
            notSet: "未設定",
            visible: "公開中",
            autoPublic:
              "作成したメニューは公開中として保存されます。非公開にしたい場合は、一覧から切り替えできます。",
          }
        : {
            title: "Create menu",
            subtitle:
              "Create an orderable menu using the same fields as creator signup.",
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
            preview: "Preview",
            previewBody: "This is how the menu will appear to brands.",
            notSet: "Not set",
            visible: "Public",
            autoPublic:
              "The menu will be saved as public. You can make it private from the menu list.",
          },
    [safeLocale]
  );

  const [menuValue, setMenuValue] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedMenu = getSelectedMenu(menuValue);
  const platform = selectedMenu ? derivePlatform(selectedMenu.value) : "";
  const menuType = selectedMenu ? deriveMenuType(selectedMenu.value) : "";
  const category = selectedMenu ? deriveCategory(selectedMenu.value) : null;

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

    const validationMessage = validate();

    if (validationMessage) {
      window.alert(validationMessage);
      return;
    }

    if (!selectedMenu) return;

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
    const now = new Date().toISOString();

    const payload = {
      creator_id: creator.id,
      title: selectedMenu.labelJa,
      description: selectedMenu.helpJa,
      platform,
      sns: platform,
      price: priceNumber,
      currency: "JPY",
      deliverables: selectedMenu.labelJa,
      delivery_days: null,
      is_active: true,
      category,
      tags: null,
      notes: null,
      account_url: null,
      reference_price_text: null,
      allow_secondary_use: false,
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
                {copy.menu}
              </h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                {copy.menuHelp}
              </p>
            </div>
          </div>

          <div className="grid gap-2.5">
            {MENU_OPTIONS.map((option) => {
              const active = menuValue === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMenuValue(option.value)}
                  className={`rounded-[22px] p-4 text-left ring-1 transition active:scale-[0.98] ${
                    active
                      ? "bg-slate-950 text-white ring-slate-950"
                      : "bg-white text-slate-700 ring-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black">
                        {getMenuLabel(option, safeLocale)}
                      </p>
                      <p
                        className={`mt-1 text-xs font-semibold leading-5 ${
                          active ? "text-white/65" : "text-slate-400"
                        }`}
                      >
                        {getMenuHelp(option, safeLocale)}
                      </p>
                    </div>

                    {active ? (
                      <span className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-[11px] font-black text-white">
                        SELECT
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
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
                {copy.priceHelp}
              </p>
            </div>
          </div>

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
        </CreatorCard>

        <CreatorCard className="p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#FF3B5C]">
                {copy.preview}
              </p>

              <h2 className="mt-2 text-[22px] font-black tracking-[-0.06em] text-slate-950">
                {selectedMenu
                  ? getMenuLabel(selectedMenu, safeLocale)
                  : copy.notSet}
              </h2>

              <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                {selectedMenu
                  ? getMenuHelp(selectedMenu, safeLocale)
                  : copy.previewBody}
              </p>
            </div>

            <CreatorBadge tone="green">{copy.visible}</CreatorBadge>
          </div>

          <div className="grid gap-2.5 rounded-[24px] bg-[#F8F9FA] p-4 ring-1 ring-slate-100">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
              <span className="text-xs font-black text-slate-400">
                {copy.menu}
              </span>
              <span className="text-right text-sm font-black text-slate-950">
                {selectedMenu
                  ? getMenuLabel(selectedMenu, safeLocale)
                  : copy.notSet}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3">
              <span className="text-xs font-black text-slate-400">
                Platform
              </span>
              <span className="text-sm font-black text-slate-950">
                {platform || copy.notSet}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 pt-3">
              <span className="text-xs font-black text-slate-400">
                {copy.price}
              </span>
              <span className="text-sm font-black text-slate-950">
                {formatPrice(price, safeLocale)}
              </span>
            </div>
          </div>

          <p className="mt-4 text-xs font-semibold leading-6 text-slate-400">
            {copy.autoPublic}
          </p>
        </CreatorCard>

        <CreatorButton type="submit" disabled={saving} className="w-full">
          {saving ? copy.saving : copy.save}
        </CreatorButton>
      </form>
    </CreatorPage>
  );
}