"use client";

import { Heart, Link2, Shirt } from "lucide-react";
import { FaAmazon } from "react-icons/fa6";
import { SiApplemusic, SiNote, SiRakuten, SiSpotify } from "react-icons/si";

import SocialBrandIcon from "@/components/trendre-link/SocialBrandIcon";
import { getCreatorLinkService, type CreatorLinkServiceKey, type CreatorLinkSocialServiceKey } from "@/lib/trendre-link/service-registry";

const BRAND_COLORS: Partial<Record<CreatorLinkServiceKey, string>> = {
  rakuten_room: "#BF0000",
  amazon_storefront: "#FF9900",
  apple_music: "#FA243C",
  spotify: "#1DB954",
  note: "#41C9B4",
};

export default function ServiceIcon({ serviceKey, brand = false, color, className = "h-5 w-5" }: {
  serviceKey: CreatorLinkServiceKey;
  brand?: boolean;
  color?: string | null;
  className?: string;
}) {
  const definition = getCreatorLinkService(serviceKey);
  if (definition.kind === "social") return <SocialBrandIcon platform={serviceKey as CreatorLinkSocialServiceKey} brand={brand} color={color} className={className} />;
  const props = { className, "aria-hidden": true } as const;
  const icon = serviceKey === "rakuten_room" ? <SiRakuten {...props} />
    : serviceKey === "amazon_storefront" ? <FaAmazon {...props} />
      : serviceKey === "apple_music" ? <SiApplemusic {...props} />
        : serviceKey === "spotify" ? <SiSpotify {...props} />
          : serviceKey === "note" ? <SiNote {...props} />
            : serviceKey === "wear" ? <Shirt {...props} />
              : serviceKey === "lips" ? <Heart {...props} />
                : <Link2 {...props} />;
  return <span role="img" aria-label={definition.labelEn} style={color ? { color } : brand && BRAND_COLORS[serviceKey] ? { color: BRAND_COLORS[serviceKey] } : undefined}>{icon}</span>;
}
