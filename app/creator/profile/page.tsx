// app/creator/profile/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";

type CreatorRow = {
  id: string;
  user_id: string;
  display_name: string | null;
  full_name: string | null;
  bio: string | null;
  category: string | null;
  country: string | null;
  prefecture: string | null;
  city: string | null;
  content_language: string | null;
  response_language: string | null;
  sub_categories: string[] | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  approval_status: "pending" | "approved" | "rejected" | string | null;
};

type SocialAccountForm = {
  platform: string;
  url: string;
  follower_range: string;
  audience_country: string;
};

type LocaleOption = {
  value: string;
  ja: string;
  en: string;
};

const CREATOR_IMAGE_BUCKET =
  process.env.NEXT_PUBLIC_CREATOR_IMAGE_BUCKET || "creator-assets";

const CATEGORY_OPTIONS: LocaleOption[] = [
  { value: "美容", ja: "美容", en: "Beauty" },
  { value: "ファッション", ja: "ファッション", en: "Fashion" },
  { value: "グルメ", ja: "グルメ", en: "Food" },
  { value: "旅行", ja: "旅行", en: "Travel" },
  { value: "子育て", ja: "子育て", en: "Parenting" },
  { value: "ライフスタイル", ja: "ライフスタイル", en: "Lifestyle" },
  { value: "ガジェット", ja: "ガジェット", en: "Gadgets" },
  { value: "エンタメ", ja: "エンタメ", en: "Entertainment" },
  { value: "ビジネス", ja: "ビジネス", en: "Business" },
  { value: "教育", ja: "教育", en: "Education" },
  { value: "フィットネス", ja: "フィットネス", en: "Fitness" },
  { value: "その他", ja: "その他", en: "Other" },
];

const LANGUAGE_OPTIONS: LocaleOption[] = [
  { value: "日本語", ja: "日本語", en: "Japanese" },
  { value: "英語", ja: "英語", en: "English" },
  { value: "韓国語", ja: "韓国語", en: "Korean" },
  { value: "中国語", ja: "中国語", en: "Chinese" },
  { value: "その他", ja: "その他", en: "Other" },
];

const PLATFORM_OPTIONS = [
  "Instagram",
  "TikTok",
  "YouTube",
  "X",
  "Facebook",
  "Lemon8",
  "Pinterest",
  "Twitch",
  "Snapchat",
  "LinkedIn",
  "Threads",
  "小紅書",
  "抖音",
  "Bilibili",
  "微博",
  "その他",
];

const AUDIENCE_REGION_OPTIONS: LocaleOption[] = [
  { value: "日本", ja: "日本", en: "Japan" },
  { value: "韓国", ja: "韓国", en: "Korea" },
  { value: "台湾", ja: "台湾", en: "Taiwan" },
  { value: "香港", ja: "香港", en: "Hong Kong" },
  { value: "中国", ja: "中国", en: "China" },
  { value: "タイ", ja: "タイ", en: "Thailand" },
  { value: "ベトナム", ja: "ベトナム", en: "Vietnam" },
  { value: "インドネシア", ja: "インドネシア", en: "Indonesia" },
  { value: "フィリピン", ja: "フィリピン", en: "Philippines" },
  { value: "マレーシア", ja: "マレーシア", en: "Malaysia" },
  { value: "シンガポール", ja: "シンガポール", en: "Singapore" },
  { value: "インド", ja: "インド", en: "India" },
  { value: "UAE", ja: "UAE", en: "UAE" },
  { value: "サウジアラビア", ja: "サウジアラビア", en: "Saudi Arabia" },
  { value: "アメリカ", ja: "アメリカ", en: "United States" },
  { value: "カナダ", ja: "カナダ", en: "Canada" },
  { value: "イギリス", ja: "イギリス", en: "United Kingdom" },
  { value: "フランス", ja: "フランス", en: "France" },
  { value: "ドイツ", ja: "ドイツ", en: "Germany" },
  { value: "イタリア", ja: "イタリア", en: "Italy" },
  { value: "スペイン", ja: "スペイン", en: "Spain" },
  { value: "オーストラリア", ja: "オーストラリア", en: "Australia" },
  { value: "その他", ja: "その他", en: "Other" },
];

