import {
  isCreatorLinkInquiryTemplate,
  type CreatorLinkInquiryTemplate,
} from "./constants";
import type { Database } from "../../types/database.types";

export type CreatorLinkInquiryTypeRow = Pick<
  Database["public"]["Tables"]["creator_link_inquiry_types"]["Row"],
  | "id"
  | "sort_order"
  | "template_key"
  | "title"
  | "description"
  | "is_custom"
>;

export type PublicCreatorLinkInquiryType = {
  id: string;
  sortOrder: number;
  templateKey: CreatorLinkInquiryTemplate | null;
  title: string;
  description: string | null;
  isCustom: boolean;
};

export type CreatorLinkInquiryFormSelection = {
  id: string;
  kind: "pr" | "simple";
  title: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function isCreatorLinkInquiryTypeRow(
  value: unknown
): value is CreatorLinkInquiryTypeRow & {
  template_key: CreatorLinkInquiryTemplate | null;
} {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isSafeInteger(value.sort_order) &&
    (value.template_key === null ||
      (typeof value.template_key === "string" &&
        isCreatorLinkInquiryTemplate(value.template_key))) &&
    typeof value.title === "string" &&
    (typeof value.description === "string" || value.description === null) &&
    typeof value.is_custom === "boolean"
  );
}

export function toPublicCreatorLinkInquiryType(
  value: unknown
): PublicCreatorLinkInquiryType | null {
  if (!isCreatorLinkInquiryTypeRow(value)) {
    return null;
  }

  return {
    id: value.id,
    sortOrder: value.sort_order,
    templateKey: value.template_key,
    title: value.title,
    description: value.description,
    isCustom: value.is_custom,
  };
}

export function mapPublicCreatorLinkInquiryTypes(
  values: readonly unknown[]
): PublicCreatorLinkInquiryType[] {
  return values.flatMap((value) => {
    const inquiryType = toPublicCreatorLinkInquiryType(value);
    return inquiryType ? [inquiryType] : [];
  });
}

export function createCreatorLinkInquiryFormSelection(type: {
  id?: string;
  templateKey: string | null;
  title: string;
}): CreatorLinkInquiryFormSelection | null {
  if (!isNonEmptyString(type.id)) {
    return null;
  }

  return {
    id: type.id,
    kind: type.templateKey === "pr_post" ? "pr" : "simple",
    title: type.title,
  };
}
