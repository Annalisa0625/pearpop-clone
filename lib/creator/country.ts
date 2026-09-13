export const CREATOR_COUNTRIES = ["日本", "韓国", "台湾"] as const;

export type CreatorCountry = (typeof CREATOR_COUNTRIES)[number];

export const DEFAULT_CREATOR_COUNTRY: CreatorCountry = "日本";

export const CREATOR_COUNTRY_OPTIONS: ReadonlyArray<{
  value: CreatorCountry;
  label: string;
  flagCode: "jp" | "kr" | "tw";
}> = [
  { value: "日本", label: "日本", flagCode: "jp" },
  { value: "韓国", label: "대한민국", flagCode: "kr" },
  { value: "台湾", label: "台灣", flagCode: "tw" },
];

export const JAPAN_PREFECTURES = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
] as const;

const JAPAN_PREFECTURE_SET = new Set<string>(JAPAN_PREFECTURES);

export type CreatorLocationValidationError =
  | "invalid_country"
  | "prefecture_required"
  | "invalid_prefecture";

export type CanonicalCreatorLocation = {
  country: CreatorCountry;
  prefecture: string | null;
  prefectures: string[];
};

export type CreatorLocationValidationResult =
  | ({ ok: true } & CanonicalCreatorLocation)
  | { ok: false; error: CreatorLocationValidationError };

export function isCreatorCountry(value: unknown): value is CreatorCountry {
  return (
    typeof value === "string" &&
    (CREATOR_COUNTRIES as readonly string[]).includes(value)
  );
}

function normalizeCreatorCountry(value: unknown): CreatorCountry | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return isCreatorCountry(normalized) ? normalized : null;
}

export function normalizeCreatorCountryOrDefault(
  value: unknown,
): CreatorCountry {
  return normalizeCreatorCountry(value) ?? DEFAULT_CREATOR_COUNTRY;
}

export function parseCreatorPrefectures(value: unknown): string[] {
  const source = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : typeof value === "string"
      ? value.split(/[、,]/)
      : [];

  return Array.from(new Set(source.map((item) => item.trim()).filter(Boolean)));
}

export function joinCreatorPrefectures(
  prefectures: readonly string[],
): string | null {
  const normalized = parseCreatorPrefectures(prefectures);
  return normalized.length > 0 ? normalized.join("、") : null;
}

export function normalizeCreatorDraftLocation(
  countryValue: unknown,
  prefectureValue: unknown,
): CanonicalCreatorLocation {
  const country = normalizeCreatorCountryOrDefault(countryValue);
  const prefectures = country === "日本"
    ? parseCreatorPrefectures(prefectureValue).filter((item) =>
        JAPAN_PREFECTURE_SET.has(item),
      )
    : [];

  return {
    country,
    prefectures,
    prefecture: joinCreatorPrefectures(prefectures),
  };
}

export function getCreatorProfileLocationState(
  countryValue: unknown,
  prefectureValue: unknown,
): CanonicalCreatorLocation {
  return normalizeCreatorDraftLocation(countryValue, prefectureValue);
}

export function restoreCreatorSignupDraftLocation(draft: {
  country?: unknown;
  prefecture?: unknown;
}): { country: CreatorCountry; prefecture: string } {
  const location = normalizeCreatorDraftLocation(
    draft.country,
    draft.prefecture,
  );
  return {
    country: location.country,
    prefecture: location.prefecture ?? "",
  };
}

export function getCreatorLocationAfterCountryChange(
  nextCountry: CreatorCountry,
  currentPrefecture: unknown,
): CanonicalCreatorLocation {
  return normalizeCreatorDraftLocation(nextCountry, currentPrefecture);
}

export function canonicalizeCreatorLocation(
  countryValue: unknown,
  prefectureValue: unknown,
): CreatorLocationValidationResult {
  const country = normalizeCreatorCountry(countryValue);
  if (!country) {
    return { ok: false, error: "invalid_country" };
  }

  if (country !== "日本") {
    return { ok: true, country, prefecture: null, prefectures: [] };
  }

  if (
    (Array.isArray(prefectureValue) &&
      prefectureValue.some((item) => typeof item !== "string")) ||
    (!Array.isArray(prefectureValue) &&
      prefectureValue != null &&
      typeof prefectureValue !== "string")
  ) {
    return { ok: false, error: "invalid_prefecture" };
  }

  const prefectures = parseCreatorPrefectures(prefectureValue);
  if (prefectures.length === 0) {
    return { ok: false, error: "prefecture_required" };
  }
  if (prefectures.some((item) => !JAPAN_PREFECTURE_SET.has(item))) {
    return { ok: false, error: "invalid_prefecture" };
  }

  return {
    ok: true,
    country,
    prefecture: joinCreatorPrefectures(prefectures),
    prefectures,
  };
}
