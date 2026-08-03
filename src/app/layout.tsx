import type { ReactNode } from "react";
import "@fontsource-variable/dm-sans";
import "./globals.css";

export const metadata = {
  title: {
    default: "ShareLinkStudent",
    template: "%s | ShareLinkStudent",
  },
  description: "Hệ thống đăng ký thông tin sinh viên",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi" className="font-sans">
      <body>{children}</body>
    </html>
  );
}