const FOLLOWER_RANGE_OPTIONS: LocaleOption[] = [
  { value: "1,000未満", ja: "1,000未満", en: "Under 1,000" },
  { value: "1,000〜5,000", ja: "1,000〜5,000", en: "1,000–5,000" },
  { value: "5,000〜10,000", ja: "5,000〜10,000", en: "5,000–10,000" },
  { value: "10,000〜30,000", ja: "10,000〜30,000", en: "10,000–30,000" },
  { value: "30,000〜50,000", ja: "30,000〜50,000", en: "30,000–50,000" },
  { value: "50,000〜100,000", ja: "50,000〜100,000", en: "50,000–100,000" },
  { value: "100,000〜300,000", ja: "100,000〜300,000", en: "100,000–300,000" },
  { value: "300,000〜500,000", ja: "300,000〜500,000", en: "300,000–500,000" },
  { value: "500,000〜1,000,000", ja: "500,000〜1,000,000", en: "500,000–1,000,000" },
  { value: "1,000,000以上", ja: "1,000,000以上", en: "1,000,000+" },
];

function createEmptySocial(): SocialAccountForm {
  return {
    platform: "",
    url: "",
    follower_range: "",
    audience_country: "",
  };
}

function getApprovalStatusLabel(
  status: string | null,
  locale: "ja" | "en"
): string {
  if (locale === "ja") {
    if (status === "approved") return "承認済";
    if (status === "pending") return "審査中";
    if (status === "rejected") return "却下";
    return status ?? "未承認";
  }

  if (status === "approved") return "Approved";
  if (status === "pending") return "Pending";
  if (status === "rejected") return "Rejected";
  return status ?? "Not approved";
}

function fileExtension(file: File) {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "jpg";
}

function fallbackInitial(name: string) {
  return (name || "C").slice(0, 1).toUpperCase();
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="block text-sm font-semibold">{children}</label>;
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-gray-900 ${
        props.className ?? ""
      }`}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-gray-900 ${
        props.className ?? ""
      }`}
    />
  );
}

function SelectBox(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`mt-2 w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 ${
        props.className ?? ""
      }`}
    />
  );
}

