import Link from "next/link";
import {
  ArrowUpRightIcon,
  CircleCheckBigIcon,
  FileTextIcon,
  Link2Icon,
  UsersIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminPage } from "@/modules/auth/presentation/require-admin-page";
import { getAdminDashboardMetrics } from "@/modules/dashboard";
import { AdminPageHeader } from "@/modules/dashboard/presentation/ui/admin-page-header";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const identity = await requireAdminPage();
  const dashboardMetrics = await getAdminDashboardMetrics();
  const metrics = [
    { label: "Nhân sự hoạt động", value: dashboardMetrics.activeStaff, detail: "Tài khoản đang được phép truy cập", icon: UsersIcon },
    { label: "Liên kết đăng ký", value: dashboardMetrics.registrationLinks, detail: "Tổng liên kết đã được tạo", icon: Link2Icon },
    { label: "Tổng hồ sơ", value: dashboardMetrics.applications, detail: "Bao gồm bản nháp và đã nộp", icon: FileTextIcon },
    { label: "Hồ sơ đã gửi", value: dashboardMetrics.submittedApplications, detail: "Đã rời trạng thái bản nháp", icon: CircleCheckBigIcon },
  ] as const;

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        title={`Chào ${identity.fullName}`}
        description="Bảng điều khiển hiển thị số liệu tổng hợp và điều hướng tới các khu vực vận hành mới."
        action={
          <Button nativeButton={false} variant="outline" render={<Link href="/" />}>
            Xem trang công khai<ArrowUpRightIcon data-icon="inline-end" />
          </Button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Số liệu tổng quan">
        {metrics.map(({ detail, icon: Icon, label, value }) => (
          <Card key={label} className="rounded-3xl">
            <CardHeader>
              <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Icon aria-hidden="true" />
              </span>
              <CardDescription className="pt-4">{label}</CardDescription>
              <CardTitle className="text-4xl font-semibold tracking-[-0.04em]">{value.toLocaleString("vi-VN")}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{detail}</CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
        <Card className="rounded-[2rem] bg-primary text-primary-foreground">
          <CardHeader>
            <CardDescription className="text-primary-foreground/60">TRẠNG THÁI HỆ THỐNG</CardDescription>
            <CardTitle className="text-3xl font-semibold">14 màn quản trị đã được kết nối</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            {[
              ["Dữ liệu", "Read models an toàn"],
              ["Phiên quản trị", "Được bảo vệ"],
              ["Mutation", "Khóa theo rule gate"],
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
            <CardDescription>NGUYÊN TẮC</CardDescription>
            <CardTitle className="text-2xl font-semibold">Không suy diễn nghiệp vụ</CardTitle>
          </CardHeader>
          <CardContent className="leading-6 text-muted-foreground">
            Các thao tác chuyển trạng thái, thanh toán và phân quyền chỉ được bật sau khi có quy tắc được phê duyệt.
          </CardContent>
        </Card>
      </section>
      <Badge variant="secondary" className="w-fit">ADMIN read-only operations</Badge>
    </div>
  );
}
