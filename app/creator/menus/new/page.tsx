// File: app/creator/menus/new/page.tsx
"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAppLocale } from "@/lib/i18n/locale";

const PLATFORM_OPTIONS = ["Instagram", "TikTok", "YouTube", "X", "UGC"];

const MENU_TYPE_OPTIONS = [
  { value: "post", ja: "投稿", en: "Post" },
  { value: "short_video", ja: "ショート動画", en: "Short video" },
  { value: "story", ja: "ストーリー", en: "Story" },
  { value: "video", ja: "動画", en: "Video" },
  { value: "ugc", ja: "UGC制作", en: "UGC creation" },
  { value: "package", ja: "セットメニュー", en: "Package" },
  { value: "other", ja: "その他", en: "Other" },
];

const CATEGORY_OPTIONS = [
  "美容",
  "ファッション",
  "グルメ",
  "旅行",
  "子育て",
  "ライフスタイル",
  "ガジェット",
  "エンタメ",
  "ビジネス",
  "教育",
  "フィットネス",
  "その他",
];

function getPlatformIcon(value: string) {
  const normalized = value.trim().toLowerCase();

  if (normalized.includes("instagram")) return "◎";
  if (normalized.includes("tiktok")) return "♪";
  if (normalized.includes("youtube")) return "▶";
  if (normalized === "x" || normalized.includes("twitter")) return "𝕏";
  if (normalized.includes("ugc")) return "▣";

  return "●";
}

function formatPreviewPrice(value: string, locale: "ja" | "en") {
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

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="block text-sm font-black text-slate-800">
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950 ${props.className ?? ""}`}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-slate-950 ${props.className ?? ""}`}
    />
  );
}

