import { requireAdminPage } from "@/modules/auth/presentation/require-admin-page";
import { formatDateTime } from "@/modules/dashboard/presentation/format-admin-value";
import { AdminPageHeader } from "@/modules/dashboard/presentation/ui/admin-page-header";
import { AdminResourceTable } from "@/modules/dashboard/presentation/ui/admin-resource-table";
import { BusinessRuleGate } from "@/modules/dashboard/presentation/ui/business-rule-gate";
import { listAdminSystemSettings } from "@/modules/system-settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireAdminPage();
  const settings = await listAdminSystemSettings();
  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader title="Cài đặt hệ thống" description="Chỉ hiển thị metadata của setting; giá trị JSON chưa được đưa ra UI để tránh lộ cấu hình nhạy cảm." />
      <BusinessRuleGate>
        Chỉnh sửa chỉ được bật sau khi từng setting key có schema validation và phân loại secret/public rõ ràng.
      </BusinessRuleGate>
      <AdminResourceTable
        columns={[
          { key: "key", label: "Khóa" }, { key: "description", label: "Mô tả" },
          { key: "updater", label: "Cập nhật bởi" }, { key: "updated", label: "Cập nhật lúc" },
        ]}
        emptyDescription="Chưa có cài đặt hệ thống."
        rows={settings.map((item) => ({
          id: item.key, key: item.key, description: item.description ?? "—",
          updater: item.updaterName, updated: formatDateTime(item.updatedAt),
        }))}
      />
    </div>
  );
}
