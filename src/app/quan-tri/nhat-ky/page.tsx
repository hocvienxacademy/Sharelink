import { listAdminAuditLogs } from "@/modules/audit-logs";
import { requireAdminPage } from "@/modules/auth/presentation/require-admin-page";
import { formatDateTime } from "@/modules/dashboard/presentation/format-admin-value";
import { AdminPageHeader } from "@/modules/dashboard/presentation/ui/admin-page-header";
import { AdminResourceTable } from "@/modules/dashboard/presentation/ui/admin-resource-table";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage() {
  await requireAdminPage();
  const logs = await listAdminAuditLogs();
  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader title="Nhật ký hoạt động" description="Nhật ký chỉ đọc; old/new JSON, địa chỉ IP, user-agent và metadata không được trả về bảng để hạn chế lộ PII." />
      <AdminResourceTable
        columns={[
          { key: "action", label: "Hành động" }, { key: "actor", label: "Người thực hiện" },
          { key: "entity", label: "Đối tượng" }, { key: "entityId", label: "Mã tham chiếu" },
          { key: "time", label: "Thời gian" },
        ]}
        emptyDescription="Chưa có nhật ký hoạt động."
        rows={logs.map((item) => ({
          id: item.id, action: item.action, actor: item.actorName, entity: item.entityType,
          entityId: item.entityId?.slice(0, 8) ?? "—", time: formatDateTime(item.createdAt),
        }))}
      />
    </div>
  );
}
