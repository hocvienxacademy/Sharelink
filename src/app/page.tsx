import Link from "next/link";
import {
  ArrowRightIcon,
  FileCheck2Icon,
  Link2Icon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            ShareLink<span className="text-brand-coral-text">Student</span>
          </Link>
          <Button nativeButton={false} variant="outline" render={<Link href="/dang-nhap" />}>
            Đăng nhập quản trị
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div>
          <Badge variant="secondary">Nền tảng tuyển sinh số</Badge>
          <h1 className="mt-6 max-w-4xl font-heading text-5xl font-semibold leading-[1.03] tracking-[-0.055em] sm:text-7xl lg:text-[5rem]">
            Một liên kết.
            <br />Một hành trình hồ sơ liền mạch.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            ShareLinkStudent giúp đơn vị tuyển sinh gửi đúng biểu mẫu, tiếp nhận thông tin có cấu trúc và theo dõi tiến độ trong một hệ thống thống nhất.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button nativeButton={false} size="lg" render={<Link href="/dang-nhap" />}>
              Vào khu vực quản trị
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
            <Button
              nativeButton={false}
              size="lg"
              variant="outline"
              render={<a href="#quy-trinh" />}
            >
              Xem cách hoạt động
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Card className="min-h-56 justify-between rounded-[2rem] bg-brand-coral text-white">
            <CardHeader>
              <SparklesIcon aria-hidden="true" />
              <CardDescription className="pt-5 text-white/70">TRẢI NGHIỆM SINH VIÊN</CardDescription>
              <CardTitle className="text-3xl font-semibold">Biểu mẫu rõ ràng, lưu nháp an toàn.</CardTitle>
            </CardHeader>
          </Card>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            <Card className="rounded-[2rem] bg-primary text-primary-foreground">
              <CardHeader>
                <Link2Icon aria-hidden="true" />
                <CardTitle className="pt-8 text-xl">Liên kết riêng</CardTitle>
              </CardHeader>
            </Card>
            <Card className="rounded-[2rem]">
              <CardHeader>
                <ShieldCheckIcon aria-hidden="true" />
                <CardTitle className="pt-8 text-xl">Dữ liệu bảo vệ</CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      <section id="quy-trinh" className="bg-surface px-4 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold text-foreground">QUY TRÌNH TINH GỌN</p>
          <h2 className="mt-3 max-w-3xl font-heading text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            Từ lời mời đến hồ sơ hoàn chỉnh.
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              [Link2Icon, "01", "Nhận liên kết", "Sinh viên mở liên kết đăng ký riêng do đơn vị tuyển sinh cung cấp."],
              [FileCheck2Icon, "02", "Hoàn thiện hồ sơ", "Nhập thông tin theo từng bước, lưu bản nháp và kiểm tra trước khi gửi."],
              [ShieldCheckIcon, "03", "Tiếp nhận an toàn", "Hệ thống xác thực context, giới hạn truy cập và chỉ trả dữ liệu cần thiết."],
            ].map(([Icon, number, title, description]) => {
              const StepIcon = Icon as typeof Link2Icon;
              return (
                <Card key={String(number)} className="rounded-3xl">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <span className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <StepIcon aria-hidden="true" />
                      </span>
                      <span className="text-sm text-muted-foreground">{String(number)}</span>
                    </div>
                    <CardTitle className="pt-6 text-2xl font-semibold">{String(title)}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-base leading-7 text-muted-foreground">
                    {String(description)}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="bg-primary px-4 py-10 text-primary-foreground sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <p className="font-semibold">ShareLinkStudent</p>
          <p className="text-sm text-primary-foreground/60">Hệ thống đăng ký và quản lý hồ sơ sinh viên.</p>
        </div>
      </footer>
    </main>
  );
}