export default function CreatorProfilePage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale } = useAppLocale();

  const copy = useMemo(
    () =>
      locale === "ja"
        ? {
            badge: "Creator Profile",
            title: "プロフィール編集",
            subtitle:
              "登録内容・プロフィール画像・活動SNS情報をまとめて編集できます。",
            approvalStatus: "承認状態",
            publicName: "公開名（@表示名）",
            publicNamePlaceholder: "例：yourname / main_account_name",
            publicNameHelp:
              "企業や一覧画面で見える名前です。主要SNSアカウント名と揃えるのがおすすめです。",
            fullName: "氏名（任意）",
            category: "メインカテゴリ",
            country: "国",
            countryPlaceholder: "例：Japan / 日本",
            prefecture: "都道府県 / 州",
            prefecturePlaceholder: "例：京都府 / California",
            city: "市区町村（任意）",
            cityPlaceholder: "例：京都市",
            contentLanguage: "発信言語",
            responseLanguage: "対応言語",
            subCategories: "サブカテゴリ",
            bio: "短い自己紹介",
            bioPlaceholder:
              "企業に伝わるように、発信内容や得意ジャンルを簡潔に書いてください。",
            imageSection: "プロフィール画像",
            avatar: "プロフィール画像",
            cover: "カバー画像",
            imageHelp:
              "登録時にアップロードした画像をここで確認・再設定できます。",
            socialTitle: "活動SNS情報",
            socialSubtitle:
              "SNS媒体は複数登録できます。企業には媒体、URL、フォロワー帯、主な視聴者の国・地域が表示されます。",
            socialHelp:
              "ここで設定するのは本人の居住国ではなく、このSNSで届きやすい主な視聴者の国・地域です。",
            socialItem: "SNS",
            remove: "削除",
            platform: "SNS媒体",
            followerRange: "フォロワー帯",
            url: "SNS URL",
            audienceRegion: "主な視聴者の国・地域",
            addSocial: "SNSを追加",
            saving: "保存中...",
            save: "保存する",
            backToDashboard: "ダッシュボードへ戻る",
            selectPlease: "選択してください",
            creatorNotFound: "クリエイター情報が見つかりませんでした。",
            publicNameRequired: "公開名を入力してください",
            publicNameInvalid:
              "公開名は英小文字・数字・アンダースコア・ハイフンのみで3〜30文字です",
            publicNameDuplicate: "この公開名は既に使われています",
            categoryRequired: "カテゴリーを選択してください",
            locationRequired: "国と都道府県 / 州を入力してください",
            languageRequired: "発信言語と対応言語を選択してください",
            socialRequired: "活動SNSを少なくとも1件入力してください",
            socialIncomplete: "活動SNSに未入力の行があります",
            missingCreatorId: "creator_id を取得できませんでした。",
            missingUserId: "user_id を取得できませんでした。",
            saved: "プロフィールを保存しました。",
            saveError: "保存中にエラーが発生しました。",
            loading: "読み込み中...",
            uploadFailed: "画像アップロードに失敗しました。",
            noImage: "まだ画像はありません",
          }
        : {
            badge: "Creator Profile",
            title: "Edit Profile",
            subtitle:
              "Edit your signup details, profile images, and social account information.",
            approvalStatus: "Approval Status",
            publicName: "Public Name (@display name)",
            publicNamePlaceholder: "Example: yourname / main_account_name",
            publicNameHelp:
              "This is the public-facing name shown to brands and listing pages.",
            fullName: "Full Name (optional)",
            category: "Main Category",
            country: "Country",
            countryPlaceholder: "Example: Japan",
            prefecture: "State / Prefecture",
            prefecturePlaceholder: "Example: Kyoto / California",
            city: "City (optional)",
            cityPlaceholder: "Example: Kyoto City",
            contentLanguage: "Content Language",
            responseLanguage: "Response Language",
            subCategories: "Sub-categories",
            bio: "Short Bio",
            bioPlaceholder:
              "Briefly describe what you create and what kind of collaborations fit you.",
            imageSection: "Profile Images",
            avatar: "Profile Image",
            cover: "Cover Image",
            imageHelp:
              "You can review and replace the images uploaded during signup here.",
            socialTitle: "Social Account Information",
            socialSubtitle:
              "You can register multiple social platforms. Companies will see the platform, URL, follower range, and main audience region.",
            socialHelp:
              "This is not your own country. It refers to the main country or region your audience comes from for each account.",
            socialItem: "SNS",
            remove: "Remove",
            platform: "Platform",
            followerRange: "Follower Range",
            url: "SNS URL",
            audienceRegion: "Main Audience Region",
            addSocial: "Add SNS",
            saving: "Saving...",
            save: "Save",
            backToDashboard: "Back to Dashboard",
            selectPlease: "Please select",
            creatorNotFound: "Creator information was not found.",
            publicNameRequired: "Please enter your public name",
            publicNameInvalid:
              "Public name must be 3–30 characters using lowercase letters, numbers, underscores, or hyphens",
            publicNameDuplicate: "This public name is already in use",
            categoryRequired: "Please select a category",
            locationRequired: "Please enter your country and state / prefecture",
            languageRequired: "Please select content and response languages",
            socialRequired: "Please enter at least one social account",
            socialIncomplete: "One or more social account rows are incomplete",
            missingCreatorId: "Could not retrieve creator_id.",
            missingUserId: "Could not retrieve user_id.",
            saved: "Profile saved successfully.",
            saveError: "An error occurred while saving.",
            loading: "Loading...",
            uploadFailed: "Failed to upload image.",
            noImage: "No image yet",
          },
    [locale]
  );

  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [creatorUserId, setCreatorUserId] = useState<string | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [fullName, setFullName] = useState("");
  const [category, setCategory] = useState("");
  const [country, setCountry] = useState("");
  const [prefecture, setPrefecture] = useState("");
  const [city, setCity] = useState("");
  const [contentLanguage, setContentLanguage] = useState("");
  const [responseLanguage, setResponseLanguage] = useState("");
  const [subCategories, setSubCategories] = useState<string[]>([]);
  const [bio, setBio] = useState("");

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [socialAccounts, setSocialAccounts] = useState<SocialAccountForm[]>([
    createEmptySocial(),
  ]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [avatarPreview, coverPreview]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
      const metadataCover =
        typeof metadata.creator_cover_image_url === "string"
          ? metadata.creator_cover_image_url
          : null;

      const { data: creator, error: creatorError } = await supabase
        .from("creators")
        .select(
          "id, user_id, display_name, full_name, bio, category, country, prefecture, city, content_language, response_language, sub_categories, avatar_url, cover_image_url, approval_status"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (creatorError) {
        setError(creatorError.message);
        setLoading(false);
        return;
      }

      if (!creator) {
        setError(copy.creatorNotFound);
        setLoading(false);
        return;
      }

      const creatorRow = creator as CreatorRow;

      setCreatorId(creatorRow.id);
      setCreatorUserId(creatorRow.user_id);
      setApprovalStatus(creatorRow.approval_status ?? null);
      setDisplayName(creatorRow.display_name ?? "");
      setFullName(creatorRow.full_name ?? "");
      setCategory(creatorRow.category ?? "");
      setCountry(creatorRow.country ?? "");
      setPrefecture(creatorRow.prefecture ?? "");
      setCity(creatorRow.city ?? "");
      setContentLanguage(creatorRow.content_language ?? "");
      setResponseLanguage(creatorRow.response_language ?? "");
      setSubCategories(
        Array.isArray(creatorRow.sub_categories) ? creatorRow.sub_categories : []
      );
      setBio(creatorRow.bio ?? "");
      setAvatarUrl(creatorRow.avatar_url ?? null);
      setCoverUrl(creatorRow.cover_image_url ?? metadataCover ?? null);

      const { data: socials, error: socialError } = await supabase
        .from("creator_social_accounts")
        .select("platform, url, follower_range, audience_country")
        .eq("creator_id", creatorRow.id)
        .order("created_at", { ascending: true });

      if (socialError) {
        setError(socialError.message);
        setLoading(false);
        return;
      }

      const socialRows =
        (socials as SocialAccountForm[] | null)?.filter(Boolean) ?? [];

      setSocialAccounts(
        socialRows.length > 0 ? socialRows : [createEmptySocial()]
      );

      setLoading(false);
    };

    void load();
  }, [copy.creatorNotFound, router, supabase]);

  const approvalLabel = getApprovalStatusLabel(
    approvalStatus,
    locale as "ja" | "en"
  );

  const uploadImageAndGetUrl = async (
    file: File,
    creatorIdValue: string,
    kind: "avatar" | "cover"
  ) => {
    const ext = fileExtension(file);
    const filePath = `${creatorIdValue}/${kind}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(CREATOR_IMAGE_BUCKET)
      .upload(filePath, file, {
        upsert: true,
        cacheControl: "3600",
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from(CREATOR_IMAGE_BUCKET)
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const isValidPublicName = (value: string) => {
    return /^[a-z0-9][a-z0-9_-]{2,29}$/.test(value);
  };

  const validate = () => {
    const normalizedDisplayName = displayName.trim().toLowerCase();

    if (!normalizedDisplayName) return copy.publicNameRequired;
    if (!isValidPublicName(normalizedDisplayName)) return copy.publicNameInvalid;
    if (!category.trim()) return copy.categoryRequired;
    if (!country.trim() || !prefecture.trim()) return copy.locationRequired;
    if (!contentLanguage.trim() || !responseLanguage.trim()) {
      return copy.languageRequired;
    }

    const cleaned = socialAccounts.filter(
      (item) =>
        item.platform.trim() ||
        item.url.trim() ||
        item.follower_range.trim() ||
        item.audience_country.trim()
    );

    if (cleaned.length === 0) return copy.socialRequired;

    const hasIncomplete = cleaned.some(
      (item) =>
        !item.platform.trim() ||
        !item.url.trim() ||
        !item.follower_range.trim() ||
        !item.audience_country.trim()
    );

    if (hasIncomplete) return copy.socialIncomplete;

    return null;
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!creatorId) {
      setError(copy.missingCreatorId);
      return;
    }

    if (!creatorUserId) {
      setError(copy.missingUserId);
      return;
    }

    setSaving(true);

    try {
      const normalizedDisplayName = displayName.trim().toLowerCase();
      const normalizedFullName = fullName.trim();
      const normalizedCountry = country.trim();
      const normalizedPrefecture = prefecture.trim();
      const normalizedCity = city.trim();
      const normalizedBio = bio.trim();
      const normalizedCategory = category.trim();
      const normalizedContentLanguage = contentLanguage.trim();
      const normalizedResponseLanguage = responseLanguage.trim();

      const { data: duplicateProfile, error: duplicateError } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", normalizedDisplayName)
        .maybeSingle();

      if (duplicateError) {
        throw duplicateError;
      }

      if (duplicateProfile && duplicateProfile.id !== creatorUserId) {
        setError(copy.publicNameDuplicate);
        setSaving(false);
        return;
      }

      let finalAvatarUrl = avatarUrl;
      let finalCoverUrl = coverUrl;

      if (avatarFile) {
        finalAvatarUrl = await uploadImageAndGetUrl(
          avatarFile,
          creatorId,
          "avatar"
        );
      }

      if (coverFile) {
        finalCoverUrl = await uploadImageAndGetUrl(
          coverFile,
          creatorId,
          "cover"
        );
      }

      const now = new Date().toISOString();

      const { error: creatorUpdateError } = await supabase
        .from("creators")
        .update({
          display_name: normalizedDisplayName,
          full_name: normalizedFullName || null,
          bio: normalizedBio || null,
          category: normalizedCategory || null,
          country: normalizedCountry,
          prefecture: normalizedPrefecture,
          city: normalizedCity || null,
          content_language: normalizedContentLanguage || null,
          response_language: normalizedResponseLanguage || null,
          sub_categories: subCategories.length > 0 ? subCategories : [],
          avatar_url: finalAvatarUrl,
          cover_image_url: finalCoverUrl,
          updated_at: now,
        })
        .eq("id", creatorId);

      if (creatorUpdateError) {
        throw creatorUpdateError;
      }

      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .upsert({
          id: creatorUserId,
          username: normalizedDisplayName,
          bio: normalizedBio || null,
          category: normalizedCategory || null,
          avatar_url: finalAvatarUrl,
          is_public: true,
          public_profile_completed: true,
          onboarding_completed: true,
          updated_at: now,
        });

      if (profileUpdateError) {
        throw profileUpdateError;
      }

      const { error: stateUpdateError } = await supabase
        .from("user_states")
        .upsert({
          user_id: creatorUserId,
          creator_profile_completed: true,
          onboarding_completed: true,
          updated_at: now,
        });

      if (stateUpdateError) {
        throw stateUpdateError;
      }

      const cleanedSocials = socialAccounts
        .map((item) => ({
          platform: item.platform.trim(),
          url: item.url.trim(),
          follower_range: item.follower_range.trim(),
          audience_country: item.audience_country.trim(),
        }))
        .filter(
          (item) =>
            item.platform &&
            item.url &&
            item.follower_range &&
            item.audience_country
        );

      const { error: deleteSocialError } = await supabase
        .from("creator_social_accounts")
        .delete()
        .eq("creator_id", creatorId);

      if (deleteSocialError) {
        throw deleteSocialError;
      }

      if (cleanedSocials.length > 0) {
        const payload = cleanedSocials.map((item) => ({
          creator_id: creatorId,
          platform: item.platform,
          url: item.url,
          follower_range: item.follower_range,
          audience_country: item.audience_country,
        }));

        const { error: insertSocialError } = await supabase
          .from("creator_social_accounts")
          .insert(payload);

        if (insertSocialError) {
          throw insertSocialError;
        }
      }

      await supabase.auth.updateUser({
        data: {
          creator_username: normalizedDisplayName,
          creator_country: normalizedCountry,
          creator_prefecture: normalizedPrefecture,
          creator_city: normalizedCity || null,
          creator_content_language: normalizedContentLanguage,
          creator_response_language: normalizedResponseLanguage,
          creator_sub_categories: subCategories,
          creator_cover_image_url: finalCoverUrl ?? null,
        },
      });

      setDisplayName(normalizedDisplayName);
      setFullName(normalizedFullName);
      setCountry(normalizedCountry);
      setPrefecture(normalizedPrefecture);
      setCity(normalizedCity);
      setBio(normalizedBio);
      setCategory(normalizedCategory);
      setContentLanguage(normalizedContentLanguage);
      setResponseLanguage(normalizedResponseLanguage);
      setAvatarUrl(finalAvatarUrl ?? null);
      setCoverUrl(finalCoverUrl ?? null);
      setAvatarFile(null);
      setCoverFile(null);
      setAvatarPreview(null);
      setCoverPreview(null);
      setSuccess(copy.saved);
      router.refresh();
    } catch (e) {
      console.error(e);
      setError(copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleSubCategoryToggle = (value: string) => {
    setSubCategories((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const updateSocial = (
    index: number,
    key: keyof SocialAccountForm,
    value: string
  ) => {
    setSocialAccounts((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [key]: value,
            }
          : item
      )
    );
  };

  const addSocial = () => {
    setSocialAccounts((prev) => [...prev, createEmptySocial()]);
  };

  const removeSocial = (index: number) => {
    setSocialAccounts((prev) => {
      if (prev.length === 1) return [createEmptySocial()];
      return prev.filter((_, i) => i !== index);
    });
  };

  if (loading) {
    return <p className="p-6">{copy.loading}</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-blue-600">{copy.badge}</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">{copy.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              {copy.subtitle}
            </p>
          </div>

          <div className="self-start rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
            {copy.approvalStatus}: {approvalLabel}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/creator/dashboard"
            className="inline-flex items-center justify-center rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
          >
            {copy.backToDashboard}
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-2xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50"
          >
            {saving ? copy.saving : copy.save}
          </button>
        </div>
      </section>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-3xl border border-green-200 bg-green-50 p-5 text-sm text-green-700">
          {success}
        </div>
      ) : null}

      <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <FieldLabel>{copy.publicName}</FieldLabel>
            <TextInput
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={copy.publicNamePlaceholder}
              autoCapitalize="none"
              autoCorrect="off"
            />
            <p className="mt-2 text-xs leading-5 text-gray-500">
              {copy.publicNameHelp}
            </p>
          </div>

          <div>
            <FieldLabel>{copy.fullName}</FieldLabel>
            <TextInput
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={copy.fullName}
            />
          </div>

          <div>
            <FieldLabel>{copy.category}</FieldLabel>
            <SelectBox
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">{copy.selectPlease}</option>
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {locale === "ja" ? option.ja : option.en}
                </option>
              ))}
            </SelectBox>
          </div>

          <div>
            <FieldLabel>{copy.country}</FieldLabel>
            <TextInput
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder={copy.countryPlaceholder}
            />
          </div>

          <div>
            <FieldLabel>{copy.prefecture}</FieldLabel>
            <TextInput
              value={prefecture}
              onChange={(e) => setPrefecture(e.target.value)}
              placeholder={copy.prefecturePlaceholder}
            />
          </div>

          <div>
            <FieldLabel>{copy.city}</FieldLabel>
            <TextInput
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={copy.cityPlaceholder}
            />
          </div>

          <div>
            <FieldLabel>{copy.contentLanguage}</FieldLabel>
            <SelectBox
              value={contentLanguage}
              onChange={(e) => setContentLanguage(e.target.value)}
            >
              <option value="">{copy.selectPlease}</option>
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {locale === "ja" ? option.ja : option.en}
                </option>
              ))}
            </SelectBox>
          </div>

          <div>
            <FieldLabel>{copy.responseLanguage}</FieldLabel>
            <SelectBox
              value={responseLanguage}
              onChange={(e) => setResponseLanguage(e.target.value)}
            >
              <option value="">{copy.selectPlease}</option>
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {locale === "ja" ? option.ja : option.en}
                </option>
              ))}
            </SelectBox>
          </div>

          <div className="lg:col-span-2">
            <FieldLabel>{copy.subCategories}</FieldLabel>
            <div className="mt-3 flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((option) => {
                const active = subCategories.includes(option.value);

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSubCategoryToggle(option.value)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      active
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {locale === "ja" ? option.ja : option.en}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-2">
            <FieldLabel>{copy.bio}</FieldLabel>
            <TextArea
              rows={5}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={copy.bioPlaceholder}
            />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold">{copy.imageSection}</h2>
        <p className="mt-2 text-sm leading-6 text-gray-600">{copy.imageHelp}</p>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border bg-gray-50 p-4">
            <FieldLabel>{copy.avatar}</FieldLabel>
            <input
              type="file"
              accept="image/*"
              className="mt-3 block w-full text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setAvatarFile(file);
                setAvatarPreview(file ? URL.createObjectURL(file) : null);
              }}
            />

            <div className="mt-4 flex h-28 w-28 items-center justify-center overflow-hidden rounded-[24px] border bg-white text-2xl font-bold text-gray-500">
              {avatarPreview || avatarUrl ? (
                <img
                  src={avatarPreview || avatarUrl || ""}
                  alt={copy.avatar}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{fallbackInitial(displayName)}</span>
              )}
            </div>
          </div>

          <div className="rounded-2xl border bg-gray-50 p-4">
            <FieldLabel>{copy.cover}</FieldLabel>
            <input
              type="file"
              accept="image/*"
              className="mt-3 block w-full text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setCoverFile(file);
                setCoverPreview(file ? URL.createObjectURL(file) : null);
              }}
            />

            <div className="mt-4 h-40 overflow-hidden rounded-[24px] border bg-white">
              {coverPreview || coverUrl ? (
                <img
                  src={coverPreview || coverUrl || ""}
                  alt={copy.cover}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-500">
                  {copy.noImage}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold">{copy.socialTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          {copy.socialSubtitle}
        </p>
        <p className="mt-2 text-xs leading-5 text-gray-500">{copy.socialHelp}</p>

        <div className="mt-5 space-y-4">
          {socialAccounts.map((item, index) => (
            <div key={index} className="rounded-2xl border bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-base font-semibold">
                  {copy.socialItem} {index + 1}
                </p>
                <button
                  type="button"
                  onClick={() => removeSocial(index)}
                  className="text-sm font-semibold text-red-600 hover:underline"
                >
                  {copy.remove}
                </button>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <FieldLabel>{copy.platform}</FieldLabel>
                  <SelectBox
                    value={item.platform}
                    onChange={(e) =>
                      updateSocial(index, "platform", e.target.value)
                    }
                  >
                    <option value="">{copy.selectPlease}</option>
                    {PLATFORM_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </SelectBox>
                </div>

                <div>
                  <FieldLabel>{copy.followerRange}</FieldLabel>
                  <SelectBox
                    value={item.follower_range}
                    onChange={(e) =>
                      updateSocial(index, "follower_range", e.target.value)
                    }
                  >
                    <option value="">{copy.selectPlease}</option>
                    {FOLLOWER_RANGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {locale === "ja" ? option.ja : option.en}
                      </option>
                    ))}
                  </SelectBox>
                </div>

                <div className="lg:col-span-2">
                  <FieldLabel>{copy.url}</FieldLabel>
                  <TextInput
                    value={item.url}
                    onChange={(e) => updateSocial(index, "url", e.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <FieldLabel>{copy.audienceRegion}</FieldLabel>
                  <SelectBox
                    value={item.audience_country}
                    onChange={(e) =>
                      updateSocial(index, "audience_country", e.target.value)
                    }
                  >
                    <option value="">{copy.selectPlease}</option>
                    {AUDIENCE_REGION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {locale === "ja" ? option.ja : option.en}
                      </option>
                    ))}
                  </SelectBox>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addSocial}
          className="mt-4 rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
        >
          {copy.addSocial}
        </button>
      </section>

      <div className="flex flex-wrap gap-3 pb-4">
        <Link
          href="/creator/dashboard"
          className="inline-flex items-center justify-center rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
        >
          {copy.backToDashboard}
        </Link>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-2xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50"
        >
          {saving ? copy.saving : copy.save}
        </button>
      </div>
    </div>
  );
}