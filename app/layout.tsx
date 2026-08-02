import type { Metadata, Viewport } from "next";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "@fontsource/be-vietnam-pro/800.css";
import "@fontsource/source-serif-4/400.css";
import "@fontsource/source-serif-4/600.css";
import "@fontsource/source-serif-4/700.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ayrien.se/heo/"),
  title: "Tìm Con Heo — Đọc tiếng Việt thật",
  description: "Ứng dụng đọc tiếng Việt cho người mới bắt đầu, với phát âm Đà Nẵng / Quảng Nam.",
  applicationName: "Tìm Con Heo",
  manifest: "https://ayrien.se/heo/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Tìm Con Heo", statusBarStyle: "black-translucent" },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    title: "Tìm Con Heo — Đọc tiếng Việt thật",
    description: "Từng cụm một, với tai hướng về Đà Nẵng.",
    images: [{ url: "https://ayrien.se/heo/og.png", width: 1730, height: 909, alt: "Tìm Con Heo — chú heo đọc sách giữa phong cảnh miền Trung" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tìm Con Heo — Đọc tiếng Việt thật",
    description: "Từng cụm một, với tai hướng về Đà Nẵng.",
    images: ["https://ayrien.se/heo/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3ecdf" },
    { media: "(prefers-color-scheme: dark)", color: "#171d1a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body style={{ "--font-be-vietnam": '"Be Vietnam Pro"', "--font-source-serif": '"Source Serif 4"' } as React.CSSProperties}>{children}</body></html>;
}
