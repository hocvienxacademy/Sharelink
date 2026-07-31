import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "ShareLinkStudent",
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
