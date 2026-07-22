"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function CreatorProfileVisualRefresh() {
  const pathname = usePathname();
  const active = pathname === "/creator/profile" || pathname.startsWith("/creator/profile/");

  useEffect(() => {
    if (!active) return;
    document.body.classList.add("creator-profile-route");
    return () => document.body.classList.remove("creator-profile-route");
  }, [active]);

  if (!active) return null;

  return (
    <style jsx global>{`
      .creator-profile-route .trendre-safe-page {
        display: grid;
        gap: 16px;
        padding-bottom: 8px;
      }

      .creator-profile-route .trendre-safe-page > :not([hidden]) ~ :not([hidden]) {
        margin-top: 0 !important;
      }

      .creator-profile-route .trendre-safe-page > section:first-of-type {
        margin: 0;
        border-radius: 0 !important;
        background: transparent !important;
        padding: 8px 2px 18px !important;
        box-shadow: none !important;
      }

      .creator-profile-route .trendre-safe-page > section:first-of-type h1 {
        font-size: 34px !important;
        font-weight: 700 !important;
        line-height: 1.05 !important;
        letter-spacing: -0.06em !important;
      }

      .creator-profile-route .trendre-safe-page > section:first-of-type p {
        margin-top: 10px;
        font-size: 14px !important;
        line-height: 1.7 !important;
      }

      .creator-profile-route .trendre-safe-page > section:first-of-type img,
      .creator-profile-route .trendre-safe-page > section:first-of-type > div > div:last-child {
        border-radius: 50% !important;
      }

      .creator-profile-route .trendre-safe-page > section[class*="bg-white"]:not(:first-of-type) {
        border: 1px solid rgba(226, 232, 240, 0.9);
        border-radius: 20px !important;
        padding: 20px !important;
        box-shadow: none !important;
      }

      .creator-profile-route .trendre-safe-page > section[class*="bg-white"]:not(:first-of-type) h2 {
        font-size: 18px !important;
        font-weight: 700 !important;
        letter-spacing: -0.04em !important;
      }

      .creator-profile-route .trendre-safe-page > section > div[class*="rounded-[24px]"][class*="bg-white"] {
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        padding: 0 !important;
        box-shadow: none !important;
      }

      .creator-profile-route .trendre-safe-page div[class*="rounded-[22px]"][class*="bg-slate-50"] {
        border: 1px solid rgba(226, 232, 240, 0.9);
        border-radius: 16px !important;
        background: #fafbfc !important;
        box-shadow: none !important;
      }

      .creator-profile-route .trendre-safe-page input,
      .creator-profile-route .trendre-safe-page select,
      .creator-profile-route .trendre-safe-page textarea {
        border-radius: 14px !important;
        box-shadow: none !important;
      }

      .creator-profile-route .trendre-safe-page button[class*="rounded-full"],
      .creator-profile-route .trendre-safe-page label[class*="rounded-full"] {
        border-radius: 12px !important;
      }

      .creator-profile-route .trendre-safe-page > div[class*="sticky"] {
        bottom: 88px !important;
        border: 1px solid rgba(226, 232, 240, 0.95);
        border-radius: 18px !important;
        padding: 8px !important;
        box-shadow: 0 18px 48px rgba(15, 23, 42, 0.14) !important;
      }

      .creator-profile-route .trendre-safe-page > div[class*="sticky"] button {
        min-height: 50px;
        border-radius: 13px !important;
        background: #121117 !important;
        box-shadow: none !important;
      }

      @media (min-width: 768px) {
        .creator-profile-route .trendre-safe-page {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          align-items: start;
        }

        .creator-profile-route .trendre-safe-page > section:first-of-type,
        .creator-profile-route .trendre-safe-page > div[class*="sticky"],
        .creator-profile-route .trendre-safe-page > section[id="sns"],
        .creator-profile-route .trendre-safe-page > section[id="portfolio"] {
          grid-column: 1 / -1;
        }
      }
    `}</style>
  );
}
