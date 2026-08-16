// Compatibility layer for existing onboarding imports. The canonical catalog lives in link-design-presets.ts.
import { CREATOR_LINK_ONBOARDING_PRESETS, matchesLinkDesignPreset, type CreatorLinkOnboardingPreset, type LinkDesignItem, type LinkDesignPage } from "./link-design-presets";

export {
  LINK_DESIGN_PRESETS,
  type CreatorLinkPresetCategory,
  type LinkDesignPreset,
} from "./link-design-presets";
export { CREATOR_LINK_ONBOARDING_PRESETS, type CreatorLinkOnboardingPreset };

export function findMatchingOnboardingPreset(values: LinkDesignPage | { page: LinkDesignPage; socials?: readonly LinkDesignItem[]; links?: readonly LinkDesignItem[] }) {
  const state = "page" in values ? values : { page: values };
  return CREATOR_LINK_ONBOARDING_PRESETS.find((preset) => matchesLinkDesignPreset(preset, { page: state.page, socials: state.socials ?? [], links: state.links ?? [] })) ?? null;
}
