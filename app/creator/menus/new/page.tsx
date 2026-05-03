// File: app/creator/menus/new/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAppLocale } from "@/lib/i18n/locale";

const PLATFORM_OPTIONS = ["TikTok", "Instagram", "X", "YouTube"];

const CURRENCY_OPTIONS = [
  { value: "JPY", label: "JPY / 日本円" },
  { value: "USD", label: "USD / US Dollar" },
];

const MENU_TYPE_OPTIONS = [
  { value: "post", ja: "投稿", en: "Post" },
  { value: "short_video", ja: "ショート動画", en: "Short video" },
  { value: "story", ja: "ストーリー", en: "Story" },
  { value: "video", ja: "動画", en: "Video" },
  { value: "ugc", ja: "UGC制作", en: "UGC creation" },
  { value: "package", ja: "セットメニュー", en: "Package" },
  { value: "other", ja: "その他", en: "Other" },
];

function LocaleTabs({
  locale,
  setLocale,
}: {
  locale: "ja" | "en";
  setLocale: (locale: "ja" | "en") => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setLocale("ja")}
        className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
          locale === "ja"
            ? "border-gray-900 bg-gray-900 text-white"
            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        JA
      </button>

      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
          locale === "en"
            ? "border-gray-900 bg-gray-900 text-white"
            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        EN
      </button>
    </div>
  );
}

