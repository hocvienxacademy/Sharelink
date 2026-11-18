import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Đại học Trà Vinh",
    template: "%s | Đại học Trà Vinh",
  },
  description: "Hệ thống đăng ký thông tin sinh viên",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi" className="font-sans">
      {/* Browser extensions (e.g. ColorZilla's cz-shortcut-listen) add
          attributes to <body> before hydration. This only ignores attribute
          differences on <body> itself, not on its children. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
