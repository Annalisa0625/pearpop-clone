"use client";

import { useEffect, useRef, useState } from "react";
import TrendreLinkCanvas, { TRENDRE_LINK_LOGICAL_CANVAS_HEIGHT, TRENDRE_LINK_LOGICAL_CANVAS_WIDTH } from "@/components/trendre-link/TrendreLinkCanvas";
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
  | "displayNameColor"
  | "bio"
  | "avatarUrl"
  | "coverUrl"
  | "themeKey"
  | "accentColor"
  | "buttonStyle"
  | "fontStyle"
  | "isAcceptingInquiries"
  | "layoutOrder"
>;

type PublicLinkItem = Pick<
  CreatorLinkItem,
  "id" | "sortOrder" | "itemType" | "platform" | "title" | "description" | "url" | "imageUrl" | "metadata"
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

function PublicLogicalCanvas({ data, locale }: { data: TrendreLinkPublicData; locale: "ja" | "en" }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [geometry, setGeometry] = useState({ scale: 1, height: TRENDRE_LINK_LOGICAL_CANVAS_HEIGHT });

  useEffect(() => {
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    if (!frame || !canvas) return;
    const update = () => {
      const scale = Math.min(frame.clientWidth / TRENDRE_LINK_LOGICAL_CANVAS_WIDTH, 1);
      const logicalHeight = Math.max(TRENDRE_LINK_LOGICAL_CANVAS_HEIGHT, canvas.scrollHeight);
      setGeometry({ scale, height: logicalHeight * scale });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  return <div ref={frameRef} className="relative mx-auto w-full max-w-[480px] overflow-hidden" style={{ height: geometry.height }}><div ref={canvasRef} className="absolute left-1/2 top-0 w-[480px] origin-top" style={{ transform: `translateX(-50%) scale(${geometry.scale})` }}><TrendreLinkCanvas data={data} mode="public" locale={locale} /></div></div>;
}

export default function TrendreLinkPublicView({ data }: { data: TrendreLinkPublicData }) {
  const { locale } = useAppLocale();
  return (
    <main className="min-h-[100dvh] overflow-x-hidden">
      <div
        className="box-border min-h-[100dvh] overflow-x-hidden"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <PublicLogicalCanvas data={data} locale={locale === "en" ? "en" : "ja"} />
      </div>
    </main>
  );
}