export default function NewMenuPage() {
  const router = useRouter();
  const { locale, setLocale } = useAppLocale();

  const copy = useMemo(
    () =>
      locale === "ja"
        ? {
            badge: "Creator Menu",
            title: "新しいメニューを作成",
            subtitle:
              "企業が購入・注文できるメニューを作成します。価格、納期、納品物、条件を分かりやすく設定してください。",
            loginRequired: "ログインしてください",
            creatorNotFound: "クリエイター情報が見つかりません",
            titleRequired: "メニュー名を入力してください",
            platformRequired: "対応SNSを選択してください",
            accountUrlRequired: "アカウントURLを入力してください",
            priceRequired: "価格を入力してください",
            priceInvalid: "価格は1以上の数字で入力してください",
            deliveryDaysRequired: "納期を入力してください",
            deliveryDaysInvalid: "納期は1日以上の数字で入力してください",
            descriptionRequired: "メニュー説明を入力してください",
            deliverablesRequired: "納品物を入力してください",
            saveFailed: "メニューの保存に失敗しました",
            saveSuccess: "メニューを作成しました",
            basicInfo: "基本情報",
            salesInfo: "販売条件",
            details: "メニュー詳細",
            titleLabel: "メニュー名",
            titlePlaceholder: "例：Instagramリール動画 1本制作・投稿",
            platform: "対応SNS",
            selectPlease: "選択してください",
            menuType: "メニュー種別",
            accountUrl: "対象アカウントURL",
            accountUrlPlaceholder:
              "例：https://www.instagram.com/your_account",
            category: "カテゴリー（任意）",
            categoryPlaceholder: "例：美容、旅行、グルメ、ファッション",
            price: "価格",
            currency: "通貨",
            deliveryDays: "納期（日数）",
            deliveryDaysPlaceholder: "例：7",
            description: "メニュー説明",
            descriptionPlaceholder:
              "例：商品の魅力をInstagramリールで紹介します。撮影・編集・投稿まで対応します。",
            deliverables: "納品物",
            deliverablesPlaceholder:
              "例：Instagramリール1本、キャプション作成、投稿後URL共有",
            tags: "タグ（任意）",
            tagsPlaceholder: "例：美容, コスメ, UGC, リール",
            secondaryUse: "二次利用を許可する",
            secondaryUseHelp:
              "企業が納品コンテンツを広告・LP・SNS投稿などで再利用できる条件です。許可する場合は、必要に応じて補足欄に条件を書いてください。",
            notes: "注意事項・補足（任意）",
            notesPlaceholder:
              "例：商品提供が必要です / 撮影内容は事前相談 / 長尺動画は別料金 など",
            saving: "保存中...",
            save: "メニューを作成",
            cancel: "戻る",
          }
        : {
            badge: "Creator Menu",
            title: "Create New Menu",
            subtitle:
              "Create a menu that companies can purchase or order. Set clear pricing, delivery timing, deliverables, and conditions.",
            loginRequired: "Please log in",
            creatorNotFound: "Creator information was not found",
            titleRequired: "Please enter a menu title",
            platformRequired: "Please select a platform",
            accountUrlRequired: "Please enter your account URL",
            priceRequired: "Please enter a price",
            priceInvalid: "Price must be a number greater than 0",
            deliveryDaysRequired: "Please enter delivery days",
            deliveryDaysInvalid: "Delivery days must be at least 1",
            descriptionRequired: "Please enter a menu description",
            deliverablesRequired: "Please enter deliverables",
            saveFailed: "Failed to save the menu",
            saveSuccess: "Menu created successfully",
            basicInfo: "Basic Information",
            salesInfo: "Sales Conditions",
            details: "Menu Details",
            titleLabel: "Menu Title",
            titlePlaceholder: "Example: 1 Instagram Reel video creation and post",
            platform: "Platform",
            selectPlease: "Please select",
            menuType: "Menu Type",
            accountUrl: "Account URL",
            accountUrlPlaceholder:
              "Example: https://www.instagram.com/your_account",
            category: "Category (optional)",
            categoryPlaceholder: "Example: Beauty, Travel, Food, Fashion",
            price: "Price",
            currency: "Currency",
            deliveryDays: "Delivery Days",
            deliveryDaysPlaceholder: "Example: 7",
            description: "Menu Description",
            descriptionPlaceholder:
              "Example: I will create and publish an Instagram Reel introducing your product.",
            deliverables: "Deliverables",
            deliverablesPlaceholder:
              "Example: 1 Instagram Reel, caption writing, published post URL",
            tags: "Tags (optional)",
            tagsPlaceholder: "Example: beauty, cosmetics, UGC, reels",
            secondaryUse: "Allow secondary use",
            secondaryUseHelp:
              "Secondary use means the company can reuse your delivered content in ads, landing pages, social posts, and other marketing materials.",
            notes: "Notes / Conditions (optional)",
            notesPlaceholder:
              "Example: Product shipment required / Content details must be discussed in advance / Long-form videos require additional fees",
            saving: "Saving...",
            save: "Create Menu",
            cancel: "Back",
          },
    [locale]
  );

  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("");
  const [menuType, setMenuType] = useState("post");
  const [accountUrl, setAccountUrl] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("JPY");
  const [deliveryDays, setDeliveryDays] = useState("");
  const [description, setDescription] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [tags, setTags] = useState("");
  const [allowSecondaryUse, setAllowSecondaryUse] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!title.trim()) return copy.titleRequired;
    if (!platform) return copy.platformRequired;
    if (!accountUrl.trim()) return copy.accountUrlRequired;

    if (!price.trim()) return copy.priceRequired;
    const priceNumber = Number(price);
    if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
      return copy.priceInvalid;
    }

    if (!deliveryDays.trim()) return copy.deliveryDaysRequired;
    const deliveryNumber = Number(deliveryDays);
    if (
      !Number.isFinite(deliveryNumber) ||
      !Number.isInteger(deliveryNumber) ||
      deliveryNumber < 1
    ) {
      return copy.deliveryDaysInvalid;
    }

    if (!description.trim()) return copy.descriptionRequired;
    if (!deliverables.trim()) return copy.deliverablesRequired;

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationMessage = validate();
    if (validationMessage) {
      window.alert(validationMessage);
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.alert(copy.loginRequired);
      setLoading(false);
      router.push("/login");
      return;
    }

    const { data: creator, error: creatorError } = await supabase
      .from("creators")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (creatorError || !creator) {
      console.error("creator load error:", creatorError);
      window.alert(copy.creatorNotFound);
      setLoading(false);
      return;
    }

    const priceNumber = Number(price);
    const deliveryNumber = Number(deliveryDays);

    const payload = {
      creator_id: creator.id,
      title: title.trim(),
      description: description.trim(),
      platform,
      sns: platform,
      price: priceNumber,
      currency,
      deliverables: deliverables.trim(),
      delivery_days: deliveryNumber,
      is_active: true,
      category: category.trim() || null,
      tags: tags.trim() || null,
      notes: notes.trim() || null,
      account_url: accountUrl.trim(),
      reference_price_text: null,
      allow_secondary_use: allowSecondaryUse,
      menu_type: menuType,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("creator_menus").insert([payload]);

    if (error) {
      console.error("save error:", error);
      window.alert(copy.saveFailed);
      setLoading(false);
      return;
    }

    window.alert(copy.saveSuccess);
    router.push("/creator/menus");
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 md:px-6 md:py-12">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex justify-end">
          <LocaleTabs locale={locale} setLocale={setLocale} />
        </div>

        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-blue-600">{copy.badge}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {copy.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            {copy.subtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">{copy.basicInfo}</h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold">
                  {copy.titleLabel}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-gray-900"
                  placeholder={copy.titlePlaceholder}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  {copy.platform}
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-gray-900"
                  required
                >
                  <option value="">{copy.selectPlease}</option>
                  {PLATFORM_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  {copy.menuType}
                </label>
                <select
                  value={menuType}
                  onChange={(e) => setMenuType(e.target.value)}
                  className="w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-gray-900"
                >
                  {MENU_TYPE_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {locale === "ja" ? item.ja : item.en}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold">
                  {copy.accountUrl}
                </label>
                <input
                  type="url"
                  value={accountUrl}
                  onChange={(e) => setAccountUrl(e.target.value)}
                  className="w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-gray-900"
                  placeholder={copy.accountUrlPlaceholder}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold">
                  {copy.category}
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-gray-900"
                  placeholder={copy.categoryPlaceholder}
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">{copy.salesInfo}</h2>

            <div className="mt-5 grid gap-5 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-semibold">
                  {copy.currency}
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-gray-900"
                >
                  {CURRENCY_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  {copy.price}
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-gray-900"
                  placeholder={currency === "JPY" ? "10000" : "100"}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  {copy.deliveryDays}
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={deliveryDays}
                  onChange={(e) => setDeliveryDays(e.target.value)}
                  className="w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-gray-900"
                  placeholder={copy.deliveryDaysPlaceholder}
                  required
                />
              </div>
            </div>

            <div className="mt-5 rounded-2xl border bg-gray-50 p-4">
              <label className="flex items-center gap-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={allowSecondaryUse}
                  onChange={(e) => setAllowSecondaryUse(e.target.checked)}
                  className="h-4 w-4"
                />
                {copy.secondaryUse}
              </label>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {copy.secondaryUseHelp}
              </p>
            </div>
          </section>

          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">{copy.details}</h2>

            <div className="mt-5 space-y-5">
              <div>
                <label className="mb-1 block text-sm font-semibold">
                  {copy.description}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-gray-900"
                  rows={5}
                  placeholder={copy.descriptionPlaceholder}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  {copy.deliverables}
                </label>
                <textarea
                  value={deliverables}
                  onChange={(e) => setDeliverables(e.target.value)}
                  className="w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-gray-900"
                  rows={4}
                  placeholder={copy.deliverablesPlaceholder}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  {copy.tags}
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-gray-900"
                  placeholder={copy.tagsPlaceholder}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  {copy.notes}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-gray-900"
                  rows={4}
                  placeholder={copy.notesPlaceholder}
                />
              </div>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.push("/creator/menus")}
              className="rounded-2xl border bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              {copy.cancel}
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? copy.saving : copy.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}