function SelectBox(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950 ${props.className ?? ""}`}
    />
  );
}

function SectionCard({
  icon,
  title,
  body,
  children,
}: {
  icon: string;
  title: string;
  body?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-lg font-black text-slate-950">
          {icon}
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-950">{title}</h2>
          {body ? (
            <p className="mt-1 text-sm leading-6 text-slate-500">{body}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function SummaryRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <span className="text-sm font-bold text-slate-500">{label}</span>
      <span
        className={`text-right text-sm ${
          strong ? "font-black text-slate-950" : "font-bold text-slate-800"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default function NewMenuPage() {
  const router = useRouter();
  const { locale } = useAppLocale();
  const safeLocale = locale === "en" ? "en" : "ja";

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            badge: "Creator Menu",
            title: "新しいメニューを作成",
            subtitle:
              "企業が購入できる投稿メニューを作成します。価格、納期、納品物を分かりやすく設定してください。",
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
            basicInfoBody:
              "企業が一覧で見た時に分かりやすいタイトルとSNSを設定します。",
            salesInfo: "価格・納期",
            salesInfoBody:
              "初期MVPではJPY固定です。B側にはこの価格にTrendre手数料が加算されます。",
            details: "納品内容",
            detailsBody:
              "何を納品するのか、どこまで対応するのかを明確に書くと注文されやすくなります。",
            preview: "プレビュー",
            previewBody: "B側に表示される内容の簡易確認です。",
            titleLabel: "メニュー名",
            titlePlaceholder: "例：Instagramリール動画 1本制作・投稿",
            platform: "対応SNS",
            selectPlease: "選択してください",
            menuType: "メニュー種別",
            accountUrl: "対象アカウントURL",
            accountUrlPlaceholder:
              "例：https://www.instagram.com/your_account",
            category: "カテゴリー",
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
              "企業が納品コンテンツを広告・LP・SNS投稿などで再利用できる条件です。",
            notes: "注意事項・補足（任意）",
            notesPlaceholder:
              "例：商品提供が必要です / 撮影内容は事前相談 / 長尺動画は別料金 など",
            visible: "作成後は公開中になります",
            visibleBody:
              "作成したメニューはB側のクリエイター詳細ページに表示され、注文できるようになります。",
            saving: "保存中...",
            save: "メニューを作成",
            cancel: "戻る",
            notSet: "未設定",
            yenOnly: "JPY / 日本円",
            secondaryUseAllowed: "許可",
            secondaryUseNotAllowed: "不可",
          }
        : {
            badge: "Creator Menu",
            title: "Create New Menu",
            subtitle:
              "Create a menu that companies can purchase. Set clear pricing, delivery timing, and deliverables.",
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
            basicInfoBody:
              "Set a clear title and platform so companies understand the menu quickly.",
            salesInfo: "Pricing & Delivery",
            salesInfoBody:
              "Initial MVP is JPY-only. Trendre marketplace fee is added on the buyer side.",
            details: "Deliverables",
            detailsBody:
              "Clearly describe what you will deliver and what is included.",
            preview: "Preview",
            previewBody: "A simple preview of how this menu may appear to brands.",
            titleLabel: "Menu Title",
            titlePlaceholder: "Example: 1 Instagram Reel video creation and post",
            platform: "Platform",
            selectPlease: "Please select",
            menuType: "Menu Type",
            accountUrl: "Account URL",
            accountUrlPlaceholder:
              "Example: https://www.instagram.com/your_account",
            category: "Category",
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
            visible: "This menu will be public after creation",
            visibleBody:
              "Public menus are shown on the brand-facing creator detail page and can be ordered.",
            saving: "Saving...",
            save: "Create Menu",
            cancel: "Back",
            notSet: "Not set",
            yenOnly: "JPY / Japanese yen",
            secondaryUseAllowed: "Allowed",
            secondaryUseNotAllowed: "Not allowed",
          },
    [safeLocale]
  );

  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("");
  const [menuType, setMenuType] = useState("post");
  const [accountUrl, setAccountUrl] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("");
  const [description, setDescription] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [tags, setTags] = useState("");
  const [allowSecondaryUse, setAllowSecondaryUse] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedMenuTypeLabel =
    MENU_TYPE_OPTIONS.find((item) => item.value === menuType)?.[safeLocale] ||
    copy.notSet;

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

  const handleSubmit = async (event: FormEvent) => {
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
      .single();

    if (creatorError || !creator) {
      console.error("creator load error:", creatorError);
      window.alert(copy.creatorNotFound);
      setSaving(false);
      return;
    }

    const priceNumber = Number(price);
    const deliveryNumber = Number(deliveryDays);
    const now = new Date().toISOString();

    const payload = {
      creator_id: creator.id,
      title: title.trim(),
      description: description.trim(),
      platform,
      sns: platform,
      price: priceNumber,
      currency: "JPY",
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
    <div className="space-y-6 pb-4">
      <section className="rounded-[32px] bg-slate-950 p-6 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-white/50">
          {copy.badge}
        </p>

        <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              {copy.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">
              {copy.subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/creator/menus")}
            className="w-fit rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white transition active:scale-[0.98]"
          >
            {copy.cancel}
          </button>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-5">
          <SectionCard
            icon="□"
            title={copy.basicInfo}
            body={copy.basicInfoBody}
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <FieldLabel>{copy.titleLabel}</FieldLabel>
                <TextInput
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={copy.titlePlaceholder}
                  required
                />
              </div>

              <div>
                <FieldLabel>{copy.platform}</FieldLabel>
                <SelectBox
                  value={platform}
                  onChange={(event) => setPlatform(event.target.value)}
                  required
                >
                  <option value="">{copy.selectPlease}</option>
                  {PLATFORM_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {getPlatformIcon(item)} {item}
                    </option>
                  ))}
                </SelectBox>
              </div>

              <div>
                <FieldLabel>{copy.menuType}</FieldLabel>
                <SelectBox
                  value={menuType}
                  onChange={(event) => setMenuType(event.target.value)}
                >
                  {MENU_TYPE_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item[safeLocale]}
                    </option>
                  ))}
                </SelectBox>
              </div>

              <div className="md:col-span-2">
                <FieldLabel>{copy.accountUrl}</FieldLabel>
                <TextInput
                  type="url"
                  value={accountUrl}
                  onChange={(event) => setAccountUrl(event.target.value)}
                  placeholder={copy.accountUrlPlaceholder}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <FieldLabel>{copy.category}</FieldLabel>
                <div className="mt-3 flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map((item) => {
                    const active = category === item;

                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setCategory(active ? "" : item)}
                        className={`rounded-full border px-4 py-2 text-sm font-bold transition active:scale-[0.98] ${
                          active
                            ? "border-slate-950 bg-slate-950 text-white"
                            : "border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
                <TextInput
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder={copy.categoryPlaceholder}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon="¥"
            title={copy.salesInfo}
            body={copy.salesInfoBody}
          >
            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <FieldLabel>{copy.currency}</FieldLabel>
                <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                  {copy.yenOnly}
                </div>
              </div>

              <div>
                <FieldLabel>{copy.price}</FieldLabel>
                <TextInput
                  type="number"
                  min={1}
                  step={1}
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="10000"
                  required
                />
              </div>

              <div>
                <FieldLabel>{copy.deliveryDays}</FieldLabel>
                <TextInput
                  type="number"
                  min={1}
                  step={1}
                  value={deliveryDays}
                  onChange={(event) => setDeliveryDays(event.target.value)}
                  placeholder={copy.deliveryDaysPlaceholder}
                  required
                />
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-slate-100 bg-slate-50 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={allowSecondaryUse}
                  onChange={(event) => setAllowSecondaryUse(event.target.checked)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-black text-slate-800">
                    {copy.secondaryUse}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-slate-500">
                    {copy.secondaryUseHelp}
                  </span>
                </span>
              </label>
            </div>
          </SectionCard>

          <SectionCard icon="▣" title={copy.details} body={copy.detailsBody}>
            <div className="space-y-5">
              <div>
                <FieldLabel>{copy.description}</FieldLabel>
                <TextArea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={5}
                  placeholder={copy.descriptionPlaceholder}
                  required
                />
              </div>

              <div>
                <FieldLabel>{copy.deliverables}</FieldLabel>
                <TextArea
                  value={deliverables}
                  onChange={(event) => setDeliverables(event.target.value)}
                  rows={4}
                  placeholder={copy.deliverablesPlaceholder}
                  required
                />
              </div>

              <div>
                <FieldLabel>{copy.tags}</FieldLabel>
                <TextInput
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder={copy.tagsPlaceholder}
                />
              </div>

              <div>
                <FieldLabel>{copy.notes}</FieldLabel>
                <TextArea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                  placeholder={copy.notesPlaceholder}
                />
              </div>
            </div>
          </SectionCard>
        </main>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
              {copy.preview}
            </p>
            <h2 className="mt-3 text-2xl font-black text-slate-950">
              {title || copy.titleLabel}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {copy.previewBody}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {platform ? (
                <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                  {getPlatformIcon(platform)} {platform}
                </span>
              ) : null}
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                {selectedMenuTypeLabel}
              </span>
              {category ? (
                <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-black text-purple-700">
                  {category}
                </span>
              ) : null}
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <SummaryRow
                label={copy.price}
                value={formatPreviewPrice(price, safeLocale)}
                strong
              />
              <SummaryRow
                label={copy.deliveryDays}
                value={
                  deliveryDays
                    ? safeLocale === "ja"
                      ? `${deliveryDays}日`
                      : `${deliveryDays} days`
                    : copy.notSet
                }
              />
              <SummaryRow
                label={copy.secondaryUse}
                value={
                  allowSecondaryUse
                    ? copy.secondaryUseAllowed
                    : copy.secondaryUseNotAllowed
                }
              />
            </div>

            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
              {copy.visible}
              <br />
              {copy.visibleBody}
            </div>

            <div className="mt-5 grid gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? copy.saving : copy.save}
              </button>

              <button
                type="button"
                onClick={() => router.push("/creator/menus")}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition active:scale-[0.98]"
              >
                {copy.cancel}
              </button>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}