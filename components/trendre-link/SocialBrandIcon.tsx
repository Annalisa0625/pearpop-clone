"use client";

import { FaInstagram, FaTiktok, FaXTwitter, FaYoutube } from "react-icons/fa6";
import type { CreatorLinkSocialPlatform } from "@/lib/trendre-link/item-validation";

export const SOCIAL_BRAND_COLORS: Record<CreatorLinkSocialPlatform, string> = {
  instagram: "#D9468F",
  tiktok: "#111111",
  x: "#111111",
  youtube: "#E52D27",
};

export default function SocialBrandIcon({ platform, brand = false, className = "h-[21px] w-[21px]" }: {
  platform: CreatorLinkSocialPlatform;
  brand?: boolean;
  className?: string;
}) {
  const props = { className, "aria-hidden": true } as const;
  const icon = platform === "instagram" ? <FaInstagram {...props} /> : platform === "tiktok" ? <FaTiktok {...props} /> : platform === "x" ? <FaXTwitter {...props} /> : <FaYoutube {...props} />;
  return <span role="img" aria-label={platform} style={brand ? { color: SOCIAL_BRAND_COLORS[platform] } : undefined}>{icon}</span>;
}
