import Link from "next/link";
import { ArrowRightIcon, PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/modules/auth/presentation/require-admin-page";
import { formatDateTime } from "@/modules/dashboard/presentation/format-admin-value";
import { AdminPageHeader } from "@/modules/dashboard/presentation/ui/admin-page-header";
import { AdminResourceTable } from "@/modules/dashboard/presentation/ui/admin-resource-table";
import { listAdminUsers } from "@/modules/users";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requireAdminPage();
  const users = await listAdminUsers();
  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        title="Nhân sự"
        description="Danh sách tài khoản nội bộ; password hash và dữ liệu phiên không bao giờ được trả về UI."
        action={
          <Button nativeButton={false} render={<Link href="/quan-tri/nhan-su/moi" />}>
            <PlusIcon data-icon="inline-start" />Tạo tài khoản
          </Button>
        }
      />
      <AdminResourceTable
        columns={[
          { key: "name", label: "Họ tên" },
          { key: "username", label: "Tên đăng nhập" },
          { key: "email", label: "Email" },
          { key: "role", label: "Vai trò" },
          { key: "manager", label: "Quản lý" },
          { key: "active", label: "Trạng thái" },
          { key: "login", label: "Đăng nhập cuối" },
          { key: "action", label: "" },
        ]}
        emptyDescription="Chưa có tài khoản nhân sự."
        rows={users.map((item) => ({
          id: item.id,
          name: item.fullName,
          username: item.username,
          email: item.email,
          role: <Badge variant="outline">{item.role}</Badge>,
          manager: item.managerName ?? "—",
          active: <Badge variant="secondary">{item.isActive ? "Hoạt động" : "Ngừng hoạt động"}</Badge>,
          login: formatDateTime(item.lastLoginAt),
          action: (
            <Button nativeButton={false} size="sm" variant="ghost" render={<Link href={`/quan-tri/nhan-su/${item.id}`} />}>
              Chi tiết<ArrowRightIcon data-icon="inline-end" />
            </Button>
          ),
        }))}
      />
    </div>
  );
}
