"use client";

import TrendreLinkCanvas from "@/components/trendre-link/TrendreLinkCanvas";
import { useAppLocale } from "@/lib/i18n/locale";
import type {
  CreatorLinkInquiryType,
  CreatorLinkItem,
  CreatorLinkPage,
} from "@/lib/trendre-link/types";

type PublicLinkPage = Pick<
  CreatorLinkPage,
  | "slug"
  | "displayName"
  | "bio"
  | "avatarUrl"
  | "coverUrl"
  | "themeKey"
  | "accentColor"
  | "buttonStyle"
  | "fontStyle"
  | "isAcceptingInquiries"
>;

type PublicLinkItem = Pick<
  CreatorLinkItem,
  "itemType" | "platform" | "title" | "description" | "url" | "imageUrl" | "metadata"
>;

type PublicInquiryType = Pick<
  CreatorLinkInquiryType,
  "templateKey" | "title" | "description" | "isCustom"
>;

export type TrendreLinkPublicData = {
  page: PublicLinkPage;
  items: PublicLinkItem[];
  inquiryTypes: PublicInquiryType[];
};

export default function TrendreLinkPublicView({ data }: { data: TrendreLinkPublicData }) {
  const { locale } = useAppLocale();
  return (
    <main className="min-h-screen">
      <TrendreLinkCanvas data={data} mode="public" locale={locale === "en" ? "en" : "ja"} />
    </main>
  );
}
