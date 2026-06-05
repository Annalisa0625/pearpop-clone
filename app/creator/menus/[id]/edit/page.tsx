// File: app/creator/menus/[id]/edit/page.tsx
"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
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
  CreatorSkeleton,
} from "@/app/creator/_components/CreatorDesignSystem";

type MenuOption = {
  value: string;
  labelJa: string;
  labelEn: string;
  helpJa: string;
  helpEn: string;
};

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

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
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
    platform.includes("イベント") ||
    category.includes("イベント")
  ) {
    return "イベント訪問";
  }

  return "その他";
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

export default function EditMenuPage() {
  const router = useRouter();
  const params = useParams();
  const menuId = typeof params?.id === "string" ? params.id : "";
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale } = useAppLocale();
  const safeLocale: "ja" | "en" = locale === "en" ? "en" : "ja";

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            title: "メニュー編集",
            subtitle:
              "企業が注文できるメニュー内容と価格を編集します。サインアップ時と同じ項目で、シンプルに管理できます。",
            back: "戻る",
            save: "更新する",
            saving: "更新中...",
            loading: "読み込み中...",
            loginRequired: "ログインしてください",
            creatorNotFound: "クリエイター情報が見つかりません",
            notFound: "メニューが見つかりませんでした",
            updateFailed: "メニューの更新に失敗しました",
            updateSuccess: "メニューを更新しました",
            menu: "メニュー内容",
            menuHelp: "企業に提供できる内容を1つ選んでください。",
            price: "価格",
            priceHelp:
              "企業が注文する際の基本価格です。あとからいつでも変更できます。",
            yenOnly: "JPY / 日本円",
            pricePlaceholder: "例：30000",
            menuRequired: "メニュー内容を選択してください",
            priceRequired: "価格を入力してください",
            priceInvalid: "価格は1以上の数字で入力してください",
            preview: "プレビュー",
            previewBody: "企業側にはこの内容で表示されます。",
            notSet: "未設定",
            public: "公開中",
            private: "非公開",
            statusHelp:
              "公開/非公開の切り替えはメニュー一覧から変更できます。",
            savedAs:
              "保存すると、選択したメニュー内容に合わせて表示名・SNS種別・メニュー種別が自動で整理されます。",
          }
        : {
            title: "Edit menu",
            subtitle:
              "Edit an orderable menu using the same simple fields as creator signup.",
            back: "Back",
            save: "Update",
            saving: "Updating...",
            loading: "Loading...",
            loginRequired: "Please log in",
            creatorNotFound: "Creator information was not found",
            notFound: "Menu was not found",
            updateFailed: "Failed to update the menu",
            updateSuccess: "Menu updated successfully",
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
            public: "Public",
            private: "Private",
            statusHelp:
              "Public / private status can be changed from the menu list.",
            savedAs:
              "Saving will automatically align the display title, platform, and menu type with the selected menu.",
          },
    [safeLocale]
  );

  const [menuValue, setMenuValue] = useState("");
  const [price, setPrice] = useState("");
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const fetchMenu = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.alert(copy.loginRequired);
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
        router.push("/creator/menus");
        return;
      }

      const { data, error } = await supabase
        .from("creator_menus")
        .select("*")
        .eq("id", menuId)
        .eq("creator_id", creator.id)
        .maybeSingle();

      if (error || !data) {
        console.error("menu load error:", error);
        window.alert(copy.notFound);
        router.push("/creator/menus");
        return;
      }

      const menu = data as MenuRow;

      setMenuValue(inferMenuValue(menu));
      setPrice(menu.price != null ? String(menu.price) : "");
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
      title: selectedMenu.labelJa,
      description: selectedMenu.helpJa,
      platform,
      sns: platform,
      price: priceNumber,
      currency: "JPY",
      deliverables: selectedMenu.labelJa,
      delivery_days: null,
      category,
      tags: null,
      notes: null,
      account_url: null,
      reference_price_text: null,
      allow_secondary_use: false,
      menu_type: menuType,
      updated_at: now,
    };

    const { error } = await supabase
      .from("creator_menus")
      .update(payload)
      .eq("id", menuId)
      .eq("creator_id", creator.id);

    if (error) {
      console.error("update error:", error);
      window.alert(copy.updateFailed);
      setSaving(false);
      return;
    }

    window.alert(copy.updateSuccess);
    router.push("/creator/menus");
  };

  if (loading) {
    return (
      <CreatorPage>
        <CreatorSkeleton className="h-36" />
        <CreatorSkeleton className="h-80" />
        <CreatorSkeleton className="h-48" />
      </CreatorPage>
    );
  }

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

      <form onSubmit={handleUpdate} className="space-y-3">
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

            <CreatorBadge tone={isActive === false ? "slate" : "green"}>
              {isActive === false ? copy.private : copy.public}
            </CreatorBadge>
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
            {copy.statusHelp}
          </p>

          <p className="mt-2 text-xs font-semibold leading-6 text-slate-400">
            {copy.savedAs}
          </p>
        </CreatorCard>

        <CreatorButton type="submit" disabled={saving} className="w-full">
          {saving ? copy.saving : copy.save}
        </CreatorButton>
      </form>
    </CreatorPage>
  );
}