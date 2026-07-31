import type { ReactNode } from "react";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata = {
  title: "ShareLinkStudent",
  description: "Hệ thống đăng ký thông tin sinh viên",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi" className={cn("font-sans", geist.variable)}>
      <body>{children}</body>
    </html>
  );
}
