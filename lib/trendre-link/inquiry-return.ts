import {
  CAMPAIGN_GOALS,
  COMPANY_SOCIAL_PLATFORMS,
  FREE_OFFER_OPTIONS,
  MEETING_METHODS,
  PR_PROJECT_TYPES,
  REQUEST_MODES,
  REQUESTED_PLATFORMS,
  UGC_DELIVERABLE_TYPES,
  UGC_USAGE_PURPOSES,
  type CreatorLinkInquiryFormKind,
  type PlatformDeliverable,
} from "./inquiry-forms";

const DRAFT_VERSION = 2;
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CreatorLinkInquiryFormState = {
  request_mode: "" | "pr_post" | "ugc";
  project_type: string;
  requested_platforms: string[];
  other_platform: string;
  deliverables_by_platform: Record<string, PlatformDeliverable[]>;
  ugc_deliverable_types: string[];
  ugc_other_deliverable: string;
  deliverable_count: number;
  usage_purposes: string[];
  usage_other: string;
  meeting_method: string;
  product_name: string;
  product_url: string;
  desired_timing: string;
  budget_text: string;
  campaign_goal: string;
  campaign_goal_other: string;
  has_free_offer: "" | "provided" | "not_provided";
  free_offer_item: string;
  free_offer_quantity: string;
  free_offer_frequency: string;
  free_offer_people: string;
  free_offer_conditions: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  company_website: string;
  company_social_accounts: Record<string, string>;
  selling_points: string;
  reference_url: string;
  additional_notes: string;
  consents: boolean[];
  privacy_consent: boolean;
  subject: string;
  message: string;
  website: string;
};

export type CreatorLinkInquiryDraft = {
  version: typeof DRAFT_VERSION;
  slug: string;
  formId: string;
  submissionId: string;
  kind: CreatorLinkInquiryFormKind;
  title: string;
  form: CreatorLinkInquiryFormState;
  step: number;
  savedAt: number;
};

