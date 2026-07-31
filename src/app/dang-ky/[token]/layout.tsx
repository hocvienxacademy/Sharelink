import type { Metadata } from "next";
import type { ReactNode } from "react";

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
    <main className="min-h-dvh bg-muted/30 px-3 py-6 sm:px-5 sm:py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">
            ShareLinkStudent
          </p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Đăng ký thông tin sinh viên
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            Lưu bản nháp để tiếp tục sau, kiểm tra kỹ thông tin rồi mới nộp hồ
            sơ.
          </p>
        </header>
        {children}
      </div>
    </main>
  );
}
