import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { queryUsers } from "@/composition/users";
import { requireAdminPage, requireStaffPage } from "@/modules/auth/presentation/require-admin-page";
import { toAuthenticatedActor } from "@/shared/authorization";
import { formatDateTime } from "@/modules/dashboard/presentation/format-admin-value";
import { AdminDetailGrid } from "@/modules/dashboard/presentation/ui/admin-detail-grid";
import { AdminPageHeader } from "@/modules/dashboard/presentation/ui/admin-page-header";
import { CreateUserForm } from "@/modules/users/presentation/ui/create-user-form";
import { UserManagementPanel } from "@/modules/users/presentation/ui/user-management-panel";

export const dynamic = "force-dynamic";
export default async function UserDetailPage({ params }: { readonly params: Promise<{ readonly id: string }> }) {
  const { id } = await params;
  if (id === "moi") {
    const admin = await requireAdminPage();
    const managers = await queryUsers.activeManagerOptions(toAuthenticatedActor(admin));
    return <div className="flex flex-col gap-8"><AdminPageHeader parent={{ href: "/quan-tri/nhan-su", label: "Nhân sự" }} title="Tạo tài khoản" description="Tạo tài khoản ACTIVE và phân công quản lý cho SALE nếu cần." /><CreateUserForm managers={managers} /></div>;
  }
  const identity = await requireStaffPage(); const actor = toAuthenticatedActor(identity);
  const [item, managers, history] = await Promise.all([
    queryUsers.detail(actor, id),
    identity.role === "ADMIN" ? queryUsers.activeManagerOptions(actor) : Promise.resolve([]),
    queryUsers.history(actor, id),
  ]);
  if (item === null || history === null) notFound();
  return <div className="flex flex-col gap-8">
    <AdminPageHeader parent={{ href: "/quan-tri/nhan-su", label: "Nhân sự" }} title={item.fullName} description={identity.role === "ADMIN" ? "Chi tiết tài khoản và trạng thái bảo mật." : "Thông tin SALE báo cáo trực tiếp; chế độ chỉ đọc."} />
    <AdminDetailGrid title="Thông tin tài khoản" items={[
      { label: "Tên đăng nhập", value: item.username },
      ...(identity.role === "ADMIN" ? [{ label: "Email", value: item.email }, { label: "Điện thoại", value: item.phone }] : []),
      { label: "Vai trò", value: <Badge variant="outline">{item.role}</Badge> }, { label: "Quản lý", value: item.managerName },
      { label: "Trạng thái", value: item.status === "ACTIVE" ? "Hoạt động" : "Vô hiệu hóa" },
      ...(identity.role === "ADMIN" ? [{ label: "Đăng nhập sai", value: item.failedLoginAttempts }, { label: "Khóa bảo mật tới", value: formatDateTime(item.lockedUntil) }, { label: "Đăng nhập cuối", value: formatDateTime(item.lastLoginAt) }, { label: "Đổi mật khẩu", value: formatDateTime(item.passwordChangedAt) }, { label: "Ngày tạo", value: formatDateTime(item.createdAt) }] : []),
    ]} />
    {identity.role === "ADMIN" ? <UserManagementPanel user={item} managers={managers} /> : null}
    <AdminDetailGrid title="Lịch sử quản trị" items={history.length === 0 ? [{ label: "Lịch sử", value: "Chưa có sự kiện." }] : history.slice(0, 20).map((event) => ({ label: formatDateTime(event.occurredAt), value: `${event.action} · ${event.actorName ?? "Hệ thống"}` }))} />
  </div>;
}