export function createEmptyInquiryFormState(): CreatorLinkInquiryFormState {
  return {
    request_mode: "",
    project_type: "",
    requested_platforms: [],
    other_platform: "",
    deliverables_by_platform: {},
    ugc_deliverable_types: [],
    ugc_other_deliverable: "",
    deliverable_count: 1,
    usage_purposes: [],
    usage_other: "",
    meeting_method: "",
    product_name: "",
    product_url: "",
    desired_timing: "",
    budget_text: "",
    campaign_goal: "",
    campaign_goal_other: "",
    has_free_offer: "",
    free_offer_item: "",
    free_offer_quantity: "",
    free_offer_frequency: "",
    free_offer_people: "",
    free_offer_conditions: "",
    company_name: "",
    contact_name: "",
    contact_email: "",
    company_website: "",
    company_social_accounts: {},
    selling_points: "",
    reference_url: "",
    additional_notes: "",
    consents: [false, false, false, false, false, false],
    privacy_consent: false,
    subject: "",
    message: "",
    website: "",
  };
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function string(value: unknown, max: number) {
  return typeof value === "string" && value.length <= max;
}

function stringArray(value: unknown, allowed: readonly string[], max = allowed.length) {
  return (
    Array.isArray(value) &&
    value.length <= max &&
    value.every((item) => typeof item === "string" && allowed.includes(item)) &&
    new Set(value).size === value.length
  );
}

export function isCreatorLinkInquiryFormState(
  value: unknown
): value is CreatorLinkInquiryFormState {
  if (!record(value)) return false;
  const stringLimits: Record<string, number> = {
    project_type: 80,
    other_platform: 100,
    ugc_other_deliverable: 200,
    usage_other: 200,
    meeting_method: 80,
    product_name: 200,
    product_url: 500,
    desired_timing: 120,
    budget_text: 12,
    campaign_goal: 80,
    campaign_goal_other: 200,
    free_offer_item: 200,
    free_offer_quantity: 80,
    free_offer_frequency: 80,
    free_offer_people: 80,
    free_offer_conditions: 1000,
    company_name: 120,
    contact_name: 80,
    contact_email: 254,
    company_website: 500,
    selling_points: 2000,
    reference_url: 500,
    additional_notes: 3000,
    subject: 120,
    message: 3000,
    website: 200,
  };
  if (Object.entries(stringLimits).some(([key, max]) => !string(value[key], max))) {
    return false;
  }
  if (
    (value.request_mode !== "" && !REQUEST_MODES.includes(value.request_mode as never)) ||
    (value.project_type !== "" && !PR_PROJECT_TYPES.includes(value.project_type as never)) ||
    !stringArray(value.requested_platforms, REQUESTED_PLATFORMS) ||
    !stringArray(value.ugc_deliverable_types, UGC_DELIVERABLE_TYPES) ||
    !stringArray(value.usage_purposes, UGC_USAGE_PURPOSES) ||
    (value.meeting_method !== "" && !MEETING_METHODS.includes(value.meeting_method as never)) ||
    (value.campaign_goal !== "" && !CAMPAIGN_GOALS.includes(value.campaign_goal as never)) ||
    (value.has_free_offer !== "" && !FREE_OFFER_OPTIONS.includes(value.has_free_offer as never)) ||
    !Number.isSafeInteger(value.deliverable_count) ||
    Number(value.deliverable_count) < 1 ||
    Number(value.deliverable_count) > 10_000 ||
    typeof value.privacy_consent !== "boolean" ||
    !Array.isArray(value.consents) ||
    value.consents.length !== 6 ||
    value.consents.some((item) => typeof item !== "boolean") ||
    !record(value.company_social_accounts) ||
    Object.keys(value.company_social_accounts).some(
      (key) => !COMPANY_SOCIAL_PLATFORMS.includes(key as never)
    ) ||
    Object.values(value.company_social_accounts).some(
      (item) => typeof item !== "string" || item.length < 1 || item.length > 100
    ) ||
    !record(value.deliverables_by_platform)
  ) {
    return false;
  }
  for (const [platform, items] of Object.entries(value.deliverables_by_platform)) {
    if (!REQUESTED_PLATFORMS.includes(platform as never) || !Array.isArray(items)) return false;
    if (
      items.length > 10 ||
      items.some(
        (item) =>
          !record(item) ||
          !string(item.type, 80) ||
          !Number.isSafeInteger(item.count) ||
          Number(item.count) < 1 ||
          Number(item.count) > 10_000 ||
          (item.other_text !== null && item.other_text !== undefined && !string(item.other_text, 200))
      )
    ) {
      return false;
    }
  }
  return true;
}

export function inquiryDraftStorageKey(slug: string) {
  return `trendre-link:inquiry-draft:${slug}`;
}

export function buildInquiryReturnPath(slug: string) {
  return `/in/${encodeURIComponent(slug)}?resume=inquiry`;
}

export function createInquirySubmissionId() {
  try {
    return globalThis.crypto?.randomUUID?.() ?? null;
  } catch {
    return null;
  }
}

export function safeSessionStorageGet(key: string) {
  try {
    return globalThis.window?.sessionStorage.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function safeSessionStorageSet(key: string, value: string) {
  try {
    globalThis.window?.sessionStorage.setItem(key, value);
    return Boolean(globalThis.window);
  } catch {
    return false;
  }
}

export function safeSessionStorageRemove(key: string) {
  try {
    globalThis.window?.sessionStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function createInquiryDraft(args: {
  slug: string;
  formId: string;
  submissionId: string;
  kind: CreatorLinkInquiryFormKind;
  title: string;
  form: CreatorLinkInquiryFormState;
  step: number;
  now?: number;
}): CreatorLinkInquiryDraft {
  return {
    version: DRAFT_VERSION,
    slug: args.slug,
    formId: args.formId,
    submissionId: args.submissionId,
    kind: args.kind,
    title: args.title,
    form: args.form,
    step: args.step,
    savedAt: args.now ?? Date.now(),
  };
}

export function parseInquiryDraft(
  value: string | null,
  expected: {
    slug: string;
    formId?: string;
    kind?: CreatorLinkInquiryFormKind;
  },
  now = Date.now()
): CreatorLinkInquiryDraft | null {
  if (!value) return null;
  try {
    const draft: unknown = JSON.parse(value);
    if (
      !record(draft) ||
      draft.version !== DRAFT_VERSION ||
      draft.slug !== expected.slug ||
      !UUID_PATTERN.test(String(draft.formId ?? "")) ||
      (expected.formId !== undefined && draft.formId !== expected.formId) ||
      !UUID_PATTERN.test(String(draft.submissionId ?? "")) ||
      (draft.kind !== "simple" && draft.kind !== "pr") ||
      (expected.kind !== undefined && draft.kind !== expected.kind) ||
      !string(draft.title, 120) ||
      !Number.isInteger(draft.step) ||
      Number(draft.step) < 0 ||
      Number(draft.step) > 5 ||
      typeof draft.savedAt !== "number" ||
      !Number.isFinite(draft.savedAt) ||
      draft.savedAt > now + 60_000 ||
      now - draft.savedAt > DRAFT_TTL_MS ||
      !isCreatorLinkInquiryFormState(draft.form)
    ) {
      return null;
    }
    return draft as CreatorLinkInquiryDraft;
  } catch {
    return null;
  }
}
