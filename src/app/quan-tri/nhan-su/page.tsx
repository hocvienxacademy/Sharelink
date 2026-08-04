import Link from "next/link";
import { ArrowRightIcon, PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { queryUsers } from "@/composition/users";
import { requireStaffPage } from "@/modules/auth/presentation/require-admin-page";
import { toAuthenticatedActor } from "@/shared/authorization";
import { AdminPageHeader } from "@/modules/dashboard/presentation/ui/admin-page-header";
import { AdminResourceTable } from "@/modules/dashboard/presentation/ui/admin-resource-table";

export const dynamic = "force-dynamic";
export default async function UsersPage() {
  const identity = await requireStaffPage();
  const users = await queryUsers.list(toAuthenticatedActor(identity));
  return <div className="flex flex-col gap-8">
    <AdminPageHeader title="Nhân sự" description={identity.role === "ADMIN" ? "Quản trị tài khoản, vai trò, trạng thái và phiên đăng nhập nội bộ." : "Danh sách SALE báo cáo trực tiếp của bạn."}
      action={identity.role === "ADMIN" ? <Button nativeButton={false} render={<Link href="/quan-tri/nhan-su/moi" />}><PlusIcon data-icon="inline-start" />Tạo tài khoản</Button> : undefined} />
    <AdminResourceTable columns={[{ key: "name", label: "Họ tên" }, { key: "username", label: "Tên đăng nhập" }, { key: "role", label: "Vai trò" }, { key: "manager", label: "Quản lý" }, { key: "status", label: "Trạng thái" }, { key: "action", label: "" }]}
      emptyDescription="Chưa có tài khoản trong phạm vi truy cập."
      rows={users.map((item) => ({ id: item.id, name: item.fullName, username: item.username, role: <Badge variant="outline">{item.role}</Badge>, manager: item.managerName ?? "—", status: <Badge variant={item.status === "ACTIVE" ? "secondary" : "outline"}>{item.status === "ACTIVE" ? "Hoạt động" : "Vô hiệu hóa"}</Badge>, action: <Button nativeButton={false} size="sm" variant="ghost" render={<Link href={`/quan-tri/nhan-su/${item.id}`} />}>Chi tiết<ArrowRightIcon data-icon="inline-end" /></Button> }))} />
  </div>;
}
