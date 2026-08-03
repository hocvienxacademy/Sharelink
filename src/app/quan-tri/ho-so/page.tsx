import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listAdminApplications } from "@/modules/applications";
import { requireAdminPage } from "@/modules/auth/presentation/require-admin-page";
import { formatDateTime } from "@/modules/dashboard/presentation/format-admin-value";
import { AdminPageHeader } from "@/modules/dashboard/presentation/ui/admin-page-header";
import { AdminResourceTable } from "@/modules/dashboard/presentation/ui/admin-resource-table";
import { AdminStatusBadge } from "@/modules/dashboard/presentation/ui/admin-status-badge";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  await requireAdminPage();
  const applications = await listAdminApplications();
  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader title="Hồ sơ sinh viên" description="Danh sách 100 hồ sơ mới nhất, chỉ khả dụng trong phiên ADMIN đã xác thực." />
      <AdminResourceTable
        columns={[
          { key: "code", label: "Mã hồ sơ" },
          { key: "student", label: "Sinh viên" },
          { key: "status", label: "Trạng thái" },
          { key: "sale", label: "Phụ trách" },
          { key: "major", label: "Ngành" },
          { key: "submitted", label: "Ngày nộp" },
          { key: "action", label: "" },
        ]}
        emptyDescription="Chưa có hồ sơ sinh viên trong cơ sở dữ liệu."
        rows={applications.map((item) => ({
          id: item.id,
          code: item.applicationCode ?? item.id.slice(0, 8),
          student: item.fullName ?? "Chưa nhập họ tên",
          status: <AdminStatusBadge status={item.status} />,
          sale: item.saleName,
          major: item.major,
          submitted: formatDateTime(item.submittedAt),
          action: (
            <Button nativeButton={false} size="sm" variant="ghost" render={<Link href={`/quan-tri/ho-so/${item.id}`} />}>
              Xem<ArrowRightIcon data-icon="inline-end" />
            </Button>
          ),
        }))}
      />
    </div>
  );
}
