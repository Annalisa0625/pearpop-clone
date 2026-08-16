"use client";

import StylePresetGallery from "@/components/trendre-link/StylePresetGallery";
import type { AnonymousLinkDraft } from "@/lib/trendre-link/anonymous-draft";
import type { CreatorLinkOnboardingPreset } from "@/lib/trendre-link/onboarding-presets";

type Props = {
  draft: AnonymousLinkDraft;
  avatarPreviewUrl: string | null;
  selectedPresetId: string | null;
  onSelect: (preset: CreatorLinkOnboardingPreset) => void;
};

export default function DeferredLinkPresetGrid({ draft, avatarPreviewUrl, selectedPresetId, onSelect }: Props) {
  return <StylePresetGallery
    selectedPresetId={selectedPresetId}
    onSelect={onSelect}
    data={{
      page: {
        slug: draft.page.slug || "your-link",
        displayName: draft.page.displayName || "Your name",
        displayNameColor: draft.page.displayNameColor,
        bio: draft.page.bio,
        avatarUrl: avatarPreviewUrl,
        coverUrl: null,
        themeKey: draft.page.themeKey,
        accentColor: draft.page.accentColor,
        buttonStyle: draft.page.buttonStyle,
        fontStyle: draft.page.fontStyle,
        isAcceptingInquiries: false,
      },
      items: [
        ...draft.socials.filter((item) => item.isVisible).map((item, index) => ({ id: item.clientId, sortOrder: index, itemType: "social" as const, platform: item.platform, title: null, description: null, url: item.url, imageUrl: null, metadata: item.metadata })),
        ...draft.links.filter((item) => item.isVisible).map((item) => ({ id: item.clientId, sortOrder: item.sortOrder, itemType: "link" as const, platform: null, title: item.title, description: null, url: item.url, imageUrl: null, metadata: item.metadata })),
      ],
      inquiryTypes: [],
    }}
  />;
}
