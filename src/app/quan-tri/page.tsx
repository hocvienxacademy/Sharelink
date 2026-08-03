import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRightIcon,
  CircleCheckBigIcon,
  FileTextIcon,
  Link2Icon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ADMIN_SESSION_COOKIE, getAdminIdentityBySessionToken } from "@/modules/auth";
import { LogoutButton } from "@/modules/auth/presentation/ui/logout-button";
import { getAdminDashboardMetrics } from "@/modules/dashboard";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const identity = await getAdminIdentityBySessionToken(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (identity === null) redirect("/dang-nhap");

  const dashboardMetrics = await getAdminDashboardMetrics();

  const metrics = [
    {
      label: "Nhân sự hoạt động",
      value: dashboardMetrics.activeStaff,
      detail: "Tài khoản đang được phép truy cập",
      icon: UsersIcon,
    },
    {
      label: "Liên kết đăng ký",
      value: dashboardMetrics.registrationLinks,
      detail: "Tổng liên kết đã được tạo",
      icon: Link2Icon,
    },
    {
      label: "Tổng hồ sơ",
      value: dashboardMetrics.applications,
      detail: "Bao gồm bản nháp và đã nộp",
      icon: FileTextIcon,
    },
    {
      label: "Hồ sơ đã gửi",
      value: dashboardMetrics.submittedApplications,
      detail: "Đã rời trạng thái bản nháp",
      icon: CircleCheckBigIcon,
    },
  ] as const;

  return (
    <main className="min-h-dvh bg-surface">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <ShieldCheckIcon aria-hidden="true" />
            </span>
            <div>
              <Link href="/quan-tri" className="font-semibold tracking-tight">
                ShareLink<span className="text-brand-coral-text">Student</span>
              </Link>
              <p className="text-xs text-muted-foreground">Control Center</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{identity.fullName}</p>
              <p className="text-xs text-muted-foreground">Quản trị viên</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-8 sm:py-12">
        <section className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="max-w-3xl">
            <Badge variant="secondary">Tổng quan vận hành</Badge>
            <h1 className="mt-4 font-heading text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Chào {identity.fullName},
              <br />mọi dữ liệu cốt lõi ở đây.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Bảng điều khiển hiện hiển thị số liệu tổng hợp, không đưa thông tin định danh sinh viên ra màn hình tổng quan.
            </p>
          </div>
          <Button variant="outline" render={<Link href="/" />}>
            Xem trang công khai
            <ArrowUpRightIcon data-icon="inline-end" />
          </Button>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Số liệu tổng quan">
          {metrics.map(({ detail, icon: Icon, label, value }) => (
            <Card key={label} className="rounded-3xl">
              <CardHeader>
                <span
                  className={cn(
                    "flex size-11 items-center justify-center rounded-2xl",
                    "bg-primary text-primary-foreground",
                  )}
                >
                  <Icon aria-hidden="true" />
                </span>
                <CardDescription className="pt-4">{label}</CardDescription>
                <CardTitle className="text-4xl font-semibold tracking-[-0.04em]">
                  {value.toLocaleString("vi-VN")}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{detail}</CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
          <Card className="rounded-[2rem] bg-primary text-primary-foreground">
            <CardHeader>
              <CardDescription className="text-primary-foreground/60">TRẠNG THÁI HỆ THỐNG</CardDescription>
              <CardTitle className="text-3xl font-semibold">Sẵn sàng cho vận hành local</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              {[
                ["Cơ sở dữ liệu", "Đã kết nối"],
                ["Phiên quản trị", "Được bảo vệ"],
                ["Dữ liệu tổng quan", "Không chứa PII"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-primary-foreground/10 p-4">
                  <p className="text-xs text-primary-foreground/60">{label}</p>
                  <p className="mt-2 font-medium">{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[2rem]">
            <CardHeader>
              <CardDescription>TIẾP THEO</CardDescription>
              <CardTitle className="text-2xl font-semibold">Mở rộng nghiệp vụ</CardTitle>
            </CardHeader>
            <CardContent className="leading-6 text-muted-foreground">
              Các màn hình quản lý hồ sơ, liên kết và thanh toán sẽ được bổ sung theo quy tắc nghiệp vụ đã phê duyệt.
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
