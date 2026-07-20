import type {
  CreatorLinkInquiryTemplate,
  CreatorLinkItemType,
  CreatorLinkStatus,
  CreatorLinkTheme,
  CreatorLinkButtonStyle,
  CreatorLinkFontStyle,
} from "./constants";
import type { CreatorLinkSlugValidationReason } from "./slug";
import type { CreatorLinkItemAppearance } from "./item-validation";
import type { CreatorLinkInquiryFormKind } from "./inquiry-forms";

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
  buttonStyle: CreatorLinkButtonStyle;
  fontStyle: CreatorLinkFontStyle;
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
  metadata: CreatorLinkItemAppearance;
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

export type CreatorLinkPageUpdateResponse =
  | {
      ok: true;
      page: CreatorLinkPage;
    }
  | {
      ok: false;
      error: string;
    };

export type CreatorLinkItemMutationResponse =
  | {
      ok: true;
      item: CreatorLinkItem;
    }
  | {
      ok: false;
      error: string;
    };

export type CreatorLinkItemDeleteResponse =
  | {
      ok: true;
      deletedItemId: string;
    }
  | {
      ok: false;
      error: string;
    };

export type CreatorLinkItemsReorderResponse =
  | {
      ok: true;
      items: CreatorLinkItem[];
    }
  | {
      ok: false;
      error: string;
    };

export type CreatorLinkInquiryFormsUpdateResponse =
  | {
      ok: true;
      inquiryTypes: CreatorLinkInquiryType[];
      isAcceptingInquiries: boolean;
    }
  | { ok: false; error: string };

export type CreatorLinkPublicInquiryResponse =
  | { ok: true }
  | { ok: false; error: string };

export type CreatorLinkInquiryFormConfig = {
  kind: CreatorLinkInquiryFormKind;
  title: string;
  isEnabled: boolean;
  sortOrder: number;
};
