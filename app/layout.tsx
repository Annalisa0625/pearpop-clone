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