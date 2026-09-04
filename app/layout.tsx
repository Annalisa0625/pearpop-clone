// app/layout.tsx

import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: {
    default: "Trendre",
    template: "%s | Trendre",
  },
  description:
    "Trendre is a creator marketing marketplace for brands and creators.",
  applicationName: "Trendre",
  openGraph: {
    title: "Trend Mart",
    description:
      "Trend Mart is a creator marketing marketplace for brands and creators.",
    url: "https://trendre.jp",
    siteName: "Trend Mart",
    type: "website",
    locale: "ja_JP",
    images: [
      {
        url: "https://trendre.jp/brand/trendre-search-preview.jpg",
        width: 1200,
        height: 630,
        alt: "Trend Mart",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Trend Mart",
    description:
      "Trend Mart is a creator marketing marketplace for brands and creators.",
    images: ["https://trendre.jp/brand/trendre-search-preview.jpg"],
  },
  appleWebApp: {
    capable: true,
    title: "Trendre",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  themeColor: "#ffffff",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    viewportFit: "cover",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
