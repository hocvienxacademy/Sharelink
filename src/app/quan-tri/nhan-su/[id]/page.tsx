import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { requireAdminPage } from "@/modules/auth/presentation/require-admin-page";
import { formatDateTime } from "@/modules/dashboard/presentation/format-admin-value";
import { AdminDetailGrid } from "@/modules/dashboard/presentation/ui/admin-detail-grid";
import { AdminPageHeader } from "@/modules/dashboard/presentation/ui/admin-page-header";
import { BusinessRuleGate } from "@/modules/dashboard/presentation/ui/business-rule-gate";
import { getAdminUserDetail } from "@/modules/users";

export const dynamic = "force-dynamic";

export default async function UserDetailPage({ params }: { readonly params: Promise<{ readonly id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  if (id === "moi") {
    return (
      <div className="flex flex-col gap-8">
        <AdminPageHeader parent={{ href: "/quan-tri/nhan-su", label: "Nhân sự" }} title="Tạo tài khoản" description="Chuẩn bị tài khoản nội bộ mới." />
        <BusinessRuleGate>
          Cần phê duyệt ma trận ai được tạo từng vai trò, quy tắc gán quản lý và quy trình cấp mật khẩu ban đầu.
        </BusinessRuleGate>
      </div>
    );
  }
  const item = await getAdminUserDetail(id);
  if (item === null) notFound();
  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader parent={{ href: "/quan-tri/nhan-su", label: "Nhân sự" }} title={item.fullName} description="Chi tiết tài khoản và trạng thái bảo mật." />
      <AdminDetailGrid
        title="Thông tin tài khoản"
        items={[
          { label: "Email", value: item.email },
          { label: "Điện thoại", value: item.phone },
          { label: "Vai trò", value: <Badge variant="outline">{item.role}</Badge> },
          { label: "Quản lý", value: item.managerName },
          { label: "Hoạt động", value: item.isActive ? "Có" : "Không" },
          { label: "Đăng nhập sai", value: item.failedLoginAttempts },
          { label: "Khóa tới", value: formatDateTime(item.lockedUntil) },
          { label: "Đăng nhập cuối", value: formatDateTime(item.lastLoginAt) },
          { label: "Đổi mật khẩu", value: formatDateTime(item.passwordChangedAt) },
          { label: "Ngày tạo", value: formatDateTime(item.createdAt) },
        ]}
      />
      <BusinessRuleGate>
        Đổi vai trò, vô hiệu hóa, mở khóa, đặt lại mật khẩu và thu hồi phiên chờ ma trận quyền được duyệt.
      </BusinessRuleGate>
    </div>
  );
}
