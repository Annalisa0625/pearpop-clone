export const CREATOR_LINK_SERVICE_KEYS = [
  "instagram", "tiktok", "x", "youtube", "threads",
  "rakuten_room", "wear", "amazon_storefront", "apple_music", "spotify", "note", "lips",
  "custom",
] as const;

export type CreatorLinkServiceKey = (typeof CREATOR_LINK_SERVICE_KEYS)[number];
export type CreatorLinkSocialServiceKey = Extract<CreatorLinkServiceKey, "instagram" | "tiktok" | "x" | "youtube" | "threads">;
export type CreatorLinkStandardServiceKey = Exclude<CreatorLinkServiceKey, CreatorLinkSocialServiceKey | "custom">;
export type CreatorLinkServiceInputMode = "handle" | "url";

export type CreatorLinkServiceDefinition = {
  key: CreatorLinkServiceKey;
  labelJa: string;
  labelEn: string;
  descriptionJa: string;
  descriptionEn: string;
  kind: "social" | "link" | "custom";
  inputMode: CreatorLinkServiceInputMode;
  displayPrefix: string;
  placeholder: string;
  allowedHosts: readonly string[];
  aliases?: readonly string[];
};

const AMAZON_DOMAINS = [
  "amazon.com", "amazon.co.jp", "amazon.co.uk", "amazon.de", "amazon.fr", "amazon.it", "amazon.es",
  "amazon.ca", "amazon.com.au", "amazon.in", "amazon.com.br", "amazon.com.mx", "amazon.nl", "amazon.se",
  "amazon.pl", "amazon.sg", "amazon.ae", "amazon.sa",
] as const;

export const CREATOR_LINK_SERVICE_REGISTRY: Record<CreatorLinkServiceKey, CreatorLinkServiceDefinition> = {
  instagram: { key: "instagram", labelJa: "Instagram", labelEn: "Instagram", descriptionJa: "Instagramプロフィールを追加", descriptionEn: "Add your Instagram profile", kind: "social", inputMode: "handle", displayPrefix: "instagram.com/", placeholder: "username", allowedHosts: ["instagram.com"], aliases: ["www.instagram.com"] },
  tiktok: { key: "tiktok", labelJa: "TikTok", labelEn: "TikTok", descriptionJa: "TikTokプロフィールを追加", descriptionEn: "Add your TikTok profile", kind: "social", inputMode: "handle", displayPrefix: "tiktok.com/@", placeholder: "username", allowedHosts: ["tiktok.com"], aliases: ["www.tiktok.com"] },
  x: { key: "x", labelJa: "X", labelEn: "X", descriptionJa: "Xプロフィールを追加", descriptionEn: "Add your X profile", kind: "social", inputMode: "handle", displayPrefix: "x.com/", placeholder: "username", allowedHosts: ["x.com", "twitter.com"], aliases: ["www.x.com", "www.twitter.com"] },
  youtube: { key: "youtube", labelJa: "YouTube", labelEn: "YouTube", descriptionJa: "YouTubeチャンネルを追加", descriptionEn: "Add your YouTube channel", kind: "social", inputMode: "handle", displayPrefix: "youtube.com/@", placeholder: "handle", allowedHosts: ["youtube.com", "m.youtube.com"], aliases: ["www.youtube.com"] },
  threads: { key: "threads", labelJa: "Threads", labelEn: "Threads", descriptionJa: "Threadsプロフィールを追加", descriptionEn: "Add your Threads profile", kind: "social", inputMode: "handle", displayPrefix: "threads.com/@", placeholder: "username", allowedHosts: ["threads.com", "threads.net"], aliases: ["www.threads.com", "www.threads.net"] },
  rakuten_room: { key: "rakuten_room", labelJa: "楽天ROOM", labelEn: "Rakuten ROOM", descriptionJa: "あなたのROOM URLを貼り付け", descriptionEn: "Paste your ROOM profile URL", kind: "link", inputMode: "url", displayPrefix: "", placeholder: "https://room.rakuten.co.jp/room/...", allowedHosts: ["room.rakuten.co.jp"] },
  wear: { key: "wear", labelJa: "WEAR", labelEn: "WEAR", descriptionJa: "WEARプロフィールを追加", descriptionEn: "Add your WEAR profile", kind: "link", inputMode: "handle", displayPrefix: "wear.jp/", placeholder: "WEAR ID", allowedHosts: ["wear.jp"], aliases: ["www.wear.jp"] },
  amazon_storefront: { key: "amazon_storefront", labelJa: "Amazon Storefront", labelEn: "Amazon Storefront", descriptionJa: "AmazonストアフロントURLを貼り付け", descriptionEn: "Paste your Amazon storefront URL", kind: "link", inputMode: "url", displayPrefix: "", placeholder: "https://www.amazon.co.jp/shop/...", allowedHosts: AMAZON_DOMAINS },
  apple_music: { key: "apple_music", labelJa: "Apple Music", labelEn: "Apple Music", descriptionJa: "プロフィール・楽曲・アルバム・プレイリストURLを貼り付け", descriptionEn: "Paste a profile, song, album, or playlist URL", kind: "link", inputMode: "url", displayPrefix: "", placeholder: "https://music.apple.com/...", allowedHosts: ["music.apple.com"] },
  spotify: { key: "spotify", labelJa: "Spotify", labelEn: "Spotify", descriptionJa: "プロフィール・楽曲・アルバム・プレイリストURLを貼り付け", descriptionEn: "Paste a profile, track, album, or playlist URL", kind: "link", inputMode: "url", displayPrefix: "", placeholder: "https://open.spotify.com/...", allowedHosts: ["open.spotify.com"] },
  note: { key: "note", labelJa: "note", labelEn: "note", descriptionJa: "noteのプロフィール・記事URLを貼り付け", descriptionEn: "Paste a note profile or article URL", kind: "link", inputMode: "url", displayPrefix: "", placeholder: "https://note.com/...", allowedHosts: ["note.com"] },
  lips: { key: "lips", labelJa: "LIPS", labelEn: "LIPS", descriptionJa: "LIPSのプロフィールURLを貼り付け", descriptionEn: "Paste your LIPS profile URL", kind: "link", inputMode: "url", displayPrefix: "", placeholder: "https://lipscosme.com/users/...", allowedHosts: ["lipscosme.com"], aliases: ["www.lipscosme.com"] },
  custom: { key: "custom", labelJa: "カスタムリンク", labelEn: "Custom Link", descriptionJa: "任意のWebサイトURLを追加", descriptionEn: "Add any website URL", kind: "custom", inputMode: "url", displayPrefix: "", placeholder: "https://", allowedHosts: [] },
};

