import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ShieldCheckIcon } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export const metadata: Metadata = {
  title: "Đăng ký thông tin sinh viên",
  description: "Biểu mẫu đăng ký thông tin sinh viên",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function RegistrationLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-surface">
      <header className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <BrandLogo imageClassName="size-11" textClassName="hidden sm:inline" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
            <ShieldCheckIcon aria-hidden="true" />
            Kết nối bảo mật
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-7 px-4 py-8 sm:px-6 sm:py-12">
        <header className="flex flex-col gap-4">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-foreground">HỒ SƠ TUYỂN SINH</p>
            <h1 className="mt-3 font-heading text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Đăng ký thông tin sinh viên
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
              Hoàn thành từng bước, lưu bản nháp khi cần và kiểm tra kỹ thông tin trước khi nộp hồ sơ.
            </p>
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}
