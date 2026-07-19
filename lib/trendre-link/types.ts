import type { Json } from "@/types/database.types";
import type {
  CreatorLinkInquiryTemplate,
  CreatorLinkItemType,
  CreatorLinkStatus,
  CreatorLinkTheme,
} from "./constants";
import type { CreatorLinkSlugValidationReason } from "./slug";

export type CreatorLinkPage = {
  id: string;
  creatorId: string;
  ownerUserId: string;
  slug: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  themeKey: CreatorLinkTheme;
  accentColor: string | null;
  buttonStyle: string;
  fontStyle: string;
  status: CreatorLinkStatus;
  isAcceptingInquiries: boolean;
  setupStep: number;
  setupCompletedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatorLinkItem = {
  id: string;
  pageId: string;
  itemType: CreatorLinkItemType;
  platform: string | null;
  title: string | null;
  description: string | null;
  url: string | null;
  imageUrl: string | null;
  metadata: Json;
  sortOrder: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreatorLinkInquiryType = {
  id: string;
  pageId: string;
  templateKey: CreatorLinkInquiryTemplate | null;
  title: string;
  description: string | null;
  sortOrder: number;
  isEnabled: boolean;
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreatorLinkBootstrapResponse =
  | {
      ok: true;
      createdCreator: boolean;
      createdPage: boolean;
      page: CreatorLinkPage;
      items: CreatorLinkItem[];
      inquiryTypes: CreatorLinkInquiryType[];
    }
  | {
      ok: false;
      error: string;
    };

export type CreatorLinkSlugAvailabilityResponse =
  | {
      ok: true;
      input?: string;
      normalizedSlug: string;
      available: boolean;
      reason: CreatorLinkSlugValidationReason | "unavailable";
    }
  | {
      ok: false;
      error: string;
    };