export const CREATOR_LINK_SOCIAL_SERVICES = CREATOR_LINK_SERVICE_KEYS.filter((key): key is CreatorLinkSocialServiceKey => CREATOR_LINK_SERVICE_REGISTRY[key].kind === "social");
export const CREATOR_LINK_STANDARD_SERVICES = CREATOR_LINK_SERVICE_KEYS.filter((key): key is CreatorLinkStandardServiceKey => CREATOR_LINK_SERVICE_REGISTRY[key].kind === "link");

export type CreatorLinkServiceValidationResult =
  | { ok: true; value: { editableValue: string; url: string } }
  | { ok: false; error: string };

export function isCreatorLinkServiceKey(value: unknown): value is CreatorLinkServiceKey {
  return typeof value === "string" && (CREATOR_LINK_SERVICE_KEYS as readonly string[]).includes(value);
}

export function getCreatorLinkService(key: CreatorLinkServiceKey) {
  return CREATOR_LINK_SERVICE_REGISTRY[key];
}

function parseHttpUrl(input: string) {
  try {
    const url = new URL(input);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function normalizedHost(hostname: string) {
  return hostname.toLowerCase().replace(/\.$/, "");
}

function hostMatches(hostname: string, allowed: readonly string[]) {
  const host = normalizedHost(hostname);
  return allowed.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function serviceAllowsHost(definition: CreatorLinkServiceDefinition, hostname: string) {
  const hosts = [...definition.allowedHosts, ...(definition.aliases ?? [])].map(normalizedHost);
  if (definition.key === "amazon_storefront") return hostMatches(hostname, definition.allowedHosts);
  return hosts.includes(normalizedHost(hostname));
}

function possibleKnownUrl(definition: CreatorLinkServiceDefinition, input: string) {
  const direct = parseHttpUrl(input);
  if (direct) return direct;
  const compact = input.replace(/^\/+/, "");
  const looksKnown = [...definition.allowedHosts, ...(definition.aliases ?? [])].some((host) => compact.toLowerCase().startsWith(`${host.toLowerCase()}/`));
  return looksKnown ? parseHttpUrl(`https://${compact}`) : null;
}

function decoded(value: string) {
  try { return decodeURIComponent(value); } catch { return value; }
}

function cleanHandle(value: string) {
  return decoded(value).trim().replace(/^@+/, "").replace(/^\/+|\/+$/g, "");
}

function handleFromUrl(key: CreatorLinkServiceKey, url: URL) {
  const parts = url.pathname.split("/").filter(Boolean);
  if (key === "youtube") {
    const first = parts[0] ?? "";
    if (first.startsWith("@")) return cleanHandle(first);
    return null;
  }
  return cleanHandle(parts[0] ?? "");
}

const HANDLE_PATTERNS: Partial<Record<CreatorLinkServiceKey, RegExp>> = {
  instagram: /^[A-Za-z0-9._]{1,30}$/,
  tiktok: /^[A-Za-z0-9._]{2,50}$/,
  x: /^[A-Za-z0-9_]{1,15}$/,
  youtube: /^[A-Za-z0-9._-]{3,100}$/,
  threads: /^[A-Za-z0-9._]{1,30}$/,
  wear: /^[A-Za-z0-9_-]{1,80}$/,
};

function buildHandleUrl(key: CreatorLinkServiceKey, handle: string) {
  const encoded = encodeURIComponent(handle);
  if (key === "instagram") return `https://www.instagram.com/${encoded}/`;
  if (key === "tiktok") return `https://www.tiktok.com/@${encoded}`;
  if (key === "x") return `https://x.com/${encoded}`;
  if (key === "youtube") return `https://www.youtube.com/@${encoded}`;
  if (key === "threads") return `https://www.threads.com/@${encoded}`;
  if (key === "wear") return `https://wear.jp/${encoded}/`;
  return "";
}

export function normalizeCreatorLinkServiceInput(key: CreatorLinkServiceKey, rawInput: string): CreatorLinkServiceValidationResult {
  const definition = getCreatorLinkService(key);
  const input = rawInput.trim();
  if (!input || input.length > 500) return { ok: false, error: `${definition.labelEn}の入力内容を確認してください。` };

  if (definition.inputMode === "handle") {
    const parsed = possibleKnownUrl(definition, input);
    let handle = parsed ? "" : cleanHandle(input);
    if (parsed) {
      if (!serviceAllowsHost(definition, parsed.hostname)) return { ok: false, error: `${definition.labelEn}の公式URLを入力してください。` };
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (key === "youtube" && ["channel", "c", "user"].includes(parts[0] ?? "") && parts[1]) {
        return { ok: true, value: { editableValue: parsed.toString(), url: parsed.toString() } };
      }
      const extracted = handleFromUrl(key, parsed);
      if (!extracted) return { ok: false, error: `${definition.labelEn}のプロフィールURLまたはIDを入力してください。` };
      handle = extracted;
    } else {
      const prefix = definition.displayPrefix.replace(/^https?:\/\//, "");
      if (handle.toLowerCase().startsWith(prefix.toLowerCase())) handle = cleanHandle(handle.slice(prefix.length));
    }
    const pattern = HANDLE_PATTERNS[key];
    if (!pattern?.test(handle)) return { ok: false, error: `${definition.labelEn}のユーザー名またはIDが正しくありません。` };
    return { ok: true, value: { editableValue: handle, url: buildHandleUrl(key, handle) } };
  }

  const parsed = parseHttpUrl(input);
  if (!parsed) return { ok: false, error: "httpまたはhttpsのURLを入力してください。" };
  if (key !== "custom" && !serviceAllowsHost(definition, parsed.hostname)) return { ok: false, error: `${definition.labelEn}の公式URLを入力してください。` };
  return { ok: true, value: { editableValue: parsed.toString(), url: parsed.toString() } };
}

export function extractCreatorLinkServiceEditableValue(key: CreatorLinkServiceKey, storedValue: string | null | undefined) {
  if (!storedValue) return "";
  const normalized = normalizeCreatorLinkServiceInput(key, storedValue);
  return normalized.ok ? normalized.value.editableValue : storedValue;
}

export function getCreatorLinkServiceKeyFromMetadata(metadata: unknown): CreatorLinkServiceKey | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const key = (metadata as Record<string, unknown>).serviceKey;
  return isCreatorLinkServiceKey(key) ? key : null;
}

export function validateCreatorLinkServiceLink(values: { serviceKey: CreatorLinkServiceKey; title: string; input: string }) {
  if (getCreatorLinkService(values.serviceKey).kind === "social") return { ok: false as const, error: "Social services must be added as Social items." };
  const title = values.title.trim();
  if (!title || title.length > 80) return { ok: false as const, error: "リンク名は1〜80文字で入力してください。" };
  const normalized = normalizeCreatorLinkServiceInput(values.serviceKey, values.input);
  if (!normalized.ok) return normalized;
  return { ok: true as const, value: { title, url: normalized.value.url, description: null, serviceKey: values.serviceKey } };
}
