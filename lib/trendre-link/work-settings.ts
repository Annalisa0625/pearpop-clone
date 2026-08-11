export type CreatorLinkWorkState = {
  simple: { isEnabled: boolean };
  pr: { isEnabled: boolean };
};

export type CreatorLinkWorkRoute = "hidden" | "simple" | "pr" | "choice";

export function getCreatorLinkWorkRoute(value: CreatorLinkWorkState): CreatorLinkWorkRoute {
  if (value.pr.isEnabled && value.simple.isEnabled) return "choice";
  if (value.pr.isEnabled) return "pr";
  if (value.simple.isEnabled) return "simple";
  return "hidden";
}

export function setCreatorLinkWorkEnabled<T extends CreatorLinkWorkState>(value: T, enabled: boolean): T {
  return {
    ...value,
    simple: { ...value.simple, isEnabled: enabled },
    pr: { ...value.pr, isEnabled: enabled },
  };
}